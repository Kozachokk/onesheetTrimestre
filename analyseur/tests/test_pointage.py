"""Tests du pointage : score, confiance, filtres, profils et cohérence avec Analyse/analyse_consolidateurs.py."""
import pytest

import donnees
import pointage
import rapport
from ratios import charger_definitions, seuils_par_defaut

DEFINITIONS, CATEGORIES = charger_definitions()
CONFIG = donnees.charger_config()
SEUILS = seuils_par_defaut(DEFINITIONS, CONFIG["taux_obligataire_10ans"])
PROFILS, MENTION = pointage.charger_profils()
PROFIL = {p["id"]: p for p in PROFILS}
BASE = donnees.charger_base(CONFIG["taux_change"])


def classement(id_profil, poids=None, filtres=None):
    p = PROFIL[id_profil]
    return pointage.classer(BASE, DEFINITIONS, poids or pointage.poids_du_profil(p, DEFINITIONS), SEUILS,
                            p["filtres"] if filtres is None else filtres, CONFIG["filtres"])


def zero():
    return {d["id"]: 0.0 for d in DEFINITIONS}


def test_score_est_la_moyenne_ponderee():
    e = {"T": {"ticker": "T", "nom": "T", "champs": {"roic": donnees.champ(0.13, "t"), "ev_ebit": donnees.champ(8, "t")}}}
    poids = dict(zero(), roic=1.0, ev_ebit=3.0)
    r = pointage.classer(e, DEFINITIONS, poids, SEUILS, [], CONFIG["filtres"])[0]
    assert r["notes"]["roic"] == pytest.approx(50) and r["notes"]["ev_ebit"] == 100
    assert r["score"] == pytest.approx((1 * 50 + 3 * 100) / 4)
    assert r["confiance"] == 1.0
    assert sum(r["contributions"].values()) == pytest.approx(r["score"])


def test_donnee_manquante_redistribue_le_poids():
    e = {"T": {"ticker": "T", "nom": "T", "champs": {"roic": donnees.champ(0.13, "t")}}}
    poids = dict(zero(), roic=1.0, ev_ebit=3.0)
    r = pointage.classer(e, DEFINITIONS, poids, SEUILS, [], CONFIG["filtres"])[0]
    assert r["score"] == pytest.approx(50)        # seul le ROIC compte
    assert r["confiance"] == pytest.approx(0.25)  # 1 sur 4 du poids est couvert


def test_tous_les_poids_a_zero_ne_plante_pas():
    r = pointage.classer(BASE, DEFINITIONS, zero(), SEUILS, [], CONFIG["filtres"])
    assert all(x["score"] is None for x in r)
    assert pointage.gagnant(r) is None
    assert rapport.texte_justification(rapport.elements_justification(r, BASE, DEFINITIONS, zero(), PROFIL["buffett"], [], CONFIG))


@pytest.mark.parametrize("id_profil", ["leonard", "buffett"])
def test_coherent_avec_analyse_consolidateurs(id_profil):
    """Comme dans Analyse/analyse_consolidateurs.py : Topicus et Constellation en tête, Aecon et TFI éliminées."""
    res = classement(id_profil)
    assert [r["ticker"] for r in res[:2]] == ["TOI", "CSU"]
    assert {r["ticker"] for r in res if r["elimine"]} == {"ARE", "TFII"}
    assert res[2]["ticker"] == "WSP" and not res[2]["elimine"]


def test_raisons_d_elimination():
    res = {r["ticker"]: r for r in classement("buffett", filtres=["perte_nette", "altman", "dette_fcf", "dilution"])}
    assert any("Perte nette" in x for x in res["ARE"]["raisons"])
    assert any("Dilution" in x for x in res["ARE"]["raisons"])
    assert any("Dette" in x for x in res["TFII"]["raisons"])
    assert not res["TOI"]["elimine"]
    assert not any(r["elimine"] for r in classement("buffett", filtres=[]))


def test_changer_un_curseur_change_le_classement():
    poids = pointage.poids_du_profil(PROFIL["leonard"], DEFINITIONS)
    avant = [r["ticker"] for r in classement("leonard", poids)]
    poids.update({i: 0.0 for i in poids})       # on coupe tout...
    poids["croissance_bpa"] = 10.0              # ...et on ne garde que la croissance du BPA, où WSP domine
    apres = [r["ticker"] for r in classement("leonard", poids)]
    assert avant[0] == "TOI" and apres[0] == "WSP" and avant != apres


def test_profil_personnalise_tous_les_poids_a_cinq():
    assert set(pointage.poids_du_profil(PROFIL["personnalise"], DEFINITIONS).values()) == {5.0}
    assert len(PROFILS) == 9


def test_profils_ne_citent_que_des_ratios_et_filtres_connus():
    ids = {d["id"] for d in DEFINITIONS}
    for p in PROFILS:
        assert set(p.get("poids", {})) <= ids, p["id"]
        assert set(p.get("filtres", [])) <= set(CONFIG["filtres"]), p["id"]


def test_simulation_solidite():
    poids = pointage.poids_du_profil(PROFIL["leonard"], DEFINITIONS)
    sim = pointage.simulation_solidite(classement("leonard"), poids, n=500)
    assert sim["gagnant"] == "TOI"
    assert 0.5 < sim["pct_gagnant"] <= 1.0
    assert sum(sim["frequences"].values()) == pytest.approx(1.0)
    assert set(sim["frequences"]) == {"TOI", "CSU", "WSP"}  # les titres éliminés ne participent pas


def test_expliquer_ecart_somme_des_contributions():
    res = classement("leonard")
    ecarts = pointage.expliquer_ecart(res[0], res[1], DEFINITIONS, n=30)
    assert sum(x["ecart"] for x in ecarts) == pytest.approx(res[0]["score"] - res[1]["score"])
    assert len(pointage.expliquer_ecart(res[0], res[1], DEFINITIONS)) <= 5


def test_justification_csv_et_pdf():
    poids = pointage.poids_du_profil(PROFIL["leonard"], DEFINITIONS)
    res = classement("leonard")
    el = rapport.elements_justification(res, BASE, DEFINITIONS, poids, PROFIL["leonard"], PROFIL["leonard"]["filtres"], CONFIG)
    texte = rapport.texte_justification(el, MENTION)
    assert "Topicus" in texte and "Aecon" in texte and "Dilution" in texte and rapport.PIED_DE_PAGE in texte
    assert len(rapport.csv_classement(res, CATEGORIES).decode("utf-8-sig").strip().splitlines()) == 6
    pdf = rapport.pdf_one_sheet(el, CATEGORIES, MENTION)
    assert pdf[:4] == b"%PDF" and b"/Count 1" in pdf   # une seule page
    assert rapport.pdf_one_sheet(None, CATEGORIES)[:4] == b"%PDF"

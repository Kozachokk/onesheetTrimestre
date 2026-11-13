"""Tests des calculs de ratios."""
import pytest

import donnees
from ratios import FORMULES, calculer_ratios, charger_definitions, formater, note, seuils_par_defaut

DEFINITIONS, CATEGORIES = charger_definitions()
CONFIG = donnees.charger_config()


def entreprise(**champs):
    """Petite entreprise fictive pour les tests."""
    return {"ticker": "TEST", "nom": "Test", "champs": {k: donnees.champ(v, "test", "2026-01-01") for k, v in champs.items()}}


def test_note_lineaire_plus_haut_mieux():
    assert note(0.05, 0.05, 0.20) == 0
    assert note(0.20, 0.05, 0.20) == 100
    assert note(0.125, 0.05, 0.20) == pytest.approx(50)
    assert note(0.50, 0.05, 0.20) == 100   # plafonnée
    assert note(-0.10, 0.05, 0.20) == 0    # plancher


def test_note_plus_bas_mieux():
    assert note(35, 35, 12) == 0
    assert note(12, 35, 12) == 100
    assert note(23.5, 35, 12) == pytest.approx(50)


def test_note_donnee_manquante():
    assert note(None, 0, 1) is None


def test_trente_ratios_avec_formule():
    assert len(DEFINITIONS) == 31
    assert {d["id"] for d in DEFINITIONS} == set(FORMULES)
    assert all(d["categorie"] in CATEGORIES for d in DEFINITIONS)


def test_entreprise_vide_donne_nd_sans_planter():
    valeurs = calculer_ratios(entreprise(), DEFINITIONS)
    assert all(v["valeur"] is None for v in valeurs.values())
    assert formater(None, "pct") == "n.d."


def test_marges_et_valorisation():
    e = entreprise(revenus_ttm_cad_m=1000, resultat_exploitation_ttm_cad_m=200, benefice_net_ttm_cad_m=100, fcf_ttm_cad_m=150,
                   capitalisation_cad_m=2000, capitaux_propres_cad_m=500, dette_totale_cad_m=300, valeur_entreprise_cad_m=2200)
    v = {k: x["valeur"] for k, x in calculer_ratios(e, DEFINITIONS).items()}
    assert v["marge_exploitation"] == pytest.approx(0.20)
    assert v["marge_nette"] == pytest.approx(0.10)
    assert v["marge_fcf"] == pytest.approx(0.15)
    assert v["roe"] == pytest.approx(0.20)
    assert v["pb"] == pytest.approx(4.0)
    assert v["dette_fcf"] == pytest.approx(2.0)
    assert v["dette_capitaux_propres"] == pytest.approx(0.6)
    assert v["ev_ebit"] == pytest.approx(11.0)
    assert v["conversion_fcf"] == pytest.approx(1.5)
    assert v["rendement_fcf"] == pytest.approx(0.075)


def test_croissance_bpa_et_peg():
    v = calculer_ratios(entreprise(bpa_recent=1.21, bpa_ancien=1.0, bpa_nb_annees=2, pe=20), DEFINITIONS)
    assert v["croissance_bpa"]["valeur"] == pytest.approx(0.10)
    assert v["peg"]["valeur"] == pytest.approx(2.0)
    # BPA en baisse : la croissance se calcule, mais le PEG n'a pas de sens
    v = calculer_ratios(entreprise(bpa_recent=0.5, bpa_ancien=1.0, bpa_nb_annees=1, pe=20), DEFINITIONS)
    assert v["croissance_bpa"]["valeur"] == pytest.approx(-0.5)
    assert v["peg"]["valeur"] is None


def test_perte_nette_rend_pe_et_conversion_nd():
    v = calculer_ratios(entreprise(benefice_net_ttm_cad_m=-50, fcf_ttm_cad_m=100, rendement_dividende=0.02), DEFINITIONS)
    assert v["pe"]["valeur"] is None
    assert v["conversion_fcf"]["valeur"] is None
    assert v["ratio_distribution"]["valeur"] is None


def test_croissance_revenus_moyenne_geometrique():
    v = calculer_ratios(entreprise(croissance_revenus_2025=0.10, croissance_revenus_2024=0.10, croissance_revenus_2023=0.10), DEFINITIONS)
    assert v["croissance_revenus"]["valeur"] == pytest.approx(0.10)


def test_seuil_rendement_fcf_suit_le_taux_obligataire():
    assert seuils_par_defaut(DEFINITIONS, 0.037)["rendement_fcf"] == (0.037, 0.08)
    assert seuils_par_defaut(DEFINITIONS, 0.05)["rendement_fcf"][0] == 0.05


def test_source_et_date_conservees():
    v = calculer_ratios(entreprise(roic=0.15), DEFINITIONS)
    assert v["roic"]["source"] == "test" and v["roic"]["date"] == "2026-01-01"


def test_donnees_reelles_des_cinq_entreprises():
    base = donnees.charger_base(CONFIG["taux_change"])
    assert set(base) == {"ARE", "CSU", "TFII", "TOI", "WSP"}
    csu = {k: x["valeur"] for k, x in calculer_ratios(base["CSU"], DEFINITIONS).items()}
    assert csu["roic"] == pytest.approx(0.1862)
    assert csu["rendement_fcf"] == pytest.approx(2390 / 74100)       # FCF prudent pour l'actionnaire
    assert csu["goodwill_actifs"] == pytest.approx(2125 / 17944)
    assert csu["croissance_bpa"] == pytest.approx((24.15 / 26.67) ** 0.5 - 1)  # BPA 2023 -> 2025 du JSON
    assert base["CSU"]["evenements"], "les événements du JSON doivent être chargés"
    are = calculer_ratios(base["ARE"], DEFINITIONS)
    assert are["pe"]["valeur"] is None
    assert are["marge_brute"]["valeur"] == pytest.approx(394085 / 5434678)


def test_conversion_en_cad_selon_le_taux():
    brut = {"document": {"profile": {"identity": {"name": "X", "reportingCurrency": "USD", "listings": [{"symbol": "X", "exchange": "TSX"}]}},
                         "events": [], "data": [{"periodType": "Annual", "reportDate": "2025-12-31", "fiscalYear": 2025,
                                                 "metricValues": {"revenue": {"value": 100e6, "sources": []}}}]}}
    e = donnees.lire_json_onesheet(brut, {"CAD": 1.0, "USD": 1.5})
    assert e["champs"]["revenus_ttm_cad_m"]["valeur"] == pytest.approx(150)
    assert e["symbole_yahoo"] == "X.TO"


def test_indicateurs_prix():
    cours = [100.0] * 200 + [110.0]
    ind = donnees.indicateurs_prix(cours)
    assert ind["rendement_6mois"] == pytest.approx(0.10)
    assert ind["ecart_mm200"] == pytest.approx(110 / ((199 * 100 + 110) / 200) - 1)
    assert ind["volatilite"] > 0
    assert donnees.indicateurs_prix([]) == {}


def test_televersement_illisible_ne_plante_pas():
    entreprises, erreur = donnees.lire_televersement("x.json", b"pas du json", {"CAD": 1.0})
    assert entreprises == {} and erreur

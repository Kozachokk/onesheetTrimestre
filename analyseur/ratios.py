"""
ratios.py : calcul des ratios financiers et de leur note de 0 à 100.

Les définitions (nom, catégorie, seuils, explication) sont dans ratios.json.
Les formules sont ici, dans le dictionnaire FORMULES (même identifiant que dans ratios.json).
Une donnée manquante donne None, affiché « n.d. » : rien ne plante.
"""
from __future__ import annotations

import json
from pathlib import Path

FICHIER_RATIOS = Path(__file__).parent / "ratios.json"


def charger_definitions() -> tuple[list, list]:
    """Renvoie (liste des ratios, liste des catégories) lues dans ratios.json."""
    contenu = json.loads(FICHIER_RATIOS.read_text(encoding="utf-8"))
    return contenu["ratios"], contenu["categories"]


def seuils_par_defaut(definitions: list, taux_10ans: float) -> dict:
    """{id: (mauvais, bon)} ; la valeur spéciale "taux_10ans" est remplacée par le taux obligataire."""
    resoudre = lambda v: taux_10ans if v == "taux_10ans" else float(v)
    return {d["id"]: (resoudre(d["mauvais"]), resoudre(d["bon"])) for d in definitions}


# --------------------------------------------------------------------------- note

def note(valeur, mauvais, bon):
    """Note linéaire de 0 (seuil mauvais) à 100 (seuil bon). Fonctionne dans les deux sens. None si la valeur manque."""
    if valeur is None or mauvais == bon:
        return None
    t = (valeur - mauvais) / (bon - mauvais)
    return max(0.0, min(1.0, t)) * 100


# --------------------------------------------------------------------------- formules

def _div(a, b):
    """Division sûre : None si une donnée manque ou si le dénominateur est nul."""
    if a is None or b is None or b == 0:
        return None
    return a / b


def _croissance_revenus(g):
    """Moyenne géométrique des croissances annuelles disponibles (3 ans au maximum)."""
    annuelles = [g(k) for k in ("croissance_revenus_2025", "croissance_revenus_2024", "croissance_revenus_2023")]
    annuelles = [c for c in annuelles if c is not None and c > -1]
    if not annuelles:
        return g("croissance_revenus_3ans")
    produit = 1.0
    for c in annuelles:
        produit *= 1 + c
    return produit ** (1 / len(annuelles)) - 1


def _croissance_bpa(g):
    """Croissance annuelle composée du BPA. Impossible à calculer si un des deux BPA est négatif ou nul."""
    recent, ancien, annees = g("bpa_recent"), g("bpa_ancien"), g("bpa_nb_annees")
    if recent is not None and ancien is not None and annees and recent > 0 and ancien > 0:
        return (recent / ancien) ** (1 / annees) - 1
    return g("croissance_bpa")


def _premier(*valeurs):
    """Première valeur disponible."""
    for v in valeurs:
        if v is not None:
            return v
    return None


def _rendement_fcf(g):
    """FCF prudent revenant aux actionnaires ÷ capitalisation ; sinon le rendement FCF de la source de marché."""
    return _premier(_div(g("fcf_actionnaires_cad_m"), g("capitalisation_cad_m")), g("rendement_fcf"),
                    _div(g("fcf_ttm_cad_m"), g("capitalisation_cad_m")))


def _peg(g):
    croissance, pe = _croissance_bpa(g), g("pe")
    if pe is None or pe <= 0 or croissance is None or croissance <= 0:
        return None
    return pe / (croissance * 100)


def _ratio_distribution(g):
    """Dividende ÷ bénéfice = rendement du dividende × P/E. n.d. sans dividende ou sans bénéfice."""
    rendement, pe = g("rendement_dividende"), g("pe")
    if not rendement or pe is None or pe <= 0:
        return None
    return rendement * pe


def _conversion_fcf(g):
    benefice = g("benefice_net_ttm_cad_m")
    return _div(g("fcf_ttm_cad_m"), benefice) if benefice and benefice > 0 else None


def _dette_fcf(g):
    if g("dette_fcf") is not None:
        return g("dette_fcf")
    fcf = g("fcf_ttm_cad_m")
    return _div(g("dette_totale_cad_m"), fcf) if fcf and fcf > 0 else None


def _somme(a, b):
    return a + b if (a is not None and b is not None) else None


# Chaque formule reçoit g, une fonction qui renvoie la valeur d'un champ (ou None).
FORMULES = {
    "roe": lambda g: _premier(g("roe"), _div(g("benefice_net_ttm_cad_m"), g("capitaux_propres_cad_m"))),
    "roic": lambda g: g("roic"),
    "marge_brute": lambda g: _premier(_div(g("benefice_brut_cad_m"), g("revenus_annuels_cad_m")), g("marge_brute")),
    "marge_exploitation": lambda g: _div(g("resultat_exploitation_ttm_cad_m"), g("revenus_ttm_cad_m")),
    "marge_nette": lambda g: _div(g("benefice_net_ttm_cad_m"), g("revenus_ttm_cad_m")),
    "marge_fcf": lambda g: _premier(g("marge_fcf"), _div(g("fcf_ttm_cad_m"), g("revenus_ttm_cad_m"))),
    "croissance_revenus": _croissance_revenus,
    "croissance_bpa": _croissance_bpa,
    "croissance_organique": lambda g: g("croissance_organique_recente"),
    "dette_capitaux_propres": lambda g: _premier(g("dette_capitaux_propres"), _div(g("dette_totale_cad_m"), g("capitaux_propres_cad_m"))),
    "dette_fcf": _dette_fcf,
    "couverture_interets": lambda g: g("couverture_interets"),
    "ratio_liquidite": lambda g: g("ratio_liquidite"),
    "altman_z": lambda g: g("altman_z"),
    "piotroski_f": lambda g: g("piotroski_f"),
    "pe": lambda g: g("pe") if (g("pe") or 0) > 0 else None,
    "pe_prevu": lambda g: g("pe_prevu") if (g("pe_prevu") or 0) > 0 else None,
    "pb": lambda g: _div(g("capitalisation_cad_m"), g("capitaux_propres_cad_m")) if (g("capitaux_propres_cad_m") or 0) > 0 else None,
    "ev_ebit": lambda g: _premier(g("ev_ebit"), _div(g("valeur_entreprise_cad_m"), g("resultat_exploitation_ttm_cad_m"))
                                  if (g("resultat_exploitation_ttm_cad_m") or 0) > 0 else None),
    "rendement_fcf": _rendement_fcf,
    "peg": _peg,
    "rendement_dividende": lambda g: g("rendement_dividende"),
    "ratio_distribution": _ratio_distribution,
    "variation_actions": lambda g: g("variation_actions_1an"),
    "roic_plus_og": lambda g: _somme(g("roic"), g("croissance_organique_recente")),
    "goodwill_actifs": lambda g: _div(g("goodwill_m"), g("actifs_totaux_m")),
    "conversion_fcf": _conversion_fcf,
    "rendement_6mois": lambda g: g("rendement_6mois"),
    "ecart_mm200": lambda g: g("ecart_mm200"),
    "volatilite": lambda g: g("volatilite"),
    "beta": lambda g: g("beta"),
}


def calculer_ratios(entreprise: dict, definitions: list) -> dict:
    """Calcule tous les ratios d'une entreprise. Renvoie {id: {"valeur", "source", "date"}}."""
    champs = entreprise.get("champs", {})
    g = lambda cle: (champs.get(cle) or {}).get("valeur")
    resultat = {}
    for d in definitions:
        try:
            valeur = FORMULES[d["id"]](g)
        except Exception:  # une formule ne doit jamais faire planter l'application
            valeur = None
        utilises = [champs[c] for c in d.get("champs", []) if c in champs]
        sources = sorted({c["source"] for c in utilises if c.get("source")})
        dates = sorted({c["date"] for c in utilises if c.get("date")})
        resultat[d["id"]] = {"valeur": valeur,
                             "source": " ; ".join(sources) if valeur is not None else "",
                             "date": dates[-1] if (dates and valeur is not None) else ""}
    return resultat


# --------------------------------------------------------------------------- affichage

def _fr(x: float, decimales: int) -> str:
    """Nombre au format français : espace pour les milliers, virgule pour les décimales."""
    return f"{x:,.{decimales}f}".replace(",", " ").replace(".", ",")


def formater(valeur, fmt: str = "nombre") -> str:
    """Texte lisible d'une valeur de ratio ; « n.d. » si la donnée manque."""
    if valeur is None:
        return "n.d."
    if fmt == "pct":
        return _fr(valeur * 100, 1) + " %"
    if fmt == "x":
        return _fr(valeur, 2) + "x"
    if fmt == "ans":
        return _fr(valeur, 1) + " ans"
    return _fr(valeur, 2)


def formater_montant(millions) -> str:
    """Montant en millions de CAD, affiché en M$ ou en G$."""
    if millions is None:
        return "n.d."
    if abs(millions) >= 1000:
        return _fr(millions / 1000, 1) + " G$"
    return _fr(millions, 0) + " M$"

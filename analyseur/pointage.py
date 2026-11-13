"""
pointage.py : pondération, score global, indice de confiance, filtres éliminatoires et simulation de solidité.

Score global = somme(poids × note) ÷ somme(poids des ratios disponibles), sur 100.
Un ratio « n.d. » ne compte pas : son poids est redistribué aux autres.
Confiance = part du poids total pour laquelle on a des données.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from ratios import calculer_ratios, note

FICHIER_PROFILS = Path(__file__).parent / "profils.json"


# --------------------------------------------------------------------------- profils

def charger_profils() -> tuple[list, str]:
    """Renvoie (liste des profils, mention légale « inspiré de... »)."""
    contenu = json.loads(FICHIER_PROFILS.read_text(encoding="utf-8"))
    return contenu["profils"], contenu.get("mention", "")


def poids_du_profil(profil: dict, definitions: list) -> dict:
    """Poids complets {id: 0..10} d'un profil : les ratios non listés prennent le poids par défaut (0)."""
    defaut = profil.get("poids_defaut", 0)
    return {d["id"]: float(profil.get("poids", {}).get(d["id"], defaut)) for d in definitions}


def seuils_du_profil(profil: dict, seuils: dict) -> dict:
    """Seuils {id: (mauvais, bon)} d'un profil : ceux de ratios.json, sauf ceux que le profil remplace ('seuils')."""
    propres = {i: (float(v[0]), float(v[1])) for i, v in profil.get("seuils", {}).items() if i in seuils}
    return {**seuils, **propres}


# --------------------------------------------------------------------------- filtres éliminatoires

def raisons_elimination(entreprise: dict, valeurs: dict, filtres_actifs: list, config_filtres: dict) -> list:
    """Liste des raisons d'élimination (vide si le titre est admissible). Une donnée manquante n'élimine pas."""
    champs = entreprise.get("champs", {})
    seuil = lambda f: config_filtres.get(f, {}).get("seuil")
    raisons = []
    benefice = (champs.get("benefice_net_ttm_cad_m") or {}).get("valeur")
    if "perte_nette" in filtres_actifs and benefice is not None and benefice < seuil("perte_nette"):
        raisons.append("Perte nette sur 12 mois")
    altman = valeurs["altman_z"]["valeur"]
    if "altman" in filtres_actifs and altman is not None and altman < seuil("altman"):
        raisons.append(f"Altman Z de {altman:.2f} (zone de détresse)".replace(".", ","))
    dette = valeurs["dette_fcf"]["valeur"]
    if "dette_fcf" in filtres_actifs and dette is not None and dette > seuil("dette_fcf"):
        raisons.append(f"Dette = {dette:.1f} ans de FCF".replace(".", ","))
    dilution = valeurs["variation_actions"]["valeur"]
    if "dilution" in filtres_actifs and dilution is not None and dilution > seuil("dilution"):
        raisons.append(f"Dilution de {dilution * 100:.1f} % en 1 an".replace(".", ","))
    return raisons


# --------------------------------------------------------------------------- score

def evaluer_entreprise(entreprise: dict, definitions: list, poids: dict, seuils: dict,
                       filtres_actifs: list, config_filtres: dict) -> dict:
    """Calcule ratios, notes, score, confiance et statut d'une entreprise."""
    valeurs = calculer_ratios(entreprise, definitions)
    notes = {d["id"]: note(valeurs[d["id"]]["valeur"], *seuils[d["id"]]) for d in definitions}

    poids_total = sum(poids.get(i, 0) for i in notes)
    poids_dispo = sum(poids.get(i, 0) for i, n in notes.items() if n is not None)
    if poids_dispo > 0:
        score = sum(poids.get(i, 0) * n for i, n in notes.items() if n is not None) / poids_dispo
    else:
        score = None  # aucun ratio pondéré n'est disponible
    # Contribution de chaque ratio au score (en points sur 100) ; la somme des contributions = le score
    contributions = {i: (poids.get(i, 0) * n / poids_dispo if (n is not None and poids_dispo > 0) else 0.0)
                     for i, n in notes.items()}

    # Note par catégorie : pondérée par le profil (classement) et simple moyenne (graphique radar)
    categories, categories_simples = {}, {}
    for cat in {d["categorie"] for d in definitions}:
        ids = [d["id"] for d in definitions if d["categorie"] == cat and notes[d["id"]] is not None]
        p = sum(poids.get(i, 0) for i in ids)
        categories[cat] = sum(poids.get(i, 0) * notes[i] for i in ids) / p if p > 0 else None
        categories_simples[cat] = sum(notes[i] for i in ids) / len(ids) if ids else None

    raisons = raisons_elimination(entreprise, valeurs, filtres_actifs, config_filtres)
    return {"ticker": entreprise["ticker"], "nom": entreprise["nom"], "score": score,
            "confiance": poids_dispo / poids_total if poids_total > 0 else 0.0,
            "elimine": bool(raisons), "raisons": raisons, "valeurs": valeurs, "notes": notes,
            "contributions": contributions, "categories": categories, "categories_simples": categories_simples}


def classer(entreprises: dict, definitions: list, poids: dict, seuils: dict,
            filtres_actifs: list, config_filtres: dict) -> list:
    """Classement complet : titres admissibles d'abord (score décroissant), puis titres éliminés."""
    resultats = [evaluer_entreprise(e, definitions, poids, seuils, filtres_actifs, config_filtres)
                 for e in entreprises.values()]
    resultats.sort(key=lambda r: (r["elimine"], -(r["score"] if r["score"] is not None else -1)))
    return resultats


def gagnant(resultats: list):
    """Premier titre admissible ayant un score, ou None."""
    for r in resultats:
        if not r["elimine"] and r["score"] is not None:
            return r
    return None


# --------------------------------------------------------------------------- explication d'un écart

def expliquer_ecart(a: dict, b: dict, definitions: list, n: int = 5) -> list:
    """Les n ratios qui expliquent le plus l'écart de score entre a et b (différence de contribution, en points)."""
    ecarts = []
    for d in definitions:
        i = d["id"]
        diff = a["contributions"][i] - b["contributions"][i]
        if abs(diff) > 1e-9:
            ecarts.append({"id": i, "nom": d["nom"], "format": d["format"], "ecart": diff,
                           "valeur_a": a["valeurs"][i]["valeur"], "valeur_b": b["valeurs"][i]["valeur"],
                           "note_a": a["notes"][i], "note_b": b["notes"][i]})
    ecarts.sort(key=lambda x: -abs(x["ecart"]))
    return ecarts[:n]


# --------------------------------------------------------------------------- solidité du choix

def simulation_solidite(resultats: list, poids: dict, n: int = 500, amplitude: float = 0.5, graine: int = 42) -> dict:
    """
    Refait le classement n fois en faisant varier chaque poids au hasard de ±amplitude (±50 % par défaut).
    Renvoie le gagnant de référence, le % de simulations où il reste premier et la fréquence de victoire de chaque titre.
    """
    admissibles = [r for r in resultats if not r["elimine"] and r["score"] is not None]
    if not admissibles:
        return {"gagnant": None, "pct_gagnant": 0.0, "frequences": {}}
    ids = [i for i, p in poids.items() if p > 0]
    if not ids:
        return {"gagnant": admissibles[0]["ticker"], "pct_gagnant": 0.0, "frequences": {}}

    # Matrice des notes (titres × ratios) ; NaN quand la donnée manque
    notes = np.array([[np.nan if r["notes"][i] is None else r["notes"][i] for i in ids] for r in admissibles])
    disponible = ~np.isnan(notes)
    base = np.array([poids[i] for i in ids], dtype=float)
    hasard = np.random.default_rng(graine)
    tirages = base * hasard.uniform(1 - amplitude, 1 + amplitude, size=(n, len(ids)))  # n × ratios

    numerateur = tirages @ np.nan_to_num(notes).T       # n × titres
    denominateur = tirages @ disponible.T.astype(float)
    scores = np.where(denominateur > 0, numerateur / np.where(denominateur > 0, denominateur, 1), -1)
    premiers = scores.argmax(axis=1)
    frequences = {r["ticker"]: float((premiers == k).mean()) for k, r in enumerate(admissibles)}
    reference = admissibles[0]["ticker"]
    return {"gagnant": reference, "pct_gagnant": frequences[reference], "frequences": frequences}

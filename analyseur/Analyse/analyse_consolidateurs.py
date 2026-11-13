"""
Grille d'analyse des consolidateurs (style Buffett adapte aux « serial acquirers »)
Hackathon OneSheet. Lit donnees_marche.csv et affiche le classement.

Usage : python analyse_consolidateurs.py [donnees_marche.csv]
Tous les seuils sont dans le dictionnaire SEUILS ci-dessous : modifiez-les au besoin.
"""
import csv, sys

TAUX_OBLIGATION_10ANS = 0.037   # obligation du Canada 10 ans, novembre 2026 (environ 3,65 a 3,7 %)
RENDEMENT_EXIGE = 0.10          # rendement annuel minimum vise pour acheter

# (mauvais, bon) : le score passe lineairement de 0 a 100 entre ces deux valeurs.
# Si mauvais > bon, plus petit = mieux.
SEUILS = {
    "roic":              (0.08, 0.20),
    "roic_plus_og":      (0.12, 0.25),
    "goodwill_actifs":   (0.40, 0.10),
    "marge_fcf":         (0.05, 0.20),
    "intensite_capex":   (0.40, 0.05),
    "conversion_fcf":    (0.80, 1.50),
    "dette_fcf":         (5.0, 1.0),
    "couverture":        (3.0, 10.0),
    "altman":            (1.8, 3.0),
    "dilution":          (0.03, -0.01),
    "croissance_3ans":   (0.00, 0.20),
    "rendement_fcf":     (TAUX_OBLIGATION_10ANS, 0.08),
    "ev_ebit":           (25.0, 10.0),
}

PILIERS = {
    "Moteur d'acquisition (30 %)": (0.30, ["roic", "roic_plus_og", "goodwill_actifs"]),
    "Generation de cash (25 %)":   (0.25, ["marge_fcf", "intensite_capex", "conversion_fcf"]),
    "Solidite financiere (20 %)":  (0.20, ["dette_fcf", "couverture", "altman"]),
    "Allocation du capital (10 %)":(0.10, ["dilution", "croissance_3ans"]),
    "Prix (15 %)":                 (0.15, ["rendement_fcf", "ev_ebit"]),
}

def f(x):
    try: return float(x)
    except (TypeError, ValueError): return None

def note(valeur, mauvais, bon):
    if valeur is None: return None
    t = (valeur - mauvais) / (bon - mauvais)
    return max(0.0, min(1.0, t)) * 100

def indicateurs(r):
    g = lambda k: f(r.get(k))
    ind = {}
    ind["roic"] = g("roic")
    og = g("croissance_organique_recente")
    ind["roic_plus_og"] = ind["roic"] + og if (ind["roic"] is not None and og is not None) else None
    ind["goodwill_actifs"] = g("goodwill_m") / g("actifs_totaux_m")
    ind["marge_fcf"] = g("marge_fcf")
    ind["intensite_capex"] = g("capex_ttm_cad_m") / g("flux_exploitation_ttm_cad_m")
    bn = g("benefice_net_ttm_cad_m")
    ind["conversion_fcf"] = g("fcf_ttm_cad_m") / bn if bn and bn > 0 else None
    ind["dette_fcf"] = g("dette_fcf")
    ind["couverture"] = g("couverture_interets")
    ind["altman"] = g("altman_z")
    ind["dilution"] = g("variation_actions_1an")
    cr = [g(k) for k in ("croissance_revenus_2025", "croissance_revenus_2024", "croissance_revenus_2023")]
    cr = [c for c in cr if c is not None]
    if cr:
        p = 1.0
        for c in cr: p *= (1 + c)
        ind["croissance_3ans"] = p ** (1 / len(cr)) - 1
    else:
        ind["croissance_3ans"] = None
    # Rendement FCF prudent : FCF revenant vraiment aux actionnaires (apres interets, loyers et parts minoritaires,
    # ex. le FCFA2S de Constellation) divise par la capitalisation. Sinon, le rendement FCF de la source de marche.
    fa = g("fcf_actionnaires_cad_m")
    ind["rendement_fcf"] = fa / g("capitalisation_cad_m") if fa is not None else g("rendement_fcf")
    ind["ev_ebit"] = g("ev_ebit")
    # Taux de reinvestissement = depenses d'acquisition / flux d'exploitation de la meme periode (meme devise)
    acq, ocf = g("acquisitions_m"), g("flux_exploitation_meme_periode_m")
    ind["taux_reinvestissement"] = acq / ocf if (acq is not None and ocf) else None
    return ind

def drapeaux(r, ind):
    rouges, jaunes = [], []
    if ind["altman"] is not None and ind["altman"] < 1.81: rouges.append("Altman Z en zone de detresse")
    elif ind["altman"] is not None and ind["altman"] < 2.99: jaunes.append(f"Altman Z en zone grise ({ind['altman']:.2f})")
    if f(r["benefice_net_ttm_cad_m"]) is not None and f(r["benefice_net_ttm_cad_m"]) < 0: rouges.append("Perte nette sur 12 mois")
    if ind["dette_fcf"] is not None and ind["dette_fcf"] > 5: rouges.append(f"Dette = {ind['dette_fcf']:.1f} ans de FCF")
    elif ind["dette_fcf"] is not None and ind["dette_fcf"] > 4: jaunes.append(f"Dette = {ind['dette_fcf']:.1f} ans de FCF")
    if ind["dilution"] is not None and ind["dilution"] > 0.03: rouges.append(f"Dilution de {ind['dilution']:.1%} en 1 an")
    if ind["roic"] is not None and ind["roic"] < 0.10: jaunes.append(f"ROIC faible ({ind['roic']:.1%}) : les acquisitions creent peu de valeur")
    if ind["goodwill_actifs"] > 0.40: jaunes.append(f"Goodwill = {ind['goodwill_actifs']:.0%} des actifs")
    return rouges, jaunes

def rendement_attendu(r, ind):
    """Rendement annuel attendu pour l'actionnaire, inspire de la formule ROIC + croissance organique de Mark Leonard.
    = part du FCF non reinvestie x rendement FCF + croissance organique + part reinvestie x rendement des acquisitions (plafonne a 15 %)."""
    og = f(r.get("croissance_organique_recente")) or 0.0
    reinv = ind["taux_reinvestissement"] if ind["taux_reinvestissement"] is not None else 0.0
    reinv = min(reinv, 1.0)
    roic_nouv = min(ind["roic"] or 0.0, 0.15)
    return (1 - reinv) * ind["rendement_fcf"] + og + reinv * roic_nouv, reinv

def analyser(chemin):
    lignes = list(csv.DictReader(open(chemin, encoding="utf-8")))
    resultats = []
    for r in lignes:
        ind = indicateurs(r)
        rouges, jaunes = drapeaux(r, ind)
        piliers = {}
        for nom, (poids, cles) in PILIERS.items():
            notes = [note(ind[k], *SEUILS[k]) for k in cles]
            notes = [n for n in notes if n is not None]
            piliers[nom] = sum(notes) / len(notes) if notes else 0.0
        score = sum(PILIERS[n][0] * s for n, s in piliers.items())
        ra, reinv = rendement_attendu(r, ind)
        resultats.append(dict(ticker=r["ticker"], nom=r["nom"], score=score, piliers=piliers,
                              ind=ind, rouges=rouges, jaunes=jaunes, rendement=ra, reinv=reinv))
    resultats.sort(key=lambda x: (len(x["rouges"]) > 0, -x["score"]))
    return resultats

if __name__ == "__main__":
    chemin = sys.argv[1] if len(sys.argv) > 1 else "donnees_marche.csv"
    res = analyser(chemin)
    for i, x in enumerate(res, 1):
        statut = "ELIMINE" if x["rouges"] else "ADMISSIBLE"
        print(f"\n#{i} {x['ticker']} ({x['nom']}) : score {x['score']:.0f}/100 [{statut}]")
        for n, s in x["piliers"].items(): print(f"   {n:32s} {s:5.0f}")
        ind = x["ind"]
        print(f"   ROIC {ind['roic']:.1%} | ROIC+croiss. org. {ind['roic_plus_og'] if ind['roic_plus_og'] is None else format(ind['roic_plus_og'],'.1%')} | goodwill/actifs {ind['goodwill_actifs']:.0%} | marge FCF {ind['marge_fcf']:.1%} | rendement FCF {ind['rendement_fcf']:.1%}")
        print(f"   Reinvestissement en acquisitions {x['reinv']:.0%} | rendement annuel attendu ~{x['rendement']:.1%} (cible {RENDEMENT_EXIGE:.0%})")
        for d in x["rouges"]: print("   [ROUGE] " + d)
        for d in x["jaunes"]: print("   [JAUNE] " + d)

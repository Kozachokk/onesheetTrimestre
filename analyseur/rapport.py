"""
rapport.py : texte de justification, export CSV du classement et fiche PDF d'une page (« One Sheet »).

Règle : tous les chiffres du texte viennent des calculs (ratios, notes, contributions) ou des événements
du JSON OneSheet. Aucun chiffre n'est inventé.
"""
from __future__ import annotations

import csv
import io

from pointage import expliquer_ecart, gagnant
from ratios import formater, formater_montant

PIED_DE_PAGE = "Outil éducatif, pas un conseil financier."


def _pts(x: float) -> str:
    return f"{x:.1f}".replace(".", ",")


def _date_fr(date_iso: str) -> str:
    return date_iso or "date n.d."


# --------------------------------------------------------------------------- éléments de la justification

def elements_justification(resultats: list, entreprises: dict, definitions: list, poids: dict, profil: dict,
                           filtres_actifs: list, config: dict, solidite: dict | None = None) -> dict | None:
    """Rassemble les faits de la justification du titre recommandé. Renvoie None si aucun titre n'est admissible."""
    premier = gagnant(resultats)
    if premier is None:
        return None
    defs = {d["id"]: d for d in definitions}
    poids_dispo = sum(p for i, p in poids.items() if premier["notes"][i] is not None) or 1.0
    ponderes = [i for i, p in poids.items() if p > 0]

    def ligne(i):
        d, v = defs[i], premier["valeurs"][i]["valeur"]
        return {"id": i, "nom": d["nom"], "valeur": formater(v, d["format"]), "note": premier["notes"][i],
                "points": premier["contributions"][i],
                "perdus": poids[i] * (100 - premier["notes"][i]) / poids_dispo if premier["notes"][i] is not None else 0.0}

    disponibles = [ligne(i) for i in ponderes if premier["notes"][i] is not None]
    forces = [x for x in sorted(disponibles, key=lambda x: -x["points"]) if x["note"] >= 50][:4]
    faiblesses = [x for x in sorted(disponibles, key=lambda x: -x["perdus"]) if x["note"] < 50][:3]
    manquants = [defs[i]["nom"] for i in ponderes if premier["notes"][i] is None]

    # Comparaison avec le deuxième titre admissible
    suivants = [r for r in resultats if not r["elimine"] and r["score"] is not None and r["ticker"] != premier["ticker"]]
    deuxieme = suivants[0] if suivants else None
    comparaison = expliquer_ecart(premier, deuxieme, definitions, 3) if deuxieme else []

    # Risques tirés des événements du JSON et du bilan
    e = entreprises[premier["ticker"]]
    types = config.get("types_evenements", {})
    risques = []
    for type_ev, combien in [("litigation", 2), ("acquisition", 2), ("financing", 1)]:
        for ev in [x for x in e.get("evenements", []) if x["type"] == type_ev][:combien]:
            risques.append({"type": types.get(type_ev, type_ev), "date": _date_fr(ev["date"]), "resume": ev["resume"], "source": ev["source"]})
    risques_bilan = []
    v = lambda i: premier["valeurs"][i]["valeur"]
    if v("dette_fcf") is not None and v("dette_fcf") > 3:
        risques_bilan.append(f"Dette élevée : {formater(v('dette_fcf'), 'ans')} de flux de trésorerie libre.")
    if v("goodwill_actifs") is not None and v("goodwill_actifs") > 0.40:
        risques_bilan.append(f"Goodwill important : {formater(v('goodwill_actifs'), 'pct')} des actifs (risque de dépréciation).")
    if v("altman_z") is not None and v("altman_z") < 2.99:
        risques_bilan.append(f"Altman Z de {formater(v('altman_z'))} : zone grise (sous 2,99).")
    if v("variation_actions") is not None and v("variation_actions") > 0.01:
        risques_bilan.append(f"Le nombre d'actions a augmenté de {formater(v('variation_actions'), 'pct')} en un an (dilution).")

    # Ce qui ferait changer d'avis : calculé à partir de l'écart avec le 2e, des filtres et de la simulation
    changer = []
    if deuxieme:
        ecart = premier["score"] - deuxieme["score"]
        changer.append(f"L'avance sur {deuxieme['nom']} est de {_pts(ecart)} points sur 100. "
                       + ("C'est mince : un petit changement de poids ou de données peut inverser le classement."
                          if ecart < 5 else "Il faudrait un changement important des poids ou des résultats pour l'effacer."))
        if forces and forces[0]["points"] > ecart:
            changer.append(f"Si « {forces[0]['nom']} » (actuellement {forces[0]['valeur']}) tombait à son seuil « mauvais », "
                           f"le score perdrait {_pts(forces[0]['points'])} points, plus que l'avance sur le 2e.")
    filtres_cfg = config.get("filtres", {})
    if "dette_fcf" in filtres_actifs and v("dette_fcf") is not None:
        changer.append(f"Une dette dépassant {formater(filtres_cfg['dette_fcf']['seuil'], 'ans')} de FCF éliminerait le titre "
                       f"(actuellement {formater(v('dette_fcf'), 'ans')}).")
    if "dilution" in filtres_actifs and v("variation_actions") is not None:
        changer.append(f"Une dilution de plus de {formater(filtres_cfg['dilution']['seuil'], 'pct')} par an éliminerait le titre "
                       f"(actuellement {formater(v('variation_actions'), 'pct')}).")
    if "perte_nette" in filtres_actifs:
        changer.append("Une perte nette sur 12 mois éliminerait le titre.")
    if solidite and solidite.get("gagnant") == premier["ticker"]:
        changer.append(f"Solidité : le titre reste premier dans {round(solidite['pct_gagnant'] * 100)} % des simulations "
                       "où chaque poids varie de ±50 %.")
    if premier["confiance"] < 0.999:
        changer.append(f"Données manquantes : la confiance est de {round(premier['confiance'] * 100)} % "
                       f"({', '.join(manquants)} non disponibles). Ces ratios pourraient modifier le score.")

    return {"profil": profil, "premier": premier, "entreprise": e, "forces": forces, "faiblesses": faiblesses,
            "deuxieme": deuxieme, "comparaison": comparaison,
            "elimines": [r for r in resultats if r["elimine"]],
            "risques": risques, "risques_bilan": risques_bilan, "changer": changer}


def texte_justification(el: dict | None, mention: str = "") -> str:
    """Texte (Markdown) de la justification en français."""
    if el is None:
        return "Aucun titre admissible avec ce profil : tous les titres sont éliminés ou sans données. Assouplissez les filtres ou les poids."
    p, profil = el["premier"], el["profil"]
    t = [f"### Pourquoi {p['nom']} ({p['ticker']}) ?", ""]
    t.append(f"**Profil utilisé :** {profil['nom']}. {profil.get('description', '')}"
             + (f" *{mention}*" if profil.get("inspire") and mention else ""))
    t.append("")
    t.append(f"**Résultat :** score de {_pts(p['score'])} sur 100, avec une confiance de {round(p['confiance'] * 100)} % "
             "(part du poids pour laquelle les données existent).")
    t += ["", "**Forces** (ratios qui rapportent le plus de points) :"]
    t += [f"- {x['nom']} : {x['valeur']} (note {round(x['note'])}/100, +{_pts(x['points'])} points)" for x in el["forces"]] or ["- Aucune force marquée."]
    t += ["", "**Faiblesses** (ratios qui font perdre le plus de points) :"]
    t += [f"- {x['nom']} : {x['valeur']} (note {round(x['note'])}/100, {_pts(x['perdus'])} points perdus)" for x in el["faiblesses"]] or ["- Aucune faiblesse marquée parmi les ratios pondérés."]
    if el["deuxieme"]:
        d = el["deuxieme"]
        t += ["", f"**Comparaison avec le 2e, {d['nom']} ({d['ticker']}) :** score de {_pts(d['score'])}, "
                  f"soit {_pts(p['score'] - d['score'])} points de moins. Principaux écarts :"]
        for c in el["comparaison"]:
            sens = "avantage" if c["ecart"] > 0 else "désavantage"
            t.append(f"- {c['nom']} : {formater(c['valeur_a'], c['format'])} contre {formater(c['valeur_b'], c['format'])} "
                     f"({sens} de {_pts(abs(c['ecart']))} points)")
    t += ["", "**Titres éliminés :**"]
    t += [f"- {r['nom']} ({r['ticker']}) : {' ; '.join(r['raisons'])}" for r in el["elimines"]] or ["- Aucun."]
    t += ["", "**Risques à surveiller :**"]
    t += [f"- {x}" for x in el["risques_bilan"]]
    t += [f"- {x['type']} ({x['date']}) : {x['resume']} *[source : {x['source']}]*" for x in el["risques"]]
    if not el["risques_bilan"] and not el["risques"]:
        t.append("- Aucun événement de risque dans les données disponibles.")
    t += ["", "**Ce qui ferait changer d'avis :**"]
    t += [f"- {x}" for x in el["changer"]]
    t += ["", f"*{PIED_DE_PAGE}*"]
    return "\n".join(t)


# --------------------------------------------------------------------------- CSV

def csv_classement(resultats: list, categories: list) -> bytes:
    """Classement au format CSV (séparateur point-virgule, lisible par Excel en français)."""
    sortie = io.StringIO()
    w = csv.writer(sortie, delimiter=";")
    w.writerow(["rang", "ticker", "nom", "score", "confiance_pct", "statut", "raisons"] + categories)
    rang = 0
    for r in resultats:
        if not r["elimine"]:
            rang += 1
        w.writerow(["" if r["elimine"] else rang, r["ticker"], r["nom"],
                    "n.d." if r["score"] is None else _pts(r["score"]), round(r["confiance"] * 100),
                    "éliminé" if r["elimine"] else "admissible", " ; ".join(r["raisons"])]
                   + ["n.d." if r["categories"].get(c) is None else _pts(r["categories"][c]) for c in categories])
    return sortie.getvalue().encode("utf-8-sig")


# --------------------------------------------------------------------------- PDF d'une page

def _latin(texte: str) -> str:
    """Les polices PDF de base ne connaissent que le jeu de caractères d'Europe de l'Ouest."""
    remplacements = {" ": " ", "→": "à", "≥": ">=", "≤": "<=", "−": "-", "’": "'"}
    for a, b in remplacements.items():
        texte = texte.replace(a, b)
    texte = texte.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return texte.encode("cp1252", "replace").decode("cp1252")


def pdf_one_sheet(el: dict | None, categories: list, mention: str = "", couleur: str = "#1f5c55") -> bytes:
    """Fiche PDF d'une page du titre recommandé. Le contenu est réduit automatiquement pour tenir sur une page."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import Frame, KeepInFrame, Paragraph, Spacer, Table, TableStyle
    from reportlab.pdfgen import canvas

    tampon = io.BytesIO()
    largeur, hauteur = letter
    c = canvas.Canvas(tampon, pagesize=letter)
    vert, gris = colors.HexColor(couleur), colors.HexColor("#5f6b6a")

    # Bandeau du haut et pied de page
    c.setFillColor(vert)
    c.rect(0, hauteur - 2.3 * cm, largeur, 2.3 * cm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 17)
    titre = _latin(f"{el['premier']['nom']} ({el['premier']['ticker']})") if el else "Aucun titre admissible"
    c.drawString(1.5 * cm, hauteur - 1.25 * cm, titre.replace("&amp;", "&"))
    c.setFont("Helvetica", 9.5)
    c.drawString(1.5 * cm, hauteur - 1.85 * cm, _latin("One Sheet · titre recommandé" + (f" · profil : {el['profil']['nom']}" if el else "")))
    c.setFillColor(gris)
    c.setFont("Helvetica", 8)
    c.drawString(1.5 * cm, 1.0 * cm, _latin(PIED_DE_PAGE))

    normal = ParagraphStyle("n", fontName="Helvetica", fontSize=8.6, leading=11.2)
    petit = ParagraphStyle("p", parent=normal, fontSize=7.4, leading=9.4, textColor=gris)
    section = ParagraphStyle("s", parent=normal, fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=vert, spaceBefore=6, spaceAfter=2)
    P = lambda texte, style=normal: Paragraph(_latin(texte), style)
    contenu = []

    if el is None:
        contenu.append(P("Tous les titres sont éliminés ou sans données avec ce profil."))
    else:
        p, e = el["premier"], el["entreprise"]
        champ = lambda cle: (e["champs"].get(cle) or {}).get("valeur")
        contenu.append(Paragraph(_latin(f"Score : {_pts(p['score'])} / 100").join(["<b>", "</b>"])
                                 + _latin(f"   ·   Confiance : {round(p['confiance'] * 100)} %   ·   Secteur : {e.get('secteur') or 'n.d.'}"), normal))
        if el["profil"].get("inspire") and mention:
            contenu.append(P(mention, petit))

        contenu.append(P("Chiffres clés (en dollars canadiens)", section))
        prix = champ("prix_cad")
        cles = [["Prix", "Capitalisation", "Revenus 12 mois", "FCF 12 mois", "Bénéfice net", "Dette totale"],
                [formater(prix) + " $" if prix is not None else "n.d.", formater_montant(champ("capitalisation_cad_m")),
                 formater_montant(champ("revenus_ttm_cad_m")), formater_montant(champ("fcf_ttm_cad_m")),
                 formater_montant(champ("benefice_net_ttm_cad_m")), formater_montant(champ("dette_totale_cad_m"))]]
        tableau = Table([[_latin(x).replace("&amp;", "&") for x in ligne] for ligne in cles], colWidths=[3.05 * cm] * 6)
        tableau.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, 0), "Helvetica"), ("TEXTCOLOR", (0, 0), (-1, 0), gris),
                                     ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, 0), 7.5),
                                     ("FONTSIZE", (0, 1), (-1, 1), 10), ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d5dedc")),
                                     ("LEFTPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        contenu.append(tableau)

        contenu.append(P("Notes par catégorie (moyenne des ratios, sur 100)", section))
        lignes_cat = []
        for cat in categories:
            n = p["categories_simples"].get(cat)
            barre = Table([[""]], colWidths=[max(0.05, (n or 0) / 100 * 8) * cm], rowHeights=[0.28 * cm])
            barre.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), vert if n is not None else colors.white)]))
            lignes_cat.append([_latin(cat), barre, "n.d." if n is None else str(round(n))])
        t_cat = Table(lignes_cat, colWidths=[5 * cm, 8.3 * cm, 1.5 * cm])
        t_cat.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 8.6), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                   ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
                                   ("LEFTPADDING", (1, 0), (1, -1), 0)]))
        contenu.append(t_cat)

        contenu.append(P("Forces", section))
        contenu += [P(f"• {x['nom']} : {x['valeur']} (note {round(x['note'])}/100, +{_pts(x['points'])} points)") for x in el["forces"]] or [P("• Aucune force marquée.")]
        contenu.append(P("Faiblesses", section))
        contenu += [P(f"• {x['nom']} : {x['valeur']} (note {round(x['note'])}/100, {_pts(x['perdus'])} points perdus)") for x in el["faiblesses"]] or [P("• Aucune faiblesse marquée parmi les ratios pondérés.")]
        if el["deuxieme"]:
            d = el["deuxieme"]
            contenu.append(P("Comparaison avec le 2e", section))
            details = " ; ".join(f"{x['nom']} {formater(x['valeur_a'], x['format'])} contre {formater(x['valeur_b'], x['format'])}" for x in el["comparaison"])
            contenu.append(P(f"{d['nom']} ({d['ticker']}) obtient {_pts(d['score'])}, soit {_pts(p['score'] - d['score'])} points de moins. {details}."))
        contenu.append(P("Titres éliminés", section))
        contenu += [P(f"• {r['nom']} ({r['ticker']}) : {' ; '.join(r['raisons'])}") for r in el["elimines"]] or [P("• Aucun.")]
        contenu.append(P("Risques à surveiller", section))
        contenu += [P(f"• {x}") for x in el["risques_bilan"]]
        for x in el["risques"][:4]:
            resume = x["resume"] if len(x["resume"]) < 230 else x["resume"][:227] + "..."
            contenu.append(Paragraph(_latin(f"• {x['type']} ({x['date']}) : {resume} ")
                                     + "<font color='#5f6b6a'>" + _latin(f"[{x['source']}]") + "</font>", normal))
        if not el["risques"] and not el["risques_bilan"]:
            contenu.append(P("• Aucun événement de risque dans les données disponibles."))
        contenu.append(P("Ce qui ferait changer d'avis", section))
        contenu += [P(f"• {x}") for x in el["changer"]]
        contenu.append(Spacer(1, 4))
        contenu.append(P("Tous les chiffres viennent des ratios calculés par l'outil et des événements des fichiers OneSheet.", petit))

    cadre = Frame(1.5 * cm, 1.5 * cm, largeur - 3 * cm, hauteur - 4.2 * cm, showBoundary=0, leftPadding=0, rightPadding=0)
    cadre.addFromList([KeepInFrame(largeur - 3 * cm, hauteur - 4.4 * cm, contenu, mode="shrink")], c)
    c.showPage()
    c.save()
    return tampon.getvalue()

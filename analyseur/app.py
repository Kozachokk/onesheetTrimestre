"""
app.py : interface Streamlit de l'analyseur d'actions (hackathon OneSheet).

Lancement : streamlit run app.py

Organisation du fichier :
  1. état et barre latérale (profil, filtres, curseurs, réglages, ajout de données) ;
  2. calcul du classement (pointage.py) ;
  3. un bloc par onglet : Classement, Fiche entreprise, Comparer, Profils, Solidité du choix, Méthode, Données.
Tout le texte de l'interface est en français. Les seuils, poids et profils viennent des fichiers JSON.
"""
from __future__ import annotations

import html
import json
import os

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import donnees
import pointage
import rapport
from ratios import charger_definitions, formater, formater_montant, seuils_par_defaut

# --------------------------------------------------------------------------- configuration

CONFIG = donnees.charger_config()
DEFINITIONS, CATEGORIES = charger_definitions()
DEFS = {d["id"]: d for d in DEFINITIONS}
PROFILS, MENTION = pointage.charger_profils()
PROFILS_PAR_ID = {p["id"]: p for p in PROFILS}
VERT = CONFIG.get("couleur_principale", "#1f5c55")
HORS_LIGNE = bool(os.environ.get("ONESHEET_HORS_LIGNE"))  # pour les tests : aucun appel réseau

st.set_page_config(page_title="Analyseur d'actions · OneSheet", page_icon="📊", layout="wide")
st.markdown(f"""
<style>
  h1, h2, h3 {{ color: {VERT}; }}
  table.os {{ width: 100%; border-collapse: collapse; font-size: 0.9rem; }}
  table.os th {{ text-align: left; color: #5f6b6a; font-weight: 600; border-bottom: 2px solid {VERT}; padding: 6px 8px; }}
  table.os td {{ padding: 6px 8px; border-bottom: 1px solid #e3e9e8; vertical-align: middle; }}
  table.os tr.elimine td {{ color: #a3adab; }}
  table.os tr.elimine .barre > span {{ background: #b9c4c2; }}
  table.os tr.groupe td {{ background: #f1f5f4; font-weight: 600; color: {VERT}; }}
  table.os td.meilleur {{ background: #dff0e6; font-weight: 600; color: #14532d; }}
  table.os td.nd {{ color: #a3adab; }}
  .barre {{ background: #e3e9e8; border-radius: 3px; height: 8px; width: 64px; display: inline-block; vertical-align: middle; margin-right: 6px; }}
  .barre > span {{ display: block; height: 8px; border-radius: 3px; background: {VERT}; }}
  .carte {{ border: 1px solid #d5dedc; border-left: 6px solid {VERT}; border-radius: 6px; padding: 14px 18px; background: #f6faf9; margin-bottom: 12px; }}
  .carte .etiquette {{ color: #5f6b6a; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }}
  .carte .nom {{ font-size: 1.5rem; font-weight: 700; color: {VERT}; }}
  .pied {{ text-align: center; color: #5f6b6a; font-size: 0.85rem; margin-top: 2rem; border-top: 1px solid #e3e9e8; padding-top: 0.8rem; }}
</style>
""", unsafe_allow_html=True)


def facteur(id_ratio: str) -> float:
    """Les seuils en pourcentage sont saisis en % (5 au lieu de 0,05)."""
    return 100.0 if DEFS[id_ratio]["format"] == "pct" else 1.0


def fr(x: float, decimales: int = 1) -> str:
    """Nombre avec une virgule décimale."""
    return f"{x:.{decimales}f}".replace(".", ",")


def esc(texte) -> str:
    return html.escape(str(texte), quote=True)


def infobulle(source: str, date: str) -> str:
    """Texte affiché au survol : source et date de la donnée."""
    if not source:
        return "Donnée non disponible"
    return f"Source : {source}" + (f" · Date : {date}" if date else "")


def barre(note, largeur: int = 64) -> str:
    """Mini-barre de 0 à 100 en HTML."""
    if note is None:
        return "<span class='nd'>n.d.</span>"
    return (f"<span class='barre' style='width:{largeur}px'><span style='width:{max(0, min(100, note)):.0f}%'></span></span>"
            f"{note:.0f}")


# --------------------------------------------------------------------------- état de la session

def appliquer_profil(profil: dict | None = None):
    """Applique d'un coup les poids, les filtres et les seuils par défaut d'un profil."""
    profil = profil or PROFILS_PAR_ID[st.session_state["profil_id"]]
    for i, p in pointage.poids_du_profil(profil, DEFINITIONS).items():
        st.session_state[f"w_{i}"] = int(round(max(0, min(10, p))))
    for f in CONFIG["filtres"]:
        st.session_state[f"f_{f}"] = f in profil.get("filtres", [])
    defauts = seuils_par_defaut(DEFINITIONS, CONFIG["taux_obligataire_10ans"])
    for i, (mauvais, bon) in defauts.items():
        mauvais, bon = profil.get("seuils", {}).get(i, (mauvais, bon))
        st.session_state[f"sm_{i}"] = float(mauvais) * facteur(i)
        st.session_state[f"sb_{i}"] = float(bon) * facteur(i)


def charger_profil_perso():
    """Recharge un profil personnalisé enregistré en JSON (poids, filtres, seuils)."""
    fichier = st.session_state.get("fichier_profil")
    if fichier is None:
        return
    try:
        profil = json.loads(fichier.getvalue().decode("utf-8-sig"))
        profil = {"poids": {k: v for k, v in profil.get("poids", {}).items() if k in DEFS},
                  "filtres": [f for f in profil.get("filtres", []) if f in CONFIG["filtres"]],
                  "seuils": {k: v for k, v in profil.get("seuils", {}).items() if k in DEFS and len(v) == 2}}
        appliquer_profil(profil)
        st.session_state["message_profil"] = ("ok", f"Profil « {fichier.name} » chargé.")
    except Exception as erreur:
        st.session_state["message_profil"] = ("erreur", f"Profil illisible : {erreur}")


if "profil_id" not in st.session_state:
    st.session_state["profil_id"] = PROFILS[0]["id"]
    st.session_state["taux_10ans"] = CONFIG["taux_obligataire_10ans"] * 100
    st.session_state["fx_USD"] = float(CONFIG["taux_change"]["USD"])
    st.session_state["fx_EUR"] = float(CONFIG["taux_change"]["EUR"])
    st.session_state["prix_auto"] = bool(CONFIG.get("charger_prix_auto", True))
    st.session_state["symboles_yf"] = []
    st.session_state["televerses"] = []
    appliquer_profil()

# Streamlit efface l'état des widgets non affichés : on le conserve explicitement (seuils du mode avancé, réglages).
for cle in list(st.session_state.keys()):
    if cle.startswith(("sm_", "sb_", "w_", "f_")) or cle in ("taux_10ans", "fx_USD", "fx_EUR", "prix_auto"):
        st.session_state[cle] = st.session_state[cle]

# --------------------------------------------------------------------------- barre latérale

with st.sidebar:
    st.markdown(f"<h2 style='margin-bottom:0'>OneSheet</h2><div style='color:#5f6b6a'>Analyseur d'actions</div>", unsafe_allow_html=True)

    st.subheader("Profil d'investisseur")
    st.selectbox("Profil", [p["id"] for p in PROFILS], key="profil_id", on_change=appliquer_profil,
                 format_func=lambda i: PROFILS_PAR_ID[i]["nom"], label_visibility="collapsed")
    profil_actif = PROFILS_PAR_ID[st.session_state["profil_id"]]
    st.caption(profil_actif["description"] + (f" *{MENTION}*" if profil_actif.get("inspire") else ""))
    if profil_actif.get("avertissement"):
        st.warning(profil_actif["avertissement"])
    st.button("Réinitialiser le profil", on_click=appliquer_profil, use_container_width=True)

    st.subheader("Filtres éliminatoires")
    for f, cfg_f in CONFIG["filtres"].items():
        st.checkbox(cfg_f["nom"], key=f"f_{f}", help=cfg_f.get("aide"))

    st.subheader("Importance des ratios")
    st.caption("De 0 (ratio exclu) à 10 (très important).")
    mode_avance = st.toggle("Mode avancé (modifier les seuils)", key="mode_avance")
    for cat in CATEGORIES:
        ids = [d["id"] for d in DEFINITIONS if d["categorie"] == cat]
        actifs = sum(1 for i in ids if st.session_state[f"w_{i}"] > 0)
        with st.expander(f"{cat} ({actifs} sur {len(ids)})", expanded=actifs > 0):
            for i in ids:
                st.slider(DEFS[i]["nom"], 0, 10, key=f"w_{i}", help=DEFS[i]["explication"])
                if mode_avance:
                    unite = " (%)" if DEFS[i]["format"] == "pct" else ""
                    pas = 0.5 if DEFS[i]["format"] == "pct" else 0.1
                    c1, c2 = st.columns(2)
                    if DEFS[i]["mauvais"] == "taux_10ans":
                        c1.caption("Seuil mauvais : taux obligataire 10 ans (réglages)")
                    else:
                        c1.number_input(f"Mauvais{unite}", key=f"sm_{i}", step=pas, format="%.2f")
                    c2.number_input(f"Bon{unite}", key=f"sb_{i}", step=pas, format="%.2f")

    with st.expander("Enregistrer ou recharger un profil"):
        profil_courant = {
            "nom": "Profil personnalisé",
            "poids": {d["id"]: st.session_state[f"w_{d['id']}"] for d in DEFINITIONS},
            "filtres": [f for f in CONFIG["filtres"] if st.session_state[f"f_{f}"]],
            "seuils": {d["id"]: [st.session_state[f"sm_{d['id']}"] / facteur(d["id"]), st.session_state[f"sb_{d['id']}"] / facteur(d["id"])]
                       for d in DEFINITIONS if d["mauvais"] != "taux_10ans"},
        }
        st.download_button("Enregistrer le profil actuel (JSON)", json.dumps(profil_courant, ensure_ascii=False, indent=2),
                           file_name="profil_personnalise.json", mime="application/json", use_container_width=True)
        st.file_uploader("Recharger un profil (JSON)", type=["json"], key="fichier_profil", on_change=charger_profil_perso)
        if "message_profil" in st.session_state:
            genre, message = st.session_state.pop("message_profil")
            (st.success if genre == "ok" else st.error)(message)

    st.subheader("Ajouter des données")
    with st.form("ajout_ticker", clear_on_submit=True):
        symbole = st.text_input("Ajouter un ticker (yfinance)", placeholder="ex. SHOP.TO, DOL.TO, AAPL",
                                help="Titres canadiens : suffixe .TO pour la TSX, .V pour la TSXV.")
        if st.form_submit_button("Ajouter", use_container_width=True) and symbole.strip():
            symbole = symbole.strip().upper()
            _, erreur = donnees.charger_ticker_yfinance(symbole, {"CAD": 1.0})
            if erreur:
                st.error(erreur)
            elif symbole not in st.session_state["symboles_yf"]:
                st.session_state["symboles_yf"].append(symbole)
    fichiers = st.file_uploader("Téléverser un CSV ou un JSON OneSheet", type=["csv", "json"], accept_multiple_files=True,
                                help="CSV : mêmes colonnes que donnees_marche.csv. JSON : format OneSheet company-profile-consumer-v2.")
    st.session_state["televerses"] = [(f.name, f.getvalue()) for f in (fichiers or [])]
    if st.session_state["symboles_yf"]:
        st.caption("Titres ajoutés : " + ", ".join(st.session_state["symboles_yf"]))
        if st.button("Retirer les titres ajoutés", use_container_width=True):
            st.session_state["symboles_yf"] = []
            st.rerun()

    with st.expander("Réglages"):
        st.number_input("Taux obligataire Canada 10 ans (%)", key="taux_10ans", step=0.1, format="%.2f",
                        help="Sert de seuil « mauvais » au rendement FCF : une action doit rapporter plus qu'une obligation sans risque.")
        st.number_input("1 USD en CAD", key="fx_USD", step=0.01, format="%.4f")
        st.number_input("1 EUR en CAD", key="fx_EUR", step=0.01, format="%.4f")
        st.checkbox("Charger l'historique de prix (yfinance)", key="prix_auto",
                    help="Nécessaire pour les ratios de momentum (rendement 6 mois, moyenne mobile, volatilité) et la marge brute.")

# --------------------------------------------------------------------------- données


@st.cache_data(show_spinner="Chargement des données...")
def charger_donnees_base(usd: float, eur: float, avec_prix: bool):
    """Source A (JSON + CSV), complétée par l'historique de prix yfinance si demandé."""
    taux = {"CAD": 1.0, "USD": usd, "EUR": eur}
    entreprises = donnees.charger_base(taux)
    erreurs = donnees.completer_avec_yfinance(entreprises, taux) if avec_prix else []
    return entreprises, erreurs


TAUX = {"CAD": 1.0, "USD": st.session_state["fx_USD"], "EUR": st.session_state["fx_EUR"]}
ENTREPRISES, erreurs_donnees = charger_donnees_base(TAUX["USD"], TAUX["EUR"], st.session_state["prix_auto"] and not HORS_LIGNE)
ENTREPRISES = dict(ENTREPRISES)  # copie : on ne modifie pas l'objet en cache

for s in st.session_state["symboles_yf"]:  # source B
    e, erreur = donnees.charger_ticker_yfinance(s, TAUX)
    if erreur:
        erreurs_donnees = erreurs_donnees + [erreur]
    else:
        ENTREPRISES[e["ticker"] if e["ticker"] not in ENTREPRISES else s] = e
for nom_fichier, octets in st.session_state["televerses"]:  # source C
    ajoutees, erreur = donnees.lire_televersement(nom_fichier, octets, TAUX)
    if erreur:
        erreurs_donnees = erreurs_donnees + [erreur]
    for t, e in ajoutees.items():
        ENTREPRISES[t] = donnees.fusionner(e, ENTREPRISES[t]) if t in ENTREPRISES else e

# --------------------------------------------------------------------------- calcul du classement

POIDS = {d["id"]: float(st.session_state[f"w_{d['id']}"]) for d in DEFINITIONS}
TAUX_10ANS = st.session_state["taux_10ans"] / 100
SEUILS = {}
for d in DEFINITIONS:
    i = d["id"]
    mauvais = TAUX_10ANS if d["mauvais"] == "taux_10ans" else st.session_state[f"sm_{i}"] / facteur(i)
    SEUILS[i] = (mauvais, st.session_state[f"sb_{i}"] / facteur(i))
FILTRES = [f for f in CONFIG["filtres"] if st.session_state[f"f_{f}"]]

RESULTATS = pointage.classer(ENTREPRISES, DEFINITIONS, POIDS, SEUILS, FILTRES, CONFIG["filtres"])
PAR_TICKER = {r["ticker"]: r for r in RESULTATS}
GAGNANT = pointage.gagnant(RESULTATS)
SOLIDITE = pointage.simulation_solidite(RESULTATS, POIDS, CONFIG.get("nb_simulations", 500), CONFIG.get("amplitude_simulation", 0.5))
st.session_state["_classement"] = [(r["ticker"], r["score"], r["elimine"]) for r in RESULTATS]  # utilisé par les tests

profil_modifie = (POIDS != pointage.poids_du_profil(profil_actif, DEFINITIONS)
                  or sorted(FILTRES) != sorted(profil_actif.get("filtres", [])))
profil_affiche = dict(profil_actif, nom=profil_actif["nom"] + (" (ajusté)" if profil_modifie else ""))
ELEMENTS = rapport.elements_justification(RESULTATS, ENTREPRISES, DEFINITIONS, POIDS, profil_affiche, FILTRES, CONFIG, SOLIDITE)

# --------------------------------------------------------------------------- en-tête

st.title("Analyseur d'actions")
st.caption(f"{len(ENTREPRISES)} titres analysés · profil : **{profil_affiche['nom']}** · "
           f"{sum(1 for p in POIDS.values() if p > 0)} ratios pondérés sur {len(DEFINITIONS)} · montants en dollars canadiens")
for erreur in erreurs_donnees:
    st.warning(erreur)
if sum(POIDS.values()) == 0:
    st.error("Tous les curseurs sont à 0 : aucun score ne peut être calculé. Montez au moins un curseur.")

onglets = st.tabs(["Classement", "Fiche entreprise", "Comparer", "Profils", "Solidité du choix", "Méthode", "Données"])

# --------------------------------------------------------------------------- 1. Classement

with onglets[0]:
    if GAGNANT:
        st.markdown(
            f"<div class='carte'><div class='etiquette'>Titre recommandé pour ce profil</div>"
            f"<div class='nom'>{esc(GAGNANT['nom'])} ({esc(GAGNANT['ticker'])})</div>"
            f"<div>Score <b>{GAGNANT['score']:.0f} / 100</b> · confiance {GAGNANT['confiance'] * 100:.0f} % · "
            f"reste premier dans {SOLIDITE['pct_gagnant'] * 100:.0f} % des simulations</div></div>", unsafe_allow_html=True)
    else:
        st.markdown("<div class='carte'><div class='etiquette'>Titre recommandé pour ce profil</div>"
                    "<div class='nom'>Aucun titre admissible</div><div>Assouplissez les filtres ou les poids.</div></div>",
                    unsafe_allow_html=True)

    lignes, rang = [], 0
    for r in RESULTATS:
        if not r["elimine"]:
            rang += 1
        statut = "Éliminé : " + " ; ".join(r["raisons"]) if r["elimine"] else "Admissible"
        cellules = [f"<td>{'–' if r['elimine'] else rang}</td>",
                    f"<td><b>{esc(r['ticker'])}</b> · {esc(r['nom'])}</td>",
                    f"<td>{barre(r['score'], 90)}</td>",
                    f"<td title='Part du poids total pour laquelle les données existent'>{r['confiance'] * 100:.0f} %</td>",
                    f"<td>{esc(statut)}</td>"]
        cellules += [f"<td>{barre(r['categories'].get(c), 44) if r['categories'].get(c) is not None else '<span class=nd>–</span>'}</td>" for c in CATEGORIES]
        lignes.append(f"<tr class='{'elimine' if r['elimine'] else ''}'>{''.join(cellules)}</tr>")
    entetes = ["Rang", "Titre", "Score", "Confiance", "Statut"] + CATEGORIES
    st.markdown("<table class='os'><tr>" + "".join(f"<th>{esc(x)}</th>" for x in entetes) + "</tr>" + "".join(lignes) + "</table>",
                unsafe_allow_html=True)
    st.caption("Mini-barres : note de 0 à 100 par catégorie, pondérée par les curseurs du profil (« – » : aucun ratio pondéré dans la catégorie). "
               "Un titre éliminé reste visible, en gris, avec la raison.")

    st.subheader("Justification")
    st.markdown(rapport.texte_justification(ELEMENTS, MENTION))
    c1, c2, c3 = st.columns(3)
    c1.download_button("Télécharger le classement (CSV)", rapport.csv_classement(RESULTATS, CATEGORIES),
                       file_name="classement.csv", mime="text/csv", use_container_width=True)
    try:
        pdf = rapport.pdf_one_sheet(ELEMENTS, CATEGORIES, MENTION, VERT)
        c2.download_button("Télécharger la fiche One Sheet (PDF)", pdf, file_name="one_sheet.pdf", mime="application/pdf",
                           use_container_width=True)
    except Exception as erreur:  # le PDF ne doit jamais bloquer l'application
        c2.warning(f"PDF non disponible : {erreur}")
    c3.download_button("Télécharger la justification (texte)", rapport.texte_justification(ELEMENTS, MENTION),
                       file_name="justification.md", mime="text/markdown", use_container_width=True)

# --------------------------------------------------------------------------- 2. Fiche entreprise

with onglets[1]:
    tickers = [r["ticker"] for r in RESULTATS]
    choix = st.selectbox("Titre", tickers, format_func=lambda t: f"{t} · {ENTREPRISES[t]['nom']}", key="fiche_titre")
    if choix:
        r, e = PAR_TICKER[choix], ENTREPRISES[choix]
        st.subheader(f"{e['nom']} ({choix})")
        st.caption(" · ".join(x for x in [e.get("secteur"), f"devise des états financiers : {e.get('devise_rapport', 'n.d.')}",
                                          "Éliminé : " + " ; ".join(r["raisons"]) if r["elimine"] else "Admissible"] if x))
        for a in e.get("avertissements", []):
            st.warning(a)

        def metrique(colonne, titre, cle, montant=True):
            c = e["champs"].get(cle) or {}
            v = c.get("valeur")
            texte = formater_montant(v) if montant else ("n.d." if v is None else formater(v) + " $")
            colonne.metric(titre, texte, help=infobulle(c.get("source", ""), c.get("date", "")))

        cols = st.columns(7)
        cols[0].metric("Score", "n.d." if r["score"] is None else f"{r['score']:.0f} / 100",
                       help=f"Confiance : {r['confiance'] * 100:.0f} % du poids couvert par des données")
        metrique(cols[1], "Prix", "prix_cad", montant=False)
        metrique(cols[2], "Capitalisation", "capitalisation_cad_m")
        metrique(cols[3], "Revenus 12 mois", "revenus_ttm_cad_m")
        metrique(cols[4], "FCF 12 mois", "fcf_ttm_cad_m")
        metrique(cols[5], "Bénéfice net", "benefice_net_ttm_cad_m")
        metrique(cols[6], "Dette totale", "dette_totale_cad_m")
        st.caption("Survolez le « ? » d'un chiffre ou une ligne du tableau pour voir la source et la date.")

        gauche, droite = st.columns([2, 3])
        with gauche:
            notes_cat = [r["categories_simples"].get(c) or 0 for c in CATEGORIES]
            fig = go.Figure(go.Scatterpolar(r=notes_cat + notes_cat[:1], theta=CATEGORIES + CATEGORIES[:1], fill="toself",
                                            line_color=VERT, fillcolor="rgba(31,92,85,0.25)", name=choix))
            fig.update_layout(polar=dict(radialaxis=dict(range=[0, 100], tickfont_size=9)), showlegend=False,
                              margin=dict(l=50, r=50, t=30, b=30), height=380)
            st.plotly_chart(fig, use_container_width=True)
            st.caption("Radar : moyenne simple des notes de chaque catégorie (indépendante des poids).")
        with droite:
            lignes = []
            for cat in CATEGORIES:
                lignes.append(f"<tr class='groupe'><td colspan='6'>{esc(cat)}</td></tr>")
                for d in [d for d in DEFINITIONS if d["categorie"] == cat]:
                    v = r["valeurs"][d["id"]]
                    n = r["notes"][d["id"]]
                    contrib = "–" if (POIDS[d["id"]] == 0 or n is None) else fr(r["contributions"][d["id"]], 1)
                    source_courte = v["source"][:70] + ("…" if len(v["source"]) > 70 else "")
                    lignes.append(
                        f"<tr title='{esc(infobulle(v['source'], v['date']))}'><td>{esc(d['nom'])}</td>"
                        f"<td class='{'nd' if v['valeur'] is None else ''}'>{formater(v['valeur'], d['format'])}</td>"
                        f"<td>{barre(n, 44)}</td><td>{POIDS[d['id']]:.0f}</td>"
                        f"<td>{contrib}</td>"
                        f"<td style='font-size:0.75rem;color:#5f6b6a'>{esc(source_courte) or 'n.d.'}</td></tr>")
            st.markdown("<div style='max-height:520px;overflow:auto'><table class='os'><tr><th>Ratio</th><th>Valeur</th><th>Note /100</th>"
                        "<th>Poids</th><th>Contribution (points)</th><th>Source</th></tr>" + "".join(lignes) + "</table></div>",
                        unsafe_allow_html=True)

        st.subheader("Événements récents")
        types_presents = sorted({ev["type"] for ev in e.get("evenements", [])})
        if not types_presents:
            st.info("Aucun événement disponible pour ce titre (les événements viennent des fichiers JSON OneSheet).")
        else:
            libelles = CONFIG.get("types_evenements", {})
            defaut = [t for t in ["acquisition", "litigation", "capital-return"] if t in types_presents] or types_presents
            types_choisis = st.multiselect("Types d'événements", types_presents, default=defaut,
                                           format_func=lambda t: libelles.get(t, t), key=f"types_{choix}")
            evenements = [ev for ev in e["evenements"] if ev["type"] in types_choisis][:15]
            st.caption("Résumés tirés tels quels des fichiers OneSheet (en anglais). 15 événements les plus récents.")
            for ev in evenements:
                st.markdown(f"**{ev['date'] or 'date n.d.'} · {libelles.get(ev['type'], ev['type'])}** : {ev['resume']}  \n"
                            f"<span style='color:#5f6b6a;font-size:0.8rem' title='{esc(ev['citation'])}'>Source : {esc(ev['source']) or 'n.d.'}</span>",
                            unsafe_allow_html=True)

# --------------------------------------------------------------------------- 3. Comparer

with onglets[2]:
    tickers = [r["ticker"] for r in RESULTATS]
    choisis = st.multiselect("Titres à comparer (2 ou 3)", tickers, default=tickers[:2], max_selections=3,
                             format_func=lambda t: f"{t} · {ENTREPRISES[t]['nom']}", key="comparer_titres")
    if len(choisis) < 2:
        st.info("Choisissez au moins deux titres.")
    else:
        meilleur_score = max((PAR_TICKER[x]["score"] or 0) for x in choisis)
        cellules_score = ""
        for t in choisis:
            sc = PAR_TICKER[t]["score"]
            cellules_score += (f"<td class='{'meilleur' if sc == meilleur_score else ''}'><b>{'n.d.' if sc is None else fr(sc, 0)}</b>"
                               f"{' (éliminé)' if PAR_TICKER[t]['elimine'] else ''}</td>")
        lignes = [f"<tr><td><b>Score global</b></td>{cellules_score}<td></td></tr>"]
        for cat in CATEGORIES:
            lignes.append(f"<tr class='groupe'><td colspan='{len(choisis) + 2}'>{esc(cat)}</td></tr>")
            for d in [d for d in DEFINITIONS if d["categorie"] == cat]:
                notes = {t: PAR_TICKER[t]["notes"][d["id"]] for t in choisis}
                valeurs = {t: PAR_TICKER[t]["valeurs"][d["id"]] for t in choisis}
                connues = [v["valeur"] for v in valeurs.values() if v["valeur"] is not None]
                # Le meilleur de la ligne : la meilleure valeur brute selon le sens du ratio (pas seulement la note plafonnée)
                meilleure = (max(connues) if d["sens"] == "haut" else min(connues)) if len(connues) >= 2 else None
                cellules = ""
                for t in choisis:
                    v = valeurs[t]
                    classe = "nd" if v["valeur"] is None else ("meilleur" if v["valeur"] == meilleure else "")
                    note_txt = "" if notes[t] is None else f" <span style='color:#5f6b6a;font-size:0.8rem'>({notes[t]:.0f})</span>"
                    cellules += f"<td class='{classe}' title='{esc(infobulle(v['source'], v['date']))}'>{formater(v['valeur'], d['format'])}{note_txt}</td>"
                lignes.append(f"<tr><td title='{esc(d['explication'])}'>{esc(d['nom'])}</td>{cellules}<td>{POIDS[d['id']]:.0f}</td></tr>")
        st.markdown("<table class='os'><tr><th>Ratio</th>" + "".join(f"<th>{esc(t)} · {esc(ENTREPRISES[t]['nom'])}</th>" for t in choisis)
                    + "<th>Poids</th></tr>" + "".join(lignes) + "</table>", unsafe_allow_html=True)
        st.caption("En vert : le meilleur de chaque ligne. Entre parenthèses : la note sur 100. Survolez une valeur pour voir sa source.")

        ordonnes = sorted(choisis, key=lambda t: -(PAR_TICKER[t]["score"] or -1))
        a = PAR_TICKER[ordonnes[0]]
        for autre in ordonnes[1:]:
            b = PAR_TICKER[autre]
            if a["score"] is None or b["score"] is None:
                continue
            st.subheader(f"Pourquoi {a['ticker']} devant {b['ticker']} ?")
            ecarts = pointage.expliquer_ecart(a, b, DEFINITIONS, 5)
            st.write(f"Écart de score : **{fr(a['score'] - b['score'], 1)} points** ({fr(a['score'], 1)} contre {fr(b['score'], 1)}). "
                     "Les 5 ratios qui expliquent le plus cet écart :")
            if not ecarts:
                st.info("Aucun écart : les deux titres ont les mêmes notes sur les ratios pondérés.")
                continue
            fig = go.Figure(go.Bar(
                x=[x["ecart"] for x in ecarts][::-1], y=[x["nom"] for x in ecarts][::-1], orientation="h",
                marker_color=[VERT if x["ecart"] > 0 else "#b45309" for x in ecarts][::-1],
                text=[f"{formater(x['valeur_a'], x['format'])} contre {formater(x['valeur_b'], x['format'])}" for x in ecarts][::-1],
                textposition="auto", hovertemplate="%{y} : %{x:.1f} points<extra></extra>"))
            fig.update_layout(height=260, margin=dict(l=10, r=10, t=10, b=30),
                              xaxis_title=f"Points d'écart en faveur de {a['ticker']} (négatif : en faveur de {b['ticker']})")
            st.plotly_chart(fig, use_container_width=True, key=f"ecart_{a['ticker']}_{b['ticker']}")
            if b["elimine"] and not a["elimine"]:
                st.caption(f"De plus, {b['ticker']} est éliminé : {' ; '.join(b['raisons'])}.")

# --------------------------------------------------------------------------- 4. Profils

with onglets[3]:
    st.write("Chaque titre noté sous tous les profils préréglés (poids, filtres et seuils d'origine de chaque profil).")
    seuils_origine = seuils_par_defaut(DEFINITIONS, TAUX_10ANS)
    par_profil = {p["id"]: pointage.classer(ENTREPRISES, DEFINITIONS, pointage.poids_du_profil(p, DEFINITIONS),
                                           pointage.seuils_du_profil(p, seuils_origine), p.get("filtres", []), CONFIG["filtres"])
                  for p in PROFILS}
    court = lambda p: p["nom"].split(",")[0]
    lignes = []
    for t in sorted(ENTREPRISES):
        cellules = f"<td><b>{esc(t)}</b> · {esc(ENTREPRISES[t]['nom'])}</td>"
        for p in PROFILS:
            res = next(r for r in par_profil[p["id"]] if r["ticker"] == t)
            premier = pointage.gagnant(par_profil[p["id"]])
            score = "n.d." if res["score"] is None else f"{res['score']:.0f}"
            if res["elimine"]:
                cellules += f"<td class='nd' title='{esc('Éliminé : ' + ' ; '.join(res['raisons']))}'><s>{score}</s> éliminé</td>"
            else:
                cellules += f"<td class='{'meilleur' if premier and premier['ticker'] == t else ''}' title='Confiance : {res['confiance'] * 100:.0f} %'>{score}</td>"
        lignes.append(f"<tr>{cellules}</tr>")
    gagnants = "".join(f"<td><b>{esc((pointage.gagnant(par_profil[p['id']]) or {}).get('ticker', '–'))}</b></td>" for p in PROFILS)
    lignes.append(f"<tr class='groupe'><td>Gagnant</td>{gagnants}</tr>")
    st.markdown("<table class='os'><tr><th>Titre</th>" + "".join(f"<th title='{esc(p['description'])}'>{esc(court(p))}</th>" for p in PROFILS)
                + "</tr>" + "".join(lignes) + "</table>", unsafe_allow_html=True)
    st.caption("En vert : le gagnant de chaque profil. Survolez un score pour voir la confiance ou la raison de l'élimination. " + MENTION)

# --------------------------------------------------------------------------- 5. Solidité du choix

with onglets[4]:
    n_sim = CONFIG.get("nb_simulations", 500)
    st.write(f"On refait le classement **{n_sim} fois** en faisant varier chaque poids au hasard de "
             f"±{CONFIG.get('amplitude_simulation', 0.5) * 100:.0f} %. Si le gagnant change souvent, le choix dépend trop des poids choisis.")
    if not SOLIDITE["gagnant"] or not SOLIDITE["frequences"]:
        st.info("Simulation impossible : aucun titre admissible ou aucun ratio pondéré.")
    else:
        pct = SOLIDITE["pct_gagnant"] * 100
        c1, c2 = st.columns([1, 2])
        c1.metric(f"{SOLIDITE['gagnant']} reste premier", f"{pct:.0f} %", help=f"Sur {n_sim} simulations")
        c1.write("Choix **très solide**." if pct >= 90 else "Choix **assez solide**." if pct >= 70 else "Choix **fragile** : il dépend des poids.")
        freq = sorted(SOLIDITE["frequences"].items(), key=lambda x: -x[1])
        fig = go.Figure(go.Bar(x=[t for t, _ in freq], y=[f * 100 for _, f in freq], marker_color=VERT,
                               text=[f"{f * 100:.0f} %" for _, f in freq], textposition="outside",
                               hovertemplate="%{x} : premier dans %{y:.0f} % des simulations<extra></extra>"))
        fig.update_layout(height=340, margin=dict(l=10, r=10, t=20, b=30), yaxis=dict(title="% des simulations en 1re place", range=[0, 110]))
        c2.plotly_chart(fig, use_container_width=True)
        st.caption("Seuls les titres admissibles participent. Les filtres éliminatoires et les seuils ne varient pas.")

# --------------------------------------------------------------------------- 6. Méthode

with onglets[5]:
    st.subheader("Comment le score est calculé")
    st.markdown("""
1. **Chaque ratio reçoit une note de 0 à 100.** Sous le seuil « mauvais », la note est 0 ; au-dessus du seuil « bon », elle est 100 ; entre les deux, elle augmente en ligne droite. Pour certains ratios (dette, P/E), plus bas = mieux : l'échelle est simplement inversée.
2. **Vous choisissez l'importance de chaque ratio** avec un curseur de 0 à 10. Un curseur à 0 exclut le ratio.
3. **Score global** = somme(poids × note) ÷ somme(poids des ratios disponibles). Si une donnée manque (« n.d. »), son poids est redistribué aux autres ratios.
4. **Confiance** = part du poids total pour laquelle on a des données. Un score élevé avec une confiance faible repose sur peu d'information.
5. **Filtres éliminatoires** : un titre qui échoue à un filtre coché est écarté du classement, mais reste visible en gris avec la raison.
6. **Solidité** : 500 simulations où chaque poids varie de ±50 % montrent si le gagnant dépend trop des poids choisis.
""")
    st.caption("Les seuils sont absolus (ils ne dépendent pas des autres titres) : l'outil fonctionne même pour un titre analysé seul.")
    for cat in CATEGORIES:
        st.subheader(cat)
        lignes = "".join(
            f"<tr><td><b>{esc(d['nom'])}</b></td><td>{esc(d['explication'])}</td><td>{esc(d['formule'])}</td>"
            f"<td>{formater(SEUILS[d['id']][0], d['format'])} → {formater(SEUILS[d['id']][1], d['format'])}</td>"
            f"<td>{'plus haut = mieux' if d['sens'] == 'haut' else 'plus bas = mieux'}</td></tr>"
            for d in DEFINITIONS if d["categorie"] == cat)
        st.markdown("<table class='os'><tr><th>Ratio</th><th>En une phrase</th><th>Formule</th><th>Seuils (mauvais → bon)</th><th>Sens</th></tr>"
                    + lignes + "</table>", unsafe_allow_html=True)
    st.subheader("Profils d'investisseur")
    for p in PROFILS:
        poids_p = sorted(p.get("poids", {}).items(), key=lambda x: -x[1])
        detail = ", ".join(f"{DEFS[i]['nom']} {v}" for i, v in poids_p if i in DEFS) or f"tous les ratios à {p.get('poids_defaut', 0)}"
        filtres_p = ", ".join(CONFIG["filtres"][f]["nom"] for f in p.get("filtres", [])) or "aucun"
        seuils_p = " ; ".join(f"{DEFS[i]['nom']} {formater(v[0], DEFS[i]['format'])} → {formater(v[1], DEFS[i]['format'])}"
                              for i, v in p.get("seuils", {}).items() if i in DEFS)
        if seuils_p:
            filtres_p += f". Seuils propres au profil : {seuils_p} ({p.get('note_seuils', '').rstrip('.')})"
        st.markdown(f"**{p['nom']}** : {p['description']}  \nPoids : {detail}. Filtres : {filtres_p}."
                    + (f"  \n*{MENTION}*" if p.get("inspire") else ""))

# --------------------------------------------------------------------------- 7. Données

with onglets[6]:
    st.subheader("Données brutes utilisées")
    lignes = [{"Titre": t, "Champ": cle, "Valeur": c["valeur"], "Source": c["source"], "Date": c["date"]}
              for t, e in ENTREPRISES.items() for cle, c in sorted(e["champs"].items())]
    tableau = pd.DataFrame(lignes)
    filtre_titres = st.multiselect("Filtrer par titre", sorted(ENTREPRISES), key="donnees_titres")
    if filtre_titres:
        tableau = tableau[tableau["Titre"].isin(filtre_titres)]
    st.dataframe(tableau, use_container_width=True, hide_index=True, height=380)
    st.caption("Montants en millions de dollars canadiens (champs « _cad_m »). Les pourcentages sont en décimales (0,05 = 5 %). "
               f"Taux de change utilisés : 1 USD = {fr(TAUX['USD'], 4)} CAD, 1 EUR = {fr(TAUX['EUR'], 4)} CAD.")

    st.subheader("Rapport des valeurs manquantes")
    manquants = pd.DataFrame(
        {r["ticker"]: {DEFS[i]["nom"]: ("n.d." if v["valeur"] is None else "✓") for i, v in r["valeurs"].items()} for r in RESULTATS})
    manquants["Titres sans donnée"] = (manquants == "n.d.").sum(axis=1)
    total_nd = int(manquants["Titres sans donnée"].sum())
    st.write(f"**{total_nd} valeurs manquantes** sur {len(DEFINITIONS) * len(RESULTATS)} "
             f"({len(DEFINITIONS)} ratios × {len(RESULTATS)} titres).")
    st.dataframe(manquants.sort_values("Titres sans donnée", ascending=False), use_container_width=True, height=380)
    st.caption("Un ratio « n.d. » ne compte pas dans le score : son poids est redistribué et l'indice de confiance baisse.")

st.markdown(f"<div class='pied'>{rapport.PIED_DE_PAGE}</div>", unsafe_allow_html=True)

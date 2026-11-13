"""
donnees.py : chargement des données financières.

Trois sources, toutes ramenées au même format :
  A. les fichiers JSON OneSheet (dossier Data/) + le CSV de marché (Analyse/donnees_marche.csv) ;
  B. yfinance, pour ajouter n'importe quel autre ticker ;
  C. un fichier CSV ou JSON téléversé par l'utilisateur.

Format commun d'une entreprise :
  {
    "ticker": "CSU", "nom": "...", "secteur": "...", "devise_rapport": "USD",
    "champs": {"roic": {"valeur": 0.1862, "source": "...", "date": "2026-11-12"}, ...},
    "evenements": [{"type", "date", "resume", "source", "citation"}, ...],
    "avertissements": ["..."],
  }

Les noms de champs sont ceux des colonnes du CSV de marché. Les montants sont en millions de CAD.
"""
from __future__ import annotations

import csv
import io
import json
import math
from pathlib import Path

import streamlit as st  # seulement pour le cache des appels réseau

DOSSIER = Path(__file__).parent
DOSSIER_JSON = DOSSIER / "Data"
FICHIER_MARCHE = DOSSIER / "Analyse" / "donnees_marche.csv"
FICHIER_CONFIG = DOSSIER / "config.json"

# Colonnes du CSV qui ne sont pas des nombres
COLONNES_TEXTE = {"ticker", "nom", "secteur", "devise_bilan", "devise_rapport", "periode_acquisitions", "source", "date"}

# Suffixe Yahoo Finance selon la Bourse
SUFFIXES_BOURSE = {"TSX": ".TO", "TSXV": ".V", "NEO": ".NE", "CSE": ".CN"}

# Champs qu'on accepte de compléter par yfinance pour les entreprises déjà fournies (on ne touche pas au reste)
CHAMPS_COMPLEMENT = ["marge_brute", "rendement_6mois", "ecart_mm200", "volatilite"]


def charger_config() -> dict:
    """Lit config.json (taux, filtres, etc.)."""
    return json.loads(FICHIER_CONFIG.read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- outils

def nombre(x):
    """Convertit en float ; renvoie None si la donnée manque ou n'est pas un nombre."""
    if x is None or isinstance(x, bool):
        return None
    try:
        v = float(str(x).replace(",", ".")) if isinstance(x, str) else float(x)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(v) or math.isinf(v)) else v


def champ(valeur, source: str, date: str = "") -> dict:
    """Une valeur avec sa source et sa date."""
    return {"valeur": valeur, "source": source, "date": date or ""}


def nouvelle_entreprise(ticker: str, nom: str = "", secteur: str = "", devise: str = "CAD") -> dict:
    return {"ticker": ticker.upper(), "nom": nom or ticker.upper(), "secteur": secteur, "devise_rapport": devise,
            "champs": {}, "evenements": [], "avertissements": []}


def taux_de(devise: str, taux: dict, avertissements: list | None = None) -> float:
    """Taux de conversion d'une devise vers le CAD. Devise inconnue : 1,0 avec un avertissement."""
    devise = (devise or "CAD").upper()
    if devise in taux:
        return float(taux[devise])
    if avertissements is not None:
        avertissements.append(f"Devise {devise} sans taux de change : valeurs laissées telles quelles.")
    return 1.0


def fusionner(base: dict, complement: dict, seulement: list | None = None) -> dict:
    """Ajoute à `base` les champs de `complement` qui lui manquent (la base a priorité)."""
    for cle, c in complement.get("champs", {}).items():
        if seulement is not None and cle not in seulement:
            continue
        if cle not in base["champs"] or base["champs"][cle]["valeur"] is None:
            base["champs"][cle] = c
    if not base.get("evenements"):
        base["evenements"] = complement.get("evenements", [])
    for cle in ("nom", "secteur", "devise_rapport", "symbole_yahoo"):
        if not base.get(cle) and complement.get(cle):
            base[cle] = complement[cle]
    base["avertissements"] = base.get("avertissements", []) + complement.get("avertissements", [])
    return base


# --------------------------------------------------------------------------- source A : CSV de marché

def lire_csv_marche(texte: str, source_defaut: str = "CSV de marché") -> dict:
    """Lit un CSV au format de donnees_marche.csv. Renvoie {ticker: entreprise}. Montants déjà en CAD."""
    entreprises = {}
    for ligne in csv.DictReader(io.StringIO(texte)):
        ticker = (ligne.get("ticker") or "").strip().upper()
        if not ticker:
            continue
        e = nouvelle_entreprise(ticker, ligne.get("nom", ""), ligne.get("secteur", ""), ligne.get("devise_rapport") or "CAD")
        source = ligne.get("source") or source_defaut
        date = ligne.get("date") or ""
        for colonne, brut in ligne.items():
            if colonne in COLONNES_TEXTE or colonne is None:
                continue
            valeur = nombre(brut)
            if valeur is not None:
                e["champs"][colonne] = champ(valeur, source, date)
        entreprises[ticker] = e
    return entreprises


# --------------------------------------------------------------------------- source A : JSON OneSheet

def _source_json(mv: dict, periode: dict) -> str:
    """Texte de source d'une valeur du JSON OneSheet (dépôt réglementaire)."""
    s = (mv.get("sources") or [{}])[0]
    morceaux = ["JSON OneSheet", s.get("source", ""), s.get("formType", "")]
    return " · ".join(m for m in morceaux if m) + f" (période {periode.get('reportDate', '?')})"


def lire_json_onesheet(contenu: dict, taux: dict) -> dict:
    """Transforme un fichier JSON OneSheet (company-profile-consumer-v2) en entreprise. Convertit en CAD."""
    doc = contenu.get("document", contenu)
    identite = doc.get("profile", {}).get("identity", {})
    cotations = identite.get("listings") or [{}]
    ticker = (cotations[0].get("symbol") or contenu.get("companyKey") or "?").upper()
    devise = identite.get("reportingCurrency") or "CAD"
    e = nouvelle_entreprise(ticker, identite.get("name", ""), "", devise)
    e["symbole_yahoo"] = ticker + SUFFIXES_BOURSE.get(cotations[0].get("exchange", ""), "")
    fx = taux_de(devise, taux, e["avertissements"])

    periodes = sorted(doc.get("data", []), key=lambda p: p.get("reportDate", ""), reverse=True)
    annuelles = [p for p in periodes if p.get("periodType") == "Annual"]
    trimestres = [p for p in periodes if p.get("periodType") == "Quarterly"]
    ponctuelles = [p for p in periodes if p.get("periodType") == "PointInTime"]

    def valeur(p, cle):
        return nombre((p.get("metricValues", {}).get(cle) or {}).get("value"))

    def poser(nom_champ, v, p, cle, facteur=1.0):
        if v is not None:
            e["champs"][nom_champ] = champ(v * facteur, _source_json(p["metricValues"][cle], p),
                                           p.get("lastSourceFilingDate") or p.get("reportDate", ""))

    # Flux sur 12 mois : somme des 4 derniers trimestres si complets, sinon dernier exercice annuel
    flux = {"revenue": "revenus_ttm_cad_m", "net_income": "benefice_net_ttm_cad_m", "free_cash_flow": "fcf_ttm_cad_m",
            "operating_cash_flow": "flux_exploitation_ttm_cad_m", "capex": "capex_ttm_cad_m",
            "operating_income": "resultat_exploitation_ttm_cad_m"}
    for cle, nom_champ in flux.items():
        quatre = [valeur(p, cle) for p in trimestres[:4]]
        if len(quatre) == 4 and all(v is not None for v in quatre):
            e["champs"][nom_champ] = champ(sum(quatre) * fx / 1e6, f"JSON OneSheet · somme des 4 derniers trimestres ({cle})",
                                           trimestres[0].get("reportDate", ""))
        else:
            for p in annuelles:
                if valeur(p, cle) is not None:
                    poser(nom_champ, valeur(p, cle), p, cle, fx / 1e6)
                    break

    # Bilan : dernière valeur connue
    for cle, nom_champ in {"debt": "dette_totale_cad_m", "cash": "tresorerie_cad_m"}.items():
        for p in ponctuelles:
            if valeur(p, cle) is not None:
                poser(nom_champ, valeur(p, cle), p, cle, fx / 1e6)
                break

    # Bénéfice par action : exercice le plus récent et le plus ancien (3 ans d'écart au maximum)
    bpa = [(p, valeur(p, "eps")) for p in annuelles if valeur(p, "eps") is not None]
    if len(bpa) >= 2:
        recent = bpa[0]
        anciens = [x for x in bpa[1:] if recent[0]["fiscalYear"] - x[0]["fiscalYear"] <= 3]
        if anciens:
            ancien = anciens[-1]
            poser("bpa_recent", recent[1], recent[0], "eps")
            poser("bpa_ancien", ancien[1], ancien[0], "eps")
            e["champs"]["bpa_nb_annees"] = champ(float(recent[0]["fiscalYear"] - ancien[0]["fiscalYear"]), "JSON OneSheet",
                                                 recent[0].get("reportDate", ""))

    # Marge brute : bénéfice brut et revenus du même exercice annuel
    for p in annuelles:
        brut = valeur(p, "gross_margin") if valeur(p, "gross_margin") is not None else valeur(p, "gross_profit")
        cle_brut = "gross_margin" if valeur(p, "gross_margin") is not None else "gross_profit"
        if brut is not None and valeur(p, "revenue"):
            poser("benefice_brut_cad_m", brut, p, cle_brut, fx / 1e6)
            poser("revenus_annuels_cad_m", valeur(p, "revenue"), p, "revenue", fx / 1e6)
            break

    # Dividende annuel par action et croissance organique (dernier exercice annuel)
    for cle, nom_champ, facteur in [("dividends_per_share", "dividende_par_action_cad", fx),
                                    ("organic_growth_change_pct", "croissance_organique_recente", 1.0),
                                    ("organic_net_revenue_growth_change_pct", "croissance_organique_recente", 1.0)]:
        for p in annuelles:
            if valeur(p, cle) is not None and nom_champ not in e["champs"]:
                poser(nom_champ, valeur(p, cle), p, cle, facteur)
                break

    # Événements datés et sourcés
    for ev in doc.get("events", []):
        src = (ev.get("sources") or [{}])[0]
        date = (ev.get("date") or {}).get("occurredOn") or src.get("filedOn") or ""
        e["evenements"].append({
            "type": ev.get("type", ""),
            "date": date,
            "resume": ev.get("summary", ""),
            "source": " · ".join(x for x in [src.get("source", ""), src.get("formType", ""), src.get("filedOn", "")] if x),
            "citation": src.get("quote", ""),
        })
    e["evenements"].sort(key=lambda x: x["date"], reverse=True)
    return e


def charger_base(taux: dict) -> dict:
    """Source A : fusionne le CSV de marché (prioritaire) et les JSON OneSheet, par ticker."""
    entreprises = {}
    if FICHIER_MARCHE.exists():
        entreprises = lire_csv_marche(FICHIER_MARCHE.read_text(encoding="utf-8"))
    for fichier in sorted(DOSSIER_JSON.glob("*.json")):
        try:
            e_json = lire_json_onesheet(json.loads(fichier.read_text(encoding="utf-8")), taux)
        except Exception as erreur:  # un fichier abîmé ne doit pas faire planter l'application
            entreprises.setdefault("?", nouvelle_entreprise("?"))["avertissements"].append(f"{fichier.name} illisible : {erreur}")
            continue
        t = e_json["ticker"]
        if t in entreprises:
            nom_csv = entreprises[t]["nom"]
            fusionner(entreprises[t], e_json)
            entreprises[t]["evenements"] = e_json["evenements"]
            entreprises[t]["symbole_yahoo"] = e_json["symbole_yahoo"]
            entreprises[t]["nom"] = nom_csv
        else:
            entreprises[t] = e_json
    entreprises.pop("?", None)
    return entreprises


# --------------------------------------------------------------------------- source B : yfinance

def indicateurs_prix(cours: list) -> dict:
    """Momentum et risque à partir d'une liste de cours de clôture quotidiens (du plus ancien au plus récent)."""
    cours = [c for c in cours if c is not None and c > 0]
    resultat = {}
    if len(cours) > 126:  # environ 6 mois de Bourse
        resultat["rendement_6mois"] = cours[-1] / cours[-127] - 1
    if len(cours) >= 200:
        resultat["ecart_mm200"] = cours[-1] / (sum(cours[-200:]) / 200) - 1
    if len(cours) > 60:
        recents = cours[-253:]
        rendements = [math.log(b / a) for a, b in zip(recents[:-1], recents[1:])]
        moyenne = sum(rendements) / len(rendements)
        variance = sum((r - moyenne) ** 2 for r in rendements) / (len(rendements) - 1)
        resultat["volatilite"] = math.sqrt(variance) * math.sqrt(252)
    return resultat


@st.cache_data(ttl=3600, show_spinner=False)
def telecharger_yfinance(symbole: str) -> dict:
    """Appel réseau (mis en cache 1 h). Renvoie des données brutes simples, ou {"erreur": "..."} sans jamais planter."""
    try:
        import yfinance as yf
        t = yf.Ticker(symbole)
        historique = t.history(period="2y", auto_adjust=True)
        if historique is None or historique.empty:
            return {"erreur": f"Aucune donnée trouvée pour « {symbole} ». Vérifiez le symbole (ex. SHOP.TO, DOL.TO, AAPL)."}
        brut = {"symbole": symbole, "cours": [nombre(c) for c in historique["Close"].tolist()],
                "date": str(historique.index[-1].date()), "info": {}, "etats": {}}
        try:
            brut["info"] = {k: v for k, v in (t.info or {}).items() if isinstance(v, (int, float, str))}
        except Exception:
            pass
        for nom, attribut in [("resultats", "income_stmt"), ("bilan", "balance_sheet"), ("flux", "cashflow")]:
            try:
                df = getattr(t, attribut)
                brut["etats"][nom] = {str(i): [nombre(v) for v in df.loc[i].tolist()] for i in df.index}
            except Exception:
                brut["etats"][nom] = {}
        return brut
    except Exception as erreur:
        return {"erreur": f"yfinance n'a pas pu charger « {symbole} » : {erreur}"}


def entreprise_depuis_yfinance(brut: dict, taux: dict) -> dict:
    """Transforme les données brutes yfinance en entreprise, convertie en CAD."""
    info, etats = brut.get("info", {}), brut.get("etats", {})
    symbole = brut["symbole"].upper()
    e = nouvelle_entreprise(symbole.split(".")[0], info.get("longName") or info.get("shortName") or symbole,
                            info.get("industry") or info.get("sector") or "", info.get("financialCurrency") or "CAD")
    e["symbole_yahoo"] = symbole
    source, date = f"Yahoo Finance (yfinance) · {symbole}", brut.get("date", "")
    fx_prix = taux_de(info.get("currency") or "CAD", taux, e["avertissements"])
    fx_fin = taux_de(info.get("financialCurrency") or info.get("currency") or "CAD", taux, e["avertissements"])

    def poser(nom_champ, v, facteur=1.0, note=""):
        v = nombre(v)
        if v is not None:
            e["champs"][nom_champ] = champ(v * facteur, source + note, date)

    def ligne(etat, noms, i=0):
        """Valeur d'une ligne d'un état financier (colonne 0 = exercice le plus récent)."""
        for n in noms:
            serie = etats.get(etat, {}).get(n)
            if serie and len(serie) > i and serie[i] is not None:
                return serie[i]
        return None

    cours = brut.get("cours", [])
    poser("prix_cad", info.get("currentPrice") or (cours[-1] if cours else None), fx_prix)
    poser("capitalisation_cad_m", info.get("marketCap"), fx_prix / 1e6)
    poser("valeur_entreprise_cad_m", info.get("enterpriseValue"), fx_prix / 1e6)
    poser("actions_m", info.get("sharesOutstanding"), 1e-6)
    poser("pe", info.get("trailingPE"))
    poser("pe_prevu", info.get("forwardPE"))
    poser("roe", info.get("returnOnEquity"))
    poser("beta", info.get("beta"))
    poser("ratio_liquidite", info.get("currentRatio"))
    poser("marge_brute", info.get("grossMargins"))
    poser("rendement_dividende", info.get("trailingAnnualDividendYield") or 0.0)
    poser("revenus_ttm_cad_m", info.get("totalRevenue"), fx_fin / 1e6)
    poser("benefice_net_ttm_cad_m", info.get("netIncomeToCommon"), fx_fin / 1e6)
    poser("flux_exploitation_ttm_cad_m", info.get("operatingCashflow"), fx_fin / 1e6)
    poser("tresorerie_cad_m", info.get("totalCash"), fx_fin / 1e6)
    poser("dette_totale_cad_m", info.get("totalDebt"), fx_fin / 1e6)

    # États financiers annuels (dernier exercice)
    ebit = ligne("resultats", ["EBIT", "Operating Income"])
    fcf = ligne("flux", ["Free Cash Flow"]) or info.get("freeCashflow")
    capex = ligne("flux", ["Capital Expenditure"])
    capitaux = ligne("bilan", ["Stockholders Equity", "Common Stock Equity"])
    actifs = ligne("bilan", ["Total Assets"])
    poser("resultat_exploitation_ttm_cad_m", ebit, fx_fin / 1e6, " (dernier exercice)")
    poser("fcf_ttm_cad_m", fcf, fx_fin / 1e6, " (dernier exercice)")
    poser("capex_ttm_cad_m", abs(capex) if capex is not None else None, fx_fin / 1e6, " (dernier exercice)")
    poser("capitaux_propres_cad_m", capitaux, fx_fin / 1e6)
    poser("goodwill_m", ligne("bilan", ["Goodwill"]) or 0.0, 1e-6)
    poser("actifs_totaux_m", actifs, 1e-6)

    interets = ligne("resultats", ["Interest Expense", "Interest Expense Non Operating"])
    if ebit is not None and interets:
        poser("couverture_interets", ebit / abs(interets))
    dette = nombre(info.get("totalDebt"))
    if ebit is not None and capitaux is not None and dette is not None and (dette + capitaux) > 0:
        poser("roic", ebit * (1 - 0.265) / (dette + capitaux), 1.0, " · calcul approximatif (impôt de 26,5 %)")

    # Variation du nombre d'actions, croissance des revenus (3 dernières années), BPA
    a0, a1 = ligne("bilan", ["Ordinary Shares Number", "Share Issued"], 0), ligne("bilan", ["Ordinary Shares Number", "Share Issued"], 1)
    if a0 and a1:
        poser("variation_actions_1an", a0 / a1 - 1)
    revenus = [ligne("resultats", ["Total Revenue"], i) for i in range(4)]
    for i, annee in enumerate(["2025", "2024", "2023"]):  # mêmes noms de champs que le CSV : du plus récent au plus ancien
        if revenus[i] and revenus[i + 1]:
            poser(f"croissance_revenus_{annee}", revenus[i] / revenus[i + 1] - 1)
    bpa = [ligne("resultats", ["Diluted EPS", "Basic EPS"], i) for i in range(4)]
    connus = [(i, b) for i, b in enumerate(bpa) if b is not None]
    if len(connus) >= 2:
        poser("bpa_recent", connus[0][1])
        poser("bpa_ancien", connus[-1][1])
        poser("bpa_nb_annees", connus[-1][0] - connus[0][0])

    # Altman Z (formule classique), si le bilan est complet
    try:
        fonds = ligne("bilan", ["Working Capital"])
        reserves = ligne("bilan", ["Retained Earnings"])
        passifs = ligne("bilan", ["Total Liabilities Net Minority Interest"])
        ventes = ligne("resultats", ["Total Revenue"])
        cap = nombre(info.get("marketCap")) * fx_prix / fx_fin
        z = 1.2 * fonds / actifs + 1.4 * reserves / actifs + 3.3 * ebit / actifs + 0.6 * cap / passifs + 1.0 * ventes / actifs
        poser("altman_z", z, 1.0, " · calculé à partir du bilan")
    except (TypeError, ZeroDivisionError):
        pass

    for cle, v in indicateurs_prix(cours).items():
        poser(cle, v, 1.0, " · historique de prix")
    return e


def charger_ticker_yfinance(symbole: str, taux: dict):
    """Source B. Renvoie (entreprise, None) ou (None, message d'erreur)."""
    symbole = (symbole or "").strip().upper()
    if not symbole:
        return None, "Entrez un symbole (ex. SHOP.TO)."
    brut = telecharger_yfinance(symbole)
    if "erreur" in brut:
        return None, brut["erreur"]
    try:
        return entreprise_depuis_yfinance(brut, taux), None
    except Exception as erreur:
        return None, f"Données yfinance inutilisables pour « {symbole} » : {erreur}"


def completer_avec_yfinance(entreprises: dict, taux: dict) -> list:
    """Ajoute aux entreprises de base l'historique de prix (momentum) et la marge brute. Renvoie les messages d'erreur."""
    erreurs = []
    for e in entreprises.values():
        symbole = e.get("symbole_yahoo")
        if not symbole or all(c in e["champs"] for c in CHAMPS_COMPLEMENT):
            continue
        complement, erreur = charger_ticker_yfinance(symbole, taux)
        if erreur:
            erreurs.append(erreur)
        else:
            complement["avertissements"] = []
            fusionner(e, complement, seulement=CHAMPS_COMPLEMENT)
    return erreurs


# --------------------------------------------------------------------------- source C : téléversement

def lire_televersement(nom_fichier: str, octets: bytes, taux: dict):
    """Source C. Accepte un CSV (format donnees_marche.csv) ou un JSON OneSheet. Renvoie ({ticker: entreprise}, erreur)."""
    try:
        texte = octets.decode("utf-8-sig")
        if nom_fichier.lower().endswith(".json"):
            e = lire_json_onesheet(json.loads(texte), taux)
            return {e["ticker"]: e}, None
        entreprises = lire_csv_marche(texte, source_defaut=f"Fichier téléversé ({nom_fichier})")
        if not entreprises:
            return {}, "Aucune ligne lisible : le CSV doit avoir une colonne « ticker » et les colonnes de donnees_marche.csv."
        return entreprises, None
    except Exception as erreur:
        return {}, f"Fichier « {nom_fichier} » illisible : {erreur}"

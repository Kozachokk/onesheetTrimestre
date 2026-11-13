/**
 * donnees.js : chargement des données, toutes ramenées au même format.
 *
 * Sources :
 *   - src/data/*.json          fichiers OneSheet (états financiers, événements, entités) ;
 *   - src/data/donnees_marche.csv   données de marché en CAD (stockanalysis.com) ;
 *   - src/data/prix.json       instantané des cours (Yahoo Finance), car un navigateur ne peut pas interroger Yahoo.
 *
 * Format d'une entreprise :
 *   { ticker, nom, secteur, deviseRapport, bourse, description,
 *     champs: { roic: { valeur, source, date, url, citation } },
 *     evenements: [...], entites: [...], periodes: [...] }
 * Les noms de champs sont ceux des colonnes du CSV. Les montants sont en millions de CAD.
 */
import { nombre } from './format.js';

const COLONNES_TEXTE = new Set(['ticker', 'nom', 'secteur', 'devise_bilan', 'devise_rapport', 'periode_acquisitions', 'source', 'date']);
const URL_SEDAR = 'https://www.sedarplus.ca/';

export function champ(valeur, source, date = '', extra = {}) {
  return { valeur, source, date: date || '', ...extra };
}

export function tauxDe(devise, taux) {
  return taux[(devise || 'CAD').toUpperCase()] ?? 1;
}

/** Lit une ligne CSV simple (gère les guillemets). */
export function decouperLigneCsv(ligne) {
  const cellules = [];
  let courant = '';
  let entreGuillemets = false;
  for (let i = 0; i < ligne.length; i += 1) {
    const c = ligne[i];
    if (c === '"') {
      if (entreGuillemets && ligne[i + 1] === '"') { courant += '"'; i += 1; } else entreGuillemets = !entreGuillemets;
    } else if (c === ',' && !entreGuillemets) { cellules.push(courant); courant = ''; } else courant += c;
  }
  cellules.push(courant);
  return cellules;
}

/** CSV de marché → { ticker: entreprise }. Les montants sont déjà en CAD. */
export function lireCsvMarche(texte) {
  const lignes = texte.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const entetes = decouperLigneCsv(lignes[0]);
  const entreprises = {};
  lignes.slice(1).forEach((ligne) => {
    const cellules = decouperLigneCsv(ligne);
    const brut = Object.fromEntries(entetes.map((e, i) => [e, cellules[i] ?? '']));
    const ticker = (brut.ticker || '').trim().toUpperCase();
    if (!ticker) return;
    const e = { ticker, nom: brut.nom || ticker, secteur: brut.secteur || '', deviseRapport: brut.devise_rapport || 'CAD',
      deviseBilan: brut.devise_bilan || 'CAD', champs: {}, evenements: [], entites: [], periodes: [] };
    entetes.forEach((colonne) => {
      if (COLONNES_TEXTE.has(colonne)) return;
      const v = nombre(brut[colonne]);
      if (v !== null) e.champs[colonne] = champ(v, brut.source || 'CSV de marché', brut.date);
    });
    entreprises[ticker] = e;
  });
  return entreprises;
}

function sourceJson(mv, periode) {
  const s = (mv.sources || [])[0] || {};
  return {
    source: ['JSON OneSheet', s.source, s.formType].filter(Boolean).join(' · ') + ` (période ${periode.reportDate || '?'})`,
    date: s.filedOn || periode.lastSourceFilingDate || periode.reportDate || '',
    extra: { url: URL_SEDAR, citation: s.quote || '' },
  };
}

/** Fichier JSON OneSheet → entreprise partielle, convertie en CAD. */
export function lireJsonOneSheet(contenu, taux) {
  const doc = contenu.document || contenu;
  const identite = doc.profile?.identity || {};
  const cotation = (identite.listings || [{}])[0];
  const devise = identite.reportingCurrency || 'CAD';
  const fx = tauxDe(devise, taux);
  const e = { ticker: (cotation.symbol || contenu.companyKey || '?').toUpperCase(), nom: identite.name || '', secteur: '',
    deviseRapport: devise, bourse: cotation.exchange || '', description: doc.profile?.overview?.description || '',
    champs: {}, evenements: [], entites: [], periodes: doc.data || [] };

  const periodes = [...e.periodes].sort((a, b) => (a.reportDate < b.reportDate ? 1 : -1));
  const annuelles = periodes.filter((p) => p.periodType === 'Annual');
  const trimestres = periodes.filter((p) => p.periodType === 'Quarterly');
  const ponctuelles = periodes.filter((p) => p.periodType === 'PointInTime');
  const valeur = (p, cle) => nombre(p?.metricValues?.[cle]?.value);
  const poser = (nom, v, p, cle, facteur = 1) => {
    if (v === null || v === undefined) return;
    const s = sourceJson(p.metricValues[cle], p);
    e.champs[nom] = champ(v * facteur, s.source, s.date, s.extra);
  };
  const premiere = (liste, cle) => liste.find((p) => valeur(p, cle) !== null);

  // Flux sur 12 mois : somme des 4 derniers trimestres si complets, sinon dernier exercice annuel
  const flux = { revenue: 'revenus_ttm_cad_m', net_income: 'benefice_net_ttm_cad_m', free_cash_flow: 'fcf_ttm_cad_m',
    operating_cash_flow: 'flux_exploitation_ttm_cad_m', capex: 'capex_ttm_cad_m', operating_income: 'resultat_exploitation_ttm_cad_m',
    adjusted_ebitda: 'baiia_ajuste_ttm_cad_m' };
  Object.entries(flux).forEach(([cle, nom]) => {
    const quatre = trimestres.slice(0, 4).map((p) => valeur(p, cle));
    if (quatre.length === 4 && quatre.every((v) => v !== null)) {
      e.champs[nom] = champ((quatre.reduce((a, b) => a + b, 0) * fx) / 1e6,
        `JSON OneSheet · somme des 4 derniers trimestres (${cle})`, trimestres[0].reportDate, { url: URL_SEDAR });
    } else {
      const p = premiere(annuelles, cle);
      if (p) poser(nom, valeur(p, cle), p, cle, fx / 1e6);
    }
  });

  // Bilan : dernière valeur connue
  [['debt', 'dette_totale_cad_m', fx / 1e6], ['cash', 'tresorerie_cad_m', fx / 1e6], ['employees', 'employes', 1]].forEach(([cle, nom, f]) => {
    const p = premiere(ponctuelles, cle);
    if (p) poser(nom, valeur(p, cle), p, cle, f);
  });

  // Deux derniers exercices annuels : sert aux croissances (bénéfice, FCF, dividende, BPA)
  [['net_income', 'benefice_net', fx / 1e6], ['free_cash_flow', 'fcf', fx / 1e6], ['dividends_per_share', 'dividende_par_action', fx],
    ['revenue', 'revenus', fx / 1e6]].forEach(([cle, nom, f]) => {
    const avec = annuelles.filter((p) => valeur(p, cle) !== null);
    if (avec[0]) poser(`${nom}_exercice_recent`, valeur(avec[0], cle), avec[0], cle, f);
    if (avec[1]) poser(`${nom}_exercice_precedent`, valeur(avec[1], cle), avec[1], cle, f);
  });

  // BPA : exercice le plus récent et le plus ancien (3 ans d'écart au maximum)
  const bpa = annuelles.filter((p) => valeur(p, 'eps') !== null);
  if (bpa.length >= 2) {
    const anciens = bpa.slice(1).filter((p) => bpa[0].fiscalYear - p.fiscalYear <= 3);
    const ancien = anciens[anciens.length - 1];
    if (ancien) {
      poser('bpa_recent', valeur(bpa[0], 'eps'), bpa[0], 'eps');
      poser('bpa_ancien', valeur(ancien, 'eps'), ancien, 'eps');
      e.champs.bpa_nb_annees = champ(bpa[0].fiscalYear - ancien.fiscalYear, 'JSON OneSheet', bpa[0].reportDate);
    }
  }

  // Marge brute : bénéfice brut et revenus du même exercice
  const pBrut = annuelles.find((p) => (valeur(p, 'gross_margin') ?? valeur(p, 'gross_profit')) !== null && valeur(p, 'revenue'));
  if (pBrut) {
    const cle = valeur(pBrut, 'gross_margin') !== null ? 'gross_margin' : 'gross_profit';
    poser('benefice_brut_cad_m', valeur(pBrut, cle), pBrut, cle, fx / 1e6);
    poser('revenus_annuels_cad_m', valeur(pBrut, 'revenue'), pBrut, 'revenue', fx / 1e6);
  }

  // Croissance organique (dernier exercice annuel)
  ['organic_growth_change_pct', 'organic_net_revenue_growth_change_pct'].forEach((cle) => {
    const p = premiere(annuelles, cle);
    if (p && !e.champs.croissance_organique_recente) poser('croissance_organique_recente', valeur(p, cle), p, cle);
  });

  // Événements datés et sourcés
  e.evenements = (doc.events || []).map((ev) => {
    const src = (ev.sources || [])[0] || {};
    return { type: ev.type || '', date: ev.date?.occurredOn || src.filedOn || '', resume: ev.summary || '',
      entite: ev.entity?.name || '', lies: (ev.related || []).map((r) => r.name), attributs: ev.attributes || {},
      source: [src.source, src.formType, src.filedOn].filter(Boolean).join(' · '), citation: src.quote || '', url: URL_SEDAR };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));

  // Entités : segments, filiales, projets (document.profile.entities), sauf l'entreprise elle-même
  e.entites = (doc.profile?.entities || []).filter((x) => x.kind !== 'company').map((x) => ({
    nom: x.name, type: x.kind, description: x.description || '',
    parent: (x.path || []).slice(-2, -1)[0]?.name || e.nom,
  }));
  return e;
}

/** Ajoute à `base` les champs de `complement` qui lui manquent (la base a priorité). */
export function fusionner(base, complement) {
  Object.entries(complement.champs).forEach(([cle, c]) => {
    if (!base.champs[cle] || base.champs[cle].valeur === null) base.champs[cle] = c;
  });
  ['evenements', 'entites', 'periodes'].forEach((k) => { if (!base[k]?.length) base[k] = complement[k] || []; });
  ['bourse', 'description', 'deviseRapport'].forEach((k) => { if (!base[k]) base[k] = complement[k]; });
  return base;
}

/** Fusionne CSV (prioritaire), JSON OneSheet et instantané de prix, par ticker. */
export function construireBase({ csv, jsons, prix = {}, taux }) {
  const entreprises = csv ? lireCsvMarche(csv) : {};
  jsons.forEach((contenu) => {
    const e = lireJsonOneSheet(contenu, taux);
    if (entreprises[e.ticker]) fusionner(entreprises[e.ticker], e);
    else entreprises[e.ticker] = e;
  });
  Object.values(entreprises).forEach((e) => {
    const bourse = (e.bourse || 'TSX').toLowerCase();
    const urlMarche = `https://stockanalysis.com/quote/${bourse}/${e.ticker}/`;
    Object.values(e.champs).forEach((c) => { if (!c.url && c.source.includes('stockanalysis')) c.url = urlMarche; });
    const p = prix[e.ticker];
    if (!p) return;
    ['rendement_6mois', 'ecart_mm200', 'volatilite', 'haut_52_semaines', 'bas_52_semaines', 'marge_brute', 'employes'].forEach((cle) => {
      if (p[cle] !== null && p[cle] !== undefined && !e.champs[cle]) e.champs[cle] = champ(p[cle], p.source, p.date, { url: p.url });
    });
  });
  return entreprises;
}

/** Charge les données livrées avec le site. */
export async function chargerBase(taux) {
  const modules = import.meta.glob('../data/*.json', { eager: true, import: 'default' });
  const jsons = Object.entries(modules).filter(([chemin]) => !chemin.endsWith('prix.json')).map(([, m]) => m);
  const prix = Object.entries(modules).find(([chemin]) => chemin.endsWith('prix.json'))?.[1] || {};
  const csv = (await import('../data/donnees_marche.csv?raw')).default;
  return construireBase({ csv, jsons, prix, taux });
}

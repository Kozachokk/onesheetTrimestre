/**
 * ratios.js : calcul des ratios et de leur note de 0 à 100.
 * Les définitions (nom, catégorie, seuils, explication) sont dans src/config/ratios.json.
 * Les formules sont ici, dans FORMULES (même identifiant). Une donnée manquante donne null (« n. d. »).
 */
import definitionsRatios from '../config/ratios.json';

export const DEFINITIONS = definitionsRatios.ratios;
export const CATEGORIES = definitionsRatios.categories;
export const DEFS = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d]));

/** { id: [mauvais, bon] } ; la valeur spéciale "taux_10ans" est remplacée par le taux obligataire. */
export function seuilsParDefaut(taux10ans, definitions = DEFINITIONS) {
  const resoudre = (v) => (v === 'taux_10ans' ? taux10ans : Number(v));
  return Object.fromEntries(definitions.map((d) => [d.id, [resoudre(d.mauvais), resoudre(d.bon)]]));
}

/** Note linéaire de 0 (seuil mauvais) à 100 (seuil bon), dans les deux sens. null si la valeur manque. */
export function note(valeur, mauvais, bon) {
  if (valeur === null || valeur === undefined || mauvais === bon) return null;
  return Math.max(0, Math.min(1, (valeur - mauvais) / (bon - mauvais))) * 100;
}

const existe = (v) => v !== null && v !== undefined;
const div = (a, b) => (existe(a) && existe(b) && b !== 0 ? a / b : null);
const premier = (...valeurs) => valeurs.find(existe) ?? null;
const positif = (v) => (existe(v) && v > 0 ? v : null);

function croissanceRevenus(g) {
  const annuelles = ['croissance_revenus_2025', 'croissance_revenus_2024', 'croissance_revenus_2023'].map(g).filter((c) => existe(c) && c > -1);
  if (!annuelles.length) return g('croissance_revenus_3ans');
  return annuelles.reduce((p, c) => p * (1 + c), 1) ** (1 / annuelles.length) - 1;
}

function croissanceBpa(g) {
  const [recent, ancien, annees] = [g('bpa_recent'), g('bpa_ancien'), g('bpa_nb_annees')];
  if (existe(recent) && existe(ancien) && annees && recent > 0 && ancien > 0) return (recent / ancien) ** (1 / annees) - 1;
  return g('croissance_bpa');
}

/** FCF prudent revenant aux actionnaires (sinon le FCF brut). */
const fcfActionnaires = (g) => premier(g('fcf_actionnaires_cad_m'), g('fcf_ttm_cad_m'));

/** Chaque formule reçoit g, une fonction qui renvoie la valeur d'un champ (ou null). */
export const FORMULES = {
  roe: (g) => premier(g('roe'), div(g('benefice_net_ttm_cad_m'), g('capitaux_propres_cad_m'))),
  roic: (g) => g('roic'),
  marge_brute: (g) => premier(div(g('benefice_brut_cad_m'), g('revenus_annuels_cad_m')), g('marge_brute')),
  marge_exploitation: (g) => div(g('resultat_exploitation_ttm_cad_m'), g('revenus_ttm_cad_m')),
  marge_nette: (g) => div(g('benefice_net_ttm_cad_m'), g('revenus_ttm_cad_m')),
  marge_fcf: (g) => premier(g('marge_fcf'), div(g('fcf_ttm_cad_m'), g('revenus_ttm_cad_m'))),
  croissance_revenus: croissanceRevenus,
  croissance_bpa: croissanceBpa,
  croissance_organique: (g) => g('croissance_organique_recente'),
  dette_capitaux_propres: (g) => premier(g('dette_capitaux_propres'), div(g('dette_totale_cad_m'), g('capitaux_propres_cad_m'))),
  dette_fcf: (g) => premier(g('dette_fcf'), div(g('dette_totale_cad_m'), positif(g('fcf_ttm_cad_m')))),
  couverture_interets: (g) => g('couverture_interets'),
  ratio_liquidite: (g) => g('ratio_liquidite'),
  altman_z: (g) => g('altman_z'),
  piotroski_f: (g) => g('piotroski_f'),
  pe: (g) => positif(g('pe')),
  pe_prevu: (g) => positif(g('pe_prevu')),
  p_fcf: (g) => div(g('capitalisation_cad_m'), positif(fcfActionnaires(g))),
  pb: (g) => div(g('capitalisation_cad_m'), positif(g('capitaux_propres_cad_m'))),
  ev_ebit: (g) => premier(g('ev_ebit'), div(g('valeur_entreprise_cad_m'), positif(g('resultat_exploitation_ttm_cad_m')))),
  rendement_fcf: (g) => premier(div(g('fcf_actionnaires_cad_m'), g('capitalisation_cad_m')), g('rendement_fcf'),
    div(g('fcf_ttm_cad_m'), g('capitalisation_cad_m'))),
  peg: (g) => {
    const [c, pe] = [croissanceBpa(g), positif(g('pe'))];
    return pe && existe(c) && c > 0 ? pe / (c * 100) : null;
  },
  rendement_dividende: (g) => g('rendement_dividende'),
  ratio_distribution: (g) => (g('rendement_dividende') && positif(g('pe')) ? g('rendement_dividende') * g('pe') : null),
  variation_actions: (g) => g('variation_actions_1an'),
  roic_plus_og: (g) => (existe(g('roic')) && existe(g('croissance_organique_recente')) ? g('roic') + g('croissance_organique_recente') : null),
  goodwill_actifs: (g) => div(g('goodwill_m'), g('actifs_totaux_m')),
  conversion_fcf: (g) => div(g('fcf_ttm_cad_m'), positif(g('benefice_net_ttm_cad_m'))),
  rendement_6mois: (g) => g('rendement_6mois'),
  ecart_mm200: (g) => g('ecart_mm200'),
  volatilite: (g) => g('volatilite'),
  beta: (g) => g('beta'),
};

/** Rassemble la source, la date et le lien des champs utilisés par un calcul. */
export function provenance(entreprise, cles) {
  const utilises = cles.map((c) => entreprise.champs?.[c]).filter(Boolean);
  const sources = [...new Set(utilises.map((c) => c.source).filter(Boolean))];
  const dates = utilises.map((c) => c.date).filter(Boolean).sort();
  return { source: sources.join(' ; '), date: dates[dates.length - 1] || '', url: utilises.find((c) => c.url)?.url || '',
    citation: utilises.find((c) => c.citation)?.citation || '' };
}

/** Calcule tous les ratios d'une entreprise : { id: { valeur, source, date, url } }. */
export function calculerRatios(entreprise, definitions = DEFINITIONS) {
  const g = (cle) => entreprise.champs?.[cle]?.valeur ?? null;
  return Object.fromEntries(definitions.map((d) => {
    let valeur;
    try { valeur = FORMULES[d.id](g); } catch { valeur = null; }
    if (!Number.isFinite(valeur)) valeur = null;
    const p = valeur === null ? { source: '', date: '', url: '', citation: '' } : provenance(entreprise, d.champs || []);
    return [d.id, { valeur, ...p }];
  }));
}

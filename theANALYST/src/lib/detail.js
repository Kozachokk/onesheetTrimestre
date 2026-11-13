/**
 * detail.js : lignes de la section « Voir plus de données » de la fiche d'une entreprise.
 * Chaque ligne renvoie { nom, format, valeur, source, date, url, citation }. Ce qui manque vaut null (« n. d. »).
 */
import { DEFS, provenance } from './ratios.js';
import { tauxDe } from './donnees.js';

const existe = (v) => v !== null && v !== undefined && Number.isFinite(v);
const div = (a, b) => (existe(a) && existe(b) && b !== 0 ? a / b : null);

export function sectionsDetail(entreprise, valeursRatios, taux) {
  const g = (cle) => entreprise.champs?.[cle]?.valeur ?? null;
  const fxBilan = tauxDe(entreprise.deviseBilan || entreprise.deviseRapport, taux);

  /** Ligne tirée d'un ratio déjà calculé. */
  const r = (id, nom) => ({ nom: nom || DEFS[id].nom, format: DEFS[id].format, ...valeursRatios[id] });
  /** Ligne tirée directement d'un champ. */
  const c = (cle, nom, format) => {
    const ch = entreprise.champs?.[cle];
    return { nom, format, valeur: ch?.valeur ?? null, source: ch?.source || '', date: ch?.date || '', url: ch?.url || '', citation: ch?.citation || '' };
  };
  /** Ligne calculée à partir de plusieurs champs. */
  const d = (nom, format, valeur, cles) => {
    const v = existe(valeur) ? valeur : null;
    return { nom, format, valeur: v, ...(v === null ? { source: '', date: '', url: '', citation: '' } : provenance(entreprise, cles)) };
  };
  const croissance = (prefixe) => {
    const [a, b] = [g(`${prefixe}_exercice_recent`), g(`${prefixe}_exercice_precedent`)];
    return existe(a) && existe(b) && b > 0 ? a / b - 1 : null;
  };
  const actifsCad = existe(g('actifs_totaux_m')) ? g('actifs_totaux_m') * fxBilan : null;
  const baiia = g('baiia_ajuste_ttm_cad_m');
  const organique = g('croissance_organique_recente');
  const totale = g('croissance_revenus_2025');
  const detteNette = existe(g('dette_totale_cad_m')) && existe(g('tresorerie_cad_m')) ? g('dette_totale_cad_m') - g('tresorerie_cad_m') : null;

  return [
    { titre: 'Rentabilité', lignes: [
      r('marge_brute'), r('marge_exploitation'), r('marge_nette'), r('marge_fcf'), r('roe'),
      d('ROA (rendement de l\'actif)', 'pct', div(g('benefice_net_ttm_cad_m'), actifsCad), ['benefice_net_ttm_cad_m', 'actifs_totaux_m']),
      r('roic'),
      c('bpa_recent', `BPA du dernier exercice (${entreprise.deviseRapport})`, 'dollars'),
    ] },
    { titre: 'Croissance', lignes: [
      r('croissance_revenus'),
      d('Croissance du bénéfice net (dernier exercice)', 'pct', croissance('benefice_net'), ['benefice_net_exercice_recent', 'benefice_net_exercice_precedent']),
      r('croissance_bpa'),
      d('Croissance du FCF (dernier exercice)', 'pct', croissance('fcf'), ['fcf_exercice_recent', 'fcf_exercice_precedent']),
      d('Croissance du dividende (dernier exercice)', 'pct', croissance('dividende_par_action'), ['dividende_par_action_exercice_recent', 'dividende_par_action_exercice_precedent']),
      r('croissance_organique', 'Croissance organique'),
      d('Croissance par acquisitions et devises (totale − organique)', 'pct', existe(totale) && existe(organique) ? totale - organique : null,
        ['croissance_revenus_2025', 'croissance_organique_recente']),
    ] },
    { titre: 'Évaluation', lignes: [
      r('pe', 'P/E passé (12 derniers mois)'), r('pe_prevu'), r('peg'), r('pb'),
      d('P/S (cours / ventes)', 'x', div(g('capitalisation_cad_m'), g('revenus_ttm_cad_m')), ['capitalisation_cad_m', 'revenus_ttm_cad_m']),
      r('p_fcf'),
      d('VE / BAIIA ajusté (EV/EBITDA)', 'x', div(g('valeur_entreprise_cad_m'), baiia), ['valeur_entreprise_cad_m', 'baiia_ajuste_ttm_cad_m']),
      r('ev_ebit'), r('rendement_fcf', 'Rendement du FCF'),
    ] },
    { titre: 'Santé financière', lignes: [
      r('dette_capitaux_propres'),
      d('Dette nette / BAIIA ajusté', 'x', div(detteNette, baiia), ['dette_totale_cad_m', 'tresorerie_cad_m', 'baiia_ajuste_ttm_cad_m']),
      r('dette_fcf'), r('couverture_interets'), r('ratio_liquidite'),
      c('tresorerie_cad_m', 'Encaisse', 'montant'), c('dette_totale_cad_m', 'Dette totale', 'montant'),
      r('altman_z'), r('piotroski_f'),
    ] },
    { titre: 'Flux de trésorerie', lignes: [
      c('flux_exploitation_ttm_cad_m', 'Flux d\'exploitation (12 mois)', 'montant'),
      c('capex_ttm_cad_m', 'Dépenses en immobilisations (CAPEX)', 'montant'),
      c('fcf_ttm_cad_m', 'Flux de trésorerie libre (FCF)', 'montant'),
      c('fcf_actionnaires_cad_m', 'FCF revenant aux actionnaires', 'montant'),
      r('conversion_fcf', 'Qualité des bénéfices (FCF ÷ bénéfice net)'),
    ] },
    { titre: 'Efficacité', lignes: [
      d('Rotation de l\'actif (revenus ÷ actifs)', 'x', div(g('revenus_ttm_cad_m'), actifsCad), ['revenus_ttm_cad_m', 'actifs_totaux_m']),
      d('Revenu par employé', 'dollars', existe(g('employes')) && g('employes') > 0 ? div(g('revenus_ttm_cad_m') * 1e6, g('employes')) : null,
        ['revenus_ttm_cad_m', 'employes']),
      c('employes', 'Nombre d\'employés', 'entier'),
    ] },
    { titre: 'Retour aux actionnaires', lignes: [
      r('rendement_dividende'), r('ratio_distribution'),
      r('variation_actions', 'Variation du nombre d\'actions (négatif = rachats, positif = dilution)'),
    ] },
    { titre: 'Marché', lignes: [
      c('capitalisation_cad_m', 'Capitalisation boursière', 'montant'), c('prix_cad', 'Cours', 'dollars'),
      c('haut_52_semaines', 'Haut sur 52 semaines', 'dollars'), c('bas_52_semaines', 'Bas sur 52 semaines', 'dollars'),
      r('beta'), r('rendement_6mois'), r('volatilite'),
    ] },
  ];
}

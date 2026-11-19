/*
 * capitalIQ.js : affichage des chiffres clés tirés de S&P Capital IQ (licence HEC Montréal).
 * Données : src/data/capitalIQ.js (résumés par groupe interne) et le champ capital_iq des fiches de src/data/acquisitions.js.
 * Aucun calcul de l'outil n'est changé ici : on met seulement en forme, avec la source et l'année de chaque chiffre.
 */
import { DATE_EXPORT, RESUMES_CIQ, SOURCE_CIQ } from '../data/capitalIQ.js';
import { fr } from './format.js';

/** Mention ajoutée à chaque chiffre d'une base payante : le jury sait pourquoi il n'y a pas de lien public. */
export const ACCES_COMPTE = 'base payante, accessible seulement avec un compte, ici celui de la bibliothèque HEC Montréal';

const NOMS_PAYS = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['fr'], { type: 'region' }) : null;

/** Nom du pays en français à partir de son code (ex. 'GB' → 'Royaume-Uni'). */
export function nomPaysCode(code) {
  if (!code) return null;
  try { return NOMS_PAYS?.of(code) || code; } catch { return code; }
}

/** Résumé Capital IQ d'un acheteur, ou null. */
export function resumeCiq(ticker) {
  return RESUMES_CIQ[ticker] || null;
}

/** « Source : S&P Capital IQ, exercice 2025 (base payante : ...) » (sans année si on ne la connaît pas). */
export function mentionSource(exercice) {
  return `Source : ${SOURCE_CIQ}${exercice ? `, exercice ${exercice}` : ''} (${ACCES_COMPTE})`;
}

/** Texte des années d'exercice d'un groupe : « 2025 », « 2023 à 2025 », ou null. */
export function texteExercices(annees) {
  if (!annees?.length) return null;
  return annees.length === 1 ? annees[0] : `${annees[0]} à ${annees[annees.length - 1]}`;
}

/** Une ligne lisible avec les chiffres Capital IQ d'une fiche (millions de $ US), ou null. */
export function ligneCiq(fiche) {
  const c = fiche?.capital_iq;
  if (!c) return null;
  const morceaux = [];
  if (c.revenus != null) morceaux.push(`revenus ${fr(c.revenus, 1)} M USD`);
  if (c.baiia != null) morceaux.push(`BAIIA ${fr(c.baiia, 1)} M USD`);
  if (c.resultat_net != null) morceaux.push(`bénéfice net ${fr(c.resultat_net, 1)} M USD`);
  const chiffres = morceaux.length ? `exercice ${c.exercice} : ${morceaux.join(', ')}` : 'aucun chiffre financier depuis 2022';
  const employes = c.employes != null ? ` ; ${fr(c.employes, 0)} employés${c.employes_date ? ` (compte de ${c.employes_date})` : ''}` : '';
  return `${SOURCE_CIQ} (entité « ${c.entite} »), ${chiffres}${employes}. ${ACCES_COMPTE[0].toUpperCase()}${ACCES_COMPTE.slice(1)}.`;
}

/** Vrai si ce champ de la fiche vient de Capital IQ (et non de la source d'origine). */
export function vientDeCiq(fiche, champ) {
  return !!fiche?.capital_iq?.champs_remplis?.includes(champ);
}

/** Nom de chaque acheteur dans Capital IQ (critère « société mère ultime » de l'export). */
const NOMS_CIQ = { CSU: 'Constellation Software Inc.', TOI: 'Topicus.com Inc.', WSP: 'WSP Global Inc.', TFII: 'TFI International Inc.', ARE: 'Aecon Group Inc.' };

/** Recette pour refaire l'export Capital IQ d'un acheteur : qui a un compte retrouve les mêmes chiffres. */
export function recetteCiq(ticker) {
  const r = RESUMES_CIQ[ticker];
  if (!r) return null;
  return {
    outil: 'S&P Capital IQ Pro, menu Screener, écran Companies',
    critere: `Société mère ultime (Ultimate Parent) = ${NOMS_CIQ[ticker]}`,
    colonnes: ['SP_ENTITY_NAME', 'SP_PARENT_COMPANY_NAME', 'SP_COUNTRY_CODE', 'SP_COMPANY_TYPE', 'SP_TOTAL_REV', 'SP_EBITDA', 'SP_NET_INC',
      'SP_HEADCOUNT_LATEST', 'SP_PERIOD_END', 'et leurs équivalents IQ_ (IQ_TOTAL_REV, IQ_EBITDA, IQ_NET_INC_PARENT, IQ_PERIOD_END)'],
    parametres: 'Période FY0 (dernier exercice), devise USD, montants en milliers',
    date: DATE_EXPORT,
    resultat: `${r.filiales} filiales, dont ${r.avecRevenusRecents} avec des revenus depuis 2022`,
  };
}

export { DATE_EXPORT, SOURCE_CIQ };

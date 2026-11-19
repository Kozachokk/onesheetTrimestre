/*
 * orbis.js : mise en forme des transactions tirées d'Orbis M&A (données : src/data/orbis.js).
 * Aucun calcul de l'outil d'estimation n'est touché : ces chiffres sont affichés à part, avec leur source et leur année.
 */
import { SOURCE_ORBIS, TRANSACTIONS_ORBIS } from '../data/orbis.js';

/** Transactions Orbis d'un acheteur (les plus récentes d'abord). */
export function transactionsOrbis(ticker) {
  return TRANSACTIONS_ORBIS[ticker] || [];
}

/** Type de transaction en français (ex. « Minority stake 49% » → « Participation minoritaire (49 %) »). */
export function typeFr(type) {
  if (!type) return null;
  const pct = (type.match(/(\d+(?:\.\d+)?)\s?%/) || [])[1];
  const p = pct ? ` (${pct.replace('.', ',')} %)` : '';
  if (/^Acquisition 100/.test(type)) return 'Rachat complet';
  if (/majority/i.test(type)) return `Participation majoritaire${p}`;
  if (/minority/i.test(type)) return `Participation minoritaire${p}`;
  if (/capital increase/i.test(type)) return `Augmentation de capital${p}`;
  return type;
}

/** Vrai si les chiffres viennent d'une estimation de fournisseur (« données limitées »), à prendre avec prudence. */
export function estEstimation(t) {
  return String(t.base || '').startsWith('données limitées');
}

/** Résumé : nombre de transactions, combien avec un prix, combien avec des chiffres de l'entreprise achetée. */
export function resumeOrbis(ticker) {
  const l = transactionsOrbis(ticker);
  return { total: l.length, avecPrix: l.filter((t) => t.valeur).length, avecChiffres: l.filter((t) => t.revenus).length };
}

/** Recette pour refaire l'export Orbis M&A. */
export const RECETTE_ORBIS = {
  outil: 'Orbis M&A (Moody’s), recherche de transactions (Deals)',
  criteres: 'Company name, rôle « As the acquiror » : l’acheteur et ses filiales qui achètent (ex. Volaris, Total Specific Solutions) ; '
    + 'Time period : conclues (Completed - confirmed et assumed) du 01/01/2022 au 18/11/2026',
  colonnes: 'Deal value, Deal type, Completed date, Target name et country, Pre-deal target operating revenue, EBITDA, net profit, '
    + 'accounts date, number of months, reporting basis et source (dernière année disponible, millions de $ US)',
  date: SOURCE_ORBIS.date,
};

export { SOURCE_ORBIS };

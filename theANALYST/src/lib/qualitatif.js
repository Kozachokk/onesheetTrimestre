/**
 * qualitatif.js : fiche qualitative (notes de 1 à 5), informative seulement : elle ne compte pas dans le pointage.
 *
 * Chaque note est calculée par une règle simple à partir des ratios du site et cite sa source.
 * Sans donnée sourcée, le critère est « non évalué » (gouvernance et ESG : aucune donnée dans les fichiers).
 */
import { DEFS } from './ratios.js';
import { formater } from './format.js';

/** Convertit une moyenne de notes sur 100 en note de 1 à 5. */
const surCinq = (moyenne) => Math.max(1, Math.min(5, Math.round(1 + moyenne / 25)));

export function ficheQualitative(entreprise, resultat) {
  const critere = (nom, ids, phrase, ajustement = 0, sourceExtra = '') => {
    const dispo = ids.filter((id) => resultat.notes[id] !== null);
    if (!dispo.length) return { nom, note: null, justification: 'non évalué', source: '' };
    const moyenne = dispo.reduce((s, id) => s + resultat.notes[id], 0) / dispo.length;
    const chiffres = dispo.map((id) => `${DEFS[id].nom} ${formater(resultat.valeurs[id].valeur, DEFS[id].format)}`).join(', ');
    const sources = [...new Set(dispo.map((id) => resultat.valeurs[id].source).filter(Boolean))];
    if (sourceExtra) sources.push(sourceExtra);
    return { nom, note: Math.max(1, Math.min(5, surCinq(moyenne) + ajustement)), justification: `${phrase} (${chiffres}).`,
      source: sources.join(' ; '), url: resultat.valeurs[dispo[0]].url };
  };
  const litiges = (entreprise.evenements || []).filter((ev) => ev.type === 'litigation');
  const nonEvalue = (nom) => ({ nom, note: null, justification: 'non évalué', source: '' });

  return [
    critere('Avantage concurrentiel', ['roic', 'marge_brute'], 'Jugé sur le rendement du capital et la marge brute : plus ils sont élevés, plus un avantage durable est probable'),
    critere('Qualité de la direction', ['variation_actions', 'conversion_fcf', 'roic_plus_og'], 'Jugée sur l\'allocation du capital : dilution, conversion du profit en argent comptant, rendement des réinvestissements'),
    critere('Modèle d\'affaires', ['marge_fcf', 'croissance_organique'], 'Jugé sur l\'argent comptant généré par dollar de vente et la croissance interne'),
    critere('Risques (5 = peu de risques)', ['altman_z', 'dette_fcf', 'couverture_interets'],
      `Jugés sur le bilan${litiges.length ? ` ; ${litiges.length} litige(s) recensé(s) dans les dépôts, ce qui retire un point` : ''}`,
      litiges.length ? -1 : 0, litiges.length ? `JSON OneSheet · ${litiges[0].source}` : ''),
    nonEvalue('Gouvernance'),
    nonEvalue('Critères ESG'),
  ];
}

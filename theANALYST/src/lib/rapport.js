/**
 * rapport.js : justification du titre recommandé et export CSV du classement.
 * Tous les chiffres viennent des calculs du site (ratios, notes, contributions).
 */
import { DEFS } from './ratios.js';
import { expliquerEcart, gagnant } from './pointage.js';
import { fr, formater } from './format.js';

/** Faits de la justification : forces, faiblesses, comparaison avec le 2e, titres éliminés. */
export function justification(resultats, poids) {
  const premier = gagnant(resultats);
  if (!premier) return null;
  const ponderes = Object.keys(poids).filter((id) => poids[id] > 0 && premier.notes[id] !== null);
  const dispo = ponderes.reduce((s, id) => s + poids[id], 0) || 1;
  const lignes = ponderes.map((id) => ({ id, nom: DEFS[id].nom, valeur: formater(premier.valeurs[id].valeur, DEFS[id].format),
    note: premier.notes[id], points: premier.contributions[id], perdus: (poids[id] * (100 - premier.notes[id])) / dispo }));
  const deuxieme = resultats.find((r) => !r.elimine && r.score !== null && r.ticker !== premier.ticker) || null;
  return {
    premier, deuxieme,
    forces: lignes.filter((x) => x.note >= 50).sort((a, b) => b.points - a.points).slice(0, 3),
    faiblesses: lignes.filter((x) => x.note < 50).sort((a, b) => b.perdus - a.perdus).slice(0, 3),
    ecarts: deuxieme ? expliquerEcart(premier, deuxieme, 3) : [],
    elimines: resultats.filter((r) => r.elimine),
  };
}

/** Classement au format CSV (point-virgule, lisible par Excel en français). */
export function csvClassement(resultats) {
  let rang = 0;
  const lignes = [['rang', 'ticker', 'nom', 'score', 'confiance_pct', 'statut', 'raisons']];
  resultats.forEach((r) => {
    if (!r.elimine) rang += 1;
    lignes.push([r.elimine ? '' : rang, r.ticker, r.nom, r.score === null ? 'n. d.' : fr(r.score, 1), Math.round(r.confiance * 100),
      r.elimine ? 'éliminé' : 'admissible', r.raisons.join(' ; ')]);
  });
  return `\uFEFF${lignes.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')}`;
}

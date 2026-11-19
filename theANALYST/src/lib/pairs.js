/*
 * pairs.js : compare un titre à la médiane de ses pairs, ratio par ratio (données : src/data/pairs.js, S&P Capital IQ).
 * Une valeur « NM » ou « NA » ne compte pas dans la médiane : elle est affichée telle quelle.
 */
import { GROUPES, INDICATEURS, SOURCE_PAIRS, VALEURS } from '../data/pairs.js';

const estNombre = (x) => typeof x === 'number' && Number.isFinite(x);

/** Médiane d'une liste de nombres (null si vide). */
export function mediane(liste) {
  const v = liste.filter(estNombre).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Groupe de pairs d'un titre, ou null s'il n'en a pas. */
export function groupeDe(ticker) {
  return Object.values(GROUPES).find((g) => g.titres.includes(ticker)) || null;
}

/**
 * Comparaison d'un titre à ses pairs : une ligne par ratio, avec la valeur du titre, la médiane des pairs,
 * le nombre de pairs comptés et le verdict (« mieux », « moins bien », « égal », ou null si on ne peut pas comparer).
 */
export function comparerAuxPairs(ticker) {
  const groupe = groupeDe(ticker);
  if (!groupe || !VALEURS[ticker]) return null;
  const lignes = INDICATEURS.map((ind) => {
    const valeur = VALEURS[ticker][ind.id];
    const valeursPairs = groupe.pairs.map((p) => VALEURS[p]?.[ind.id]);
    const med = mediane(valeursPairs);
    let verdict = null;
    if (estNombre(valeur) && med !== null) {
      const ecart = valeur - med;
      if (Math.abs(ecart) < 1e-9) verdict = 'égal';
      else verdict = (ind.sens === 'haut' ? ecart > 0 : ecart < 0) ? 'mieux' : 'moins bien';
    }
    return { ...ind, valeur, mediane: med, nPairs: valeursPairs.filter(estNombre).length, verdict };
  });
  return {
    groupe,
    pairs: groupe.pairs.map((p) => ({ ticker: p, nom: VALEURS[p].nom, bourse: VALEURS[p].bourse })),
    lignes,
    mieux: lignes.filter((l) => l.verdict === 'mieux').length,
    compares: lignes.filter((l) => l.verdict).length,
  };
}

const val = (x, unite) => (unite === 'x' ? `${x.toFixed(2).replace('.', ',')}x` : `${x.toFixed(1).replace('.', ',')} %`);
const court = { croissance3ans: 'la croissance', margeBaiia: 'la marge BAIIA', rendementCapital: 'le rendement du capital',
  margeFcf: 'le flux de trésorerie libre', detteNetteBaiia: 'la dette' };

/** Conclusion en une phrase, générée à partir des chiffres : { niveau, titre, texte }, ou null sans pairs. */
export function conclusionPairs(ticker) {
  const c = comparerAuxPairs(ticker);
  if (!c) return null;
  const mieux = c.lignes.filter((l) => l.verdict === 'mieux').map((l) => court[l.id]);
  const moins = c.lignes.filter((l) => l.verdict === 'moins bien');
  const niveau = c.mieux / c.compares >= 0.6 ? 'vert' : c.mieux / c.compares >= 0.4 ? 'orange' : 'rouge';
  return {
    niveau,
    titre: `${ticker} fait mieux que ses pairs sur ${c.mieux} ratio${c.mieux > 1 ? 's' : ''} sur ${c.compares}`,
    texte: (mieux.length ? `Mieux : ${mieux.join(', ')}. ` : '')
      + (moins.length ? `Moins bien : ${moins.map((l) => `${court[l.id]} (${val(l.valeur, l.unite)} contre ${val(l.mediane, l.unite)} pour la médiane)`).join(', ')}.` : 'Aucun ratio sous la médiane.'),
  };
}

export { SOURCE_PAIRS, VALEURS };

/**
 * pointage.js : pondération, score, indice de confiance, filtres éliminatoires et simulation de solidité.
 *
 * Score = somme(poids × note) ÷ somme(poids des ratios disponibles), sur 100.
 * Un ratio « n. d. » ne compte pas : son poids est redistribué aux autres.
 * Confiance = part du poids total pour laquelle on a des données.
 */
import profilsConfig from '../config/profils.json';
import { CATEGORIES, DEFINITIONS, calculerRatios, note } from './ratios.js';

export const PROFILS = profilsConfig.profils;
export const CRITERES = profilsConfig.criteres;
export const MENTION = profilsConfig.mention;

/** Poids complets { id: nombre } d'un profil : les ratios non listés valent 0. */
export function poidsDuProfil(profil, definitions = DEFINITIONS) {
  return Object.fromEntries(definitions.map((d) => [d.id, Number(profil.poids?.[d.id] ?? 0)]));
}

/** Seuils d'un profil : ceux de ratios.json, sauf ceux que le profil remplace. */
export function seuilsDuProfil(profil, seuils) {
  const propres = Object.fromEntries(Object.entries(profil.seuils || {}).filter(([id]) => id in seuils).map(([id, v]) => [id, [Number(v[0]), Number(v[1])]]));
  return { ...seuils, ...propres };
}

/** Raisons d'élimination (liste vide si le titre est admissible). Une donnée manquante n'élimine pas. */
export function raisonsElimination(entreprise, valeurs, filtresActifs, configFiltres) {
  const seuil = (f) => configFiltres[f]?.seuil;
  const actif = (f) => filtresActifs.includes(f);
  const fr1 = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const raisons = [];
  const benefice = entreprise.champs?.benefice_net_ttm_cad_m?.valeur ?? null;
  if (actif('perte_nette') && benefice !== null && benefice < seuil('perte_nette')) raisons.push('Perte nette sur 12 mois');
  const altman = valeurs.altman_z.valeur;
  if (actif('altman') && altman !== null && altman < seuil('altman')) raisons.push(`Altman Z de ${fr1(altman, 2)} (zone de détresse)`);
  const dette = valeurs.dette_fcf.valeur;
  if (actif('dette_fcf') && dette !== null && dette > seuil('dette_fcf')) raisons.push(`Dette = ${fr1(dette)} ans de FCF`);
  const dilution = valeurs.variation_actions.valeur;
  if (actif('dilution') && dilution !== null && dilution > seuil('dilution')) raisons.push(`Dilution de ${fr1(dilution * 100)} % en 1 an`);
  return raisons;
}

/** Ratios, notes, score, confiance et statut d'une entreprise. */
export function evaluerEntreprise(entreprise, poids, seuils, filtresActifs, configFiltres, definitions = DEFINITIONS) {
  const valeurs = calculerRatios(entreprise, definitions);
  const notes = Object.fromEntries(definitions.map((d) => [d.id, note(valeurs[d.id].valeur, ...seuils[d.id])]));
  const p = (id) => poids[id] || 0;
  const ids = definitions.map((d) => d.id);
  const poidsTotal = ids.reduce((s, id) => s + p(id), 0);
  const poidsDispo = ids.reduce((s, id) => s + (notes[id] !== null ? p(id) : 0), 0);
  const score = poidsDispo > 0 ? ids.reduce((s, id) => s + (notes[id] !== null ? p(id) * notes[id] : 0), 0) / poidsDispo : null;
  // Contribution de chaque ratio au score, en points ; la somme des contributions donne le score
  const contributions = Object.fromEntries(ids.map((id) => [id, notes[id] !== null && poidsDispo > 0 ? (p(id) * notes[id]) / poidsDispo : 0]));

  // Note par catégorie : simple moyenne des ratios disponibles (indépendante des poids)
  const categories = Object.fromEntries(CATEGORIES.map((cat) => {
    const dispo = definitions.filter((d) => d.categorie === cat && notes[d.id] !== null);
    return [cat, dispo.length ? dispo.reduce((s, d) => s + notes[d.id], 0) / dispo.length : null];
  }));
  const raisons = raisonsElimination(entreprise, valeurs, filtresActifs, configFiltres);
  return { ticker: entreprise.ticker, nom: entreprise.nom, score, confiance: poidsTotal > 0 ? poidsDispo / poidsTotal : 0,
    elimine: raisons.length > 0, raisons, valeurs, notes, contributions, categories };
}

/** Classement complet : titres admissibles d'abord (score décroissant), puis titres éliminés. */
export function classer(entreprises, poids, seuils, filtresActifs, configFiltres) {
  return Object.values(entreprises)
    .map((e) => evaluerEntreprise(e, poids, seuils, filtresActifs, configFiltres))
    .sort((a, b) => (a.elimine - b.elimine) || ((b.score ?? -1) - (a.score ?? -1)));
}

/** Premier titre admissible ayant un score, ou null. */
export const gagnant = (resultats) => resultats.find((r) => !r.elimine && r.score !== null) || null;

/** Rang de chaque titre : { ticker: rang } (les titres éliminés n'ont pas de rang). */
export function rangs(resultats) {
  let rang = 0;
  return Object.fromEntries(resultats.map((r) => [r.ticker, r.elimine || r.score === null ? null : (rang += 1)]));
}

/** Les n ratios qui expliquent le plus l'écart de score entre a et b (différence de contribution, en points). */
export function expliquerEcart(a, b, n = 5, definitions = DEFINITIONS) {
  return definitions.map((d) => ({ id: d.id, nom: d.nom, format: d.format, ecart: a.contributions[d.id] - b.contributions[d.id],
    valeurA: a.valeurs[d.id].valeur, valeurB: b.valeurs[d.id].valeur }))
    .filter((x) => Math.abs(x.ecart) > 1e-9)
    .sort((x, y) => Math.abs(y.ecart) - Math.abs(x.ecart))
    .slice(0, n);
}

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function hasard(graine) {
  let a = graine;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Refait le classement n fois en faisant varier chaque poids au hasard de ±amplitude.
 * Renvoie le gagnant de référence, la part des simulations où il reste premier et la fréquence de chaque titre.
 */
export function simulationSolidite(resultats, poids, n = 500, amplitude = 0.5, graine = 42) {
  const admissibles = resultats.filter((r) => !r.elimine && r.score !== null);
  const ids = Object.keys(poids).filter((id) => poids[id] > 0);
  if (!admissibles.length || !ids.length) return { gagnant: admissibles[0]?.ticker || null, partGagnant: 0, frequences: {} };
  const alea = hasard(graine);
  const victoires = Object.fromEntries(admissibles.map((r) => [r.ticker, 0]));
  for (let k = 0; k < n; k += 1) {
    const tirage = Object.fromEntries(ids.map((id) => [id, poids[id] * (1 - amplitude + 2 * amplitude * alea())]));
    let meilleur = null;
    let meilleurScore = -1;
    admissibles.forEach((r) => {
      let num = 0;
      let den = 0;
      ids.forEach((id) => { if (r.notes[id] !== null) { num += tirage[id] * r.notes[id]; den += tirage[id]; } });
      const s = den > 0 ? num / den : -1;
      if (s > meilleurScore) { meilleurScore = s; meilleur = r.ticker; }
    });
    victoires[meilleur] += 1;
  }
  const frequences = Object.fromEntries(Object.entries(victoires).map(([t, v]) => [t, v / n]));
  return { gagnant: admissibles[0].ticker, partGagnant: frequences[admissibles[0].ticker], frequences };
}

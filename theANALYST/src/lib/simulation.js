/*
 * simulation.js : simulation de l'indice Serial Acquirers sur plusieurs années, à partir des vrais rendements mensuels
 * (src/data/rendements.js, Yahoo Finance). Rien n'est inventé : chaque mois simulé est un vrai mois passé.
 *
 * Méthode (« rééchantillonnage historique ») :
 *   - on tire au hasard des mois passés et on les enchaîne. Le même mois est pris pour tous les titres et pour l'indice,
 *     ce qui garde leurs liens (quand le marché baisse, ils baissent ensemble) ;
 *   - scénario : « historique » garde les écarts réels ; « calme » et « intense » réduisent ou grossissent les écarts
 *     de chaque série autour de sa moyenne (la moyenne ne change pas) ;
 *   - les mois des trois crises (COVID 2020, hausse des taux 2022, tarifs 2025) sont retirés des tirages ordinaires.
 *     Crises allumées : chaque crise est rejouée en bloc, telle qu'elle s'est passée, à la même fréquence que de 2016 à 2026
 *     (3 crises pour les autres mois de la période). Crises éteintes : aucun mois de crise, un marché sans krach.
 * Indice actuel : moyenne à poids égaux des membres connus. Avec tes titres : chacun reçoit le poids choisi, le reste va à l'indice.
 */
import { MOIS, RENDEMENTS, SOURCE_RENDEMENTS } from '../data/rendements.js';
import { CANDIDATS, FENETRES, MEMBRES_INDICE, PLAFOND } from '../data/crises.js';

export const SCENARIOS = [
  { id: 'historique', nom: 'Historique', facteur: 1, explication: 'Les variations réelles du marché, telles qu’elles se sont passées de 2016 à 2026.' },
  { id: 'calme', nom: 'Marché calme', facteur: 0.5, explication: 'Les mêmes mois, mais des hausses et des baisses deux fois plus petites autour de la moyenne.' },
  { id: 'intense', nom: 'Marché intense', facteur: 1.5, explication: 'Les mêmes mois, mais des hausses et des baisses 1,5 fois plus fortes autour de la moyenne.' },
];
export const HORIZONS = [1, 3, 5, 10];
/** Un membre de l'indice coté depuis moins d'un an n'est pas compté (trop peu d'historique). */
export const MIN_MOIS_MEMBRE = 12;
const MIN_MOIS_TIRAGE = 24;

const moyenne = (l) => l.reduce((s, x) => s + x, 0) / l.length;
const arrondi = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;
const quantile = (trie, q) => trie[Math.min(trie.length - 1, Math.max(0, Math.round(q * (trie.length - 1))))];

/** Générateur pseudo-aléatoire à graine (mulberry32) : la même graine redonne les mêmes résultats. */
function hasard(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Membres de l'indice qui ont assez d'historique pour être comptés. */
export function membresUtilises() {
  return MEMBRES_INDICE.filter((t) => (RENDEMENTS[t] || []).filter((x) => x !== null).length >= MIN_MOIS_MEMBRE);
}

/** Rendement mensuel de l'indice actuel : moyenne à poids égaux des membres cotés ce mois-là. */
export function indiceMensuel() {
  const membres = membresUtilises();
  return MOIS.map((_, i) => {
    const v = membres.map((t) => RENDEMENTS[t][i]).filter((x) => x !== null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  });
}

/** Pour chaque crise, les positions des mois qu'elle couvre dans MOIS. */
export function moisDesCrises() {
  return Object.fromEntries(FENETRES.map((f) => [f.id, MOIS.map((m, i) => [m, i]).filter(([m]) => m >= f.debut.slice(0, 7) && m <= f.fin.slice(0, 7)).map(([, i]) => i)]));
}

/** Rendement annuel moyen (composé) et volatilité annuelle d'une série, sur les mois où elle existe. */
function stats(serie) {
  const l = serie.filter((x) => x !== null);
  if (!l.length) return { rendement: null, volatilite: null, mois: 0 };
  const m = moyenne(l);
  const croissance = l.reduce((v, r) => v * (1 + r), 1);
  return {
    rendement: arrondi((croissance ** (12 / l.length) - 1) * 100),
    volatilite: arrondi(Math.sqrt(moyenne(l.map((r) => (r - m) ** 2))) * Math.sqrt(12) * 100),
    mois: l.length,
    debut: MOIS[serie.findIndex((x) => x !== null)],
  };
}

/** Chiffres historiques réels de l'indice et des candidats, avec la source. */
export function statistiquesHistoriques() {
  return {
    indice: stats(indiceMensuel()),
    titres: Object.fromEntries(CANDIDATS.map((t) => [t, stats(RENDEMENTS[t])])),
    source: SOURCE_RENDEMENTS,
  };
}

/**
 * Simule `n` trajectoires de `annees` ans. Renvoie, pour l'indice actuel et l'indice avec les titres choisis :
 * valeur finale de 100 $ (5e centile, médiane, 95e centile), rendement annuel médian, pire baisse médiane
 * et la bande des trajectoires mois par mois (pour le graphique).
 */
export function simulerMarche({ tickers = [], poids = PLAFOND * 100, annees = 5, scenario = 'historique', crises = true, n = 1000, graine = 1 } = {}) {
  const choisis = tickers.filter((t) => RENDEMENTS[t]);
  const w = Math.min(Math.max(Number(poids) || 0, 0), PLAFOND * 100) / 100;
  const k = (SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0]).facteur;
  const indice = indiceMensuel();
  const parCrise = moisDesCrises();
  const enCrise = new Set(Object.values(parCrise).flat());
  const valide = (i) => indice[i] !== null && choisis.every((t) => RENDEMENTS[t][i] !== null);

  const tirage = MOIS.map((_, i) => i).filter((i) => valide(i) && !enCrise.has(i));
  if (tirage.length < MIN_MOIS_TIRAGE) {
    return { erreur: `Pas assez de mois historiques communs à ces titres (${tirage.length}) pour simuler.`, moisUtilises: tirage.length };
  }
  const rejouables = crises ? FENETRES.filter((f) => parCrise[f.id].length && parCrise[f.id].every(valide)) : [];
  // Fréquence historique : nombre de crises ÷ nombre de mois ordinaires de toute la période (tous les titres de l'indice).
  const ordinaires = MOIS.filter((_, i) => indice[i] !== null && !enCrise.has(i)).length;
  const frequence = FENETRES.length / ordinaires;

  // Écarts réduits ou grossis autour de la moyenne de chaque série (sur les mois du tirage).
  const series = [indice, ...choisis.map((t) => RENDEMENTS[t])];
  const moyennes = series.map((s) => moyenne(tirage.map((i) => s[i])));
  const nMois = Math.round(annees * 12);
  const aleatoire = hasard(graine);
  const valeurs = { actuel: [], avec: [] };
  const pertes = { actuel: [], avec: [] };
  const crisesVues = {};
  let mieux = 0;

  for (let p = 0; p < n; p += 1) {
    const sequence = [];
    while (sequence.length < nMois) {
      if (rejouables.length && aleatoire() < frequence) {
        const c = rejouables[Math.floor(aleatoire() * rejouables.length)];
        parCrise[c.id].forEach((i) => sequence.push({ i, reel: true }));
        crisesVues[c.nom] = (crisesVues[c.nom] || 0) + 1;
      } else sequence.push({ i: tirage[Math.floor(aleatoire() * tirage.length)], reel: false });
    }
    sequence.length = nMois;
    const traj = { actuel: [100], avec: [100] };
    const sommet = { actuel: 100, avec: 100 };
    const pire = { actuel: 0, avec: 0 };
    sequence.forEach(({ i, reel }) => {
      const r = series.map((s, j) => (reel ? s[i] : moyennes[j] + k * (s[i] - moyennes[j])));
      const rActuel = r[0];
      const rAvec = (1 - w * choisis.length) * r[0] + w * r.slice(1).reduce((s, x) => s + x, 0);
      [['actuel', rActuel], ['avec', rAvec]].forEach(([cle, x]) => {
        const v = traj[cle][traj[cle].length - 1] * (1 + x);
        traj[cle].push(v);
        sommet[cle] = Math.max(sommet[cle], v);
        pire[cle] = Math.min(pire[cle], v / sommet[cle] - 1);
      });
    });
    valeurs.actuel.push(traj.actuel);
    valeurs.avec.push(traj.avec);
    pertes.actuel.push(pire.actuel);
    pertes.avec.push(pire.avec);
    if (traj.avec[nMois] > traj.actuel[nMois]) mieux += 1;
  }

  const resumer = (cle) => {
    const finales = valeurs[cle].map((t) => t[nMois]).sort((a, b) => a - b);
    const mediane = quantile(finales, 0.5);
    const bande = Array.from({ length: nMois + 1 }, (_, m) => {
      const v = valeurs[cle].map((t) => t[m]).sort((a, b) => a - b);
      return [quantile(v, 0.05), quantile(v, 0.5), quantile(v, 0.95)].map((x) => arrondi(x, 2));
    });
    return {
      bas: arrondi(quantile(finales, 0.05)), mediane: arrondi(mediane), haut: arrondi(quantile(finales, 0.95)),
      rendementAnnuel: arrondi(((mediane / 100) ** (1 / annees) - 1) * 100),
      pireBaisse: arrondi(quantile([...pertes[cle]].sort((a, b) => a - b), 0.5) * 100),
      bande,
    };
  };

  return {
    actuel: resumer('actuel'), avec: resumer('avec'),
    probabiliteMieux: arrondi((mieux / n) * 100, 0),
    poids: w * 100, poidsIndice: arrondi((1 - w * choisis.length) * 100), tickers: choisis, annees, n, scenario,
    moisUtilises: tirage.length, periode: `${MOIS[tirage[0]]} à ${MOIS[tirage[tirage.length - 1]]}`,
    crisesRejouees: rejouables.map((f) => f.nom), crisesVues, crisesParTrajectoire: arrondi(Object.values(crisesVues).reduce((s, x) => s + x, 0) / n, 2),
    nMembres: membresUtilises().length,
  };
}

export { CANDIDATS, PLAFOND, SOURCE_RENDEMENTS };

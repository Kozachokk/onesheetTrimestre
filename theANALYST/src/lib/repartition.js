/**
 * repartition.js : répartition d'un portefeuille entre les titres admissibles, pour un total de 100 %.
 *
 * C'est une règle mathématique appliquée au classement, pas une recommandation :
 *   1. on garde les titres admissibles (non éliminés) dont le pointage atteint le minimum choisi,
 *      puis les N meilleurs ;
 *   2. chaque titre reçoit un poids proportionnel à son pointage (méthode « pointage ») ou le même poids (méthode « égale ») ;
 *   3. aucun titre ne dépasse le plafond choisi : l'excédent est redistribué aux autres, au prorata. S'il y a trop peu de titres
 *      pour respecter le plafond (ex. 1 titre et 40 %), on ajoute les meilleurs titres admissibles suivants, même sous le minimum ;
 *   4. les pourcentages sont arrondis à l'entier, en gardant un total d'exactement 100 %.
 */

/** Applique un plafond par titre et redistribue l'excédent (au prorata des poids restants). */
export function plafonner(poids, plafond) {
  const n = poids.length;
  if (!n) return [];
  const p = Math.max(plafond, 1 / n); // impossible d'atteindre 100 % si n × plafond < 1 : on relève le plafond
  const resultat = [...poids];
  const fixes = new Set();
  for (let tour = 0; tour < n; tour += 1) {
    const libres = resultat.map((_, i) => i).filter((i) => !fixes.has(i));
    const depassent = libres.filter((i) => resultat[i] > p + 1e-12);
    if (!depassent.length) break;
    depassent.forEach((i) => { resultat[i] = p; fixes.add(i); });
    const reste = 1 - [...fixes].reduce((s, i) => s + resultat[i], 0);
    const autres = resultat.map((_, i) => i).filter((i) => !fixes.has(i));
    const base = autres.reduce((s, i) => s + poids[i], 0);
    autres.forEach((i) => { resultat[i] = base > 0 ? (reste * poids[i]) / base : reste / autres.length; });
  }
  return resultat;
}

/** Arrondit des parts (somme 1) en pourcentages entiers dont la somme fait exactement 100 (plus forts restes). */
export function arrondirA100(parts) {
  const bruts = parts.map((x) => x * 100);
  const entiers = bruts.map(Math.floor);
  let manque = 100 - entiers.reduce((a, b) => a + b, 0);
  const ordre = bruts.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; manque > 0 && k < ordre.length; k += 1, manque -= 1) entiers[ordre[k][1]] += 1;
  return entiers;
}

/**
 * Calcule la répartition.
 * resultats : classement (pointage.js) ; reglages : { methode, maxTitres, scoreMinimum, plafond }.
 * Renvoie { lignes: [{ ticker, nom, score, pct }], exclus: [{ ticker, nom, raison }], plafondApplique }.
 */
export function repartir(resultats, { methode = 'pointage', maxTitres = 5, scoreMinimum = 50, plafond = 0.4 } = {}) {
  const elimines = [];
  const admissibles = [];
  resultats.forEach((r) => {
    if (r.elimine) elimines.push({ ticker: r.ticker, nom: r.nom, raison: `éliminé (${r.raisons.join(' ; ')})` });
    else if (r.score === null) elimines.push({ ticker: r.ticker, nom: r.nom, raison: 'aucun pointage' });
    else admissibles.push(r);
  });
  admissibles.sort((a, b) => b.score - a.score);

  // Titres retenus : pointage suffisant, dans la limite du nombre maximum
  const retenus = admissibles.filter((r) => r.score >= scoreMinimum).slice(0, maxTitres);
  // Assez de titres pour respecter le plafond ? Sinon, on complète avec les meilleurs admissibles suivants
  const minimum = Math.min(maxTitres, Math.ceil(1 / plafond - 1e-9));
  // (seulement si au moins un titre atteint le minimum : sinon, aucune répartition)
  const complements = retenus.length ? admissibles.filter((r) => !retenus.includes(r)).slice(0, Math.max(0, minimum - retenus.length)) : [];
  const choisis = [...retenus, ...complements].sort((a, b) => b.score - a.score);

  const exclus = [...elimines, ...admissibles.filter((r) => !choisis.includes(r)).map((r) => ({
    ticker: r.ticker, nom: r.nom, raison: r.score < scoreMinimum ? `pointage sous ${scoreMinimum}` : `hors des ${maxTitres} meilleurs`,
  }))];
  if (!choisis.length) return { lignes: [], exclus, plafondApplique: plafond };

  const bruts = choisis.map((r) => (methode === 'egale' ? 1 : r.score));
  const total = bruts.reduce((a, b) => a + b, 0);
  const parts = plafonner(bruts.map((x) => x / total), plafond);
  const pct = arrondirA100(parts);
  return {
    lignes: choisis.map((r, i) => ({ ticker: r.ticker, nom: r.nom, score: r.score, pct: pct[i], complement: complements.includes(r) })),
    exclus,
    plafondApplique: Math.max(plafond, 1 / choisis.length),
  };
}

/** Montant et nombre d'actions entières pour un montant à investir (prix en CAD). */
export function enMontants(lignes, montant, prixParTicker) {
  return lignes.map((l) => {
    const somme = (montant * l.pct) / 100;
    const prix = prixParTicker[l.ticker] ?? null;
    const actions = prix ? Math.floor(somme / prix) : null;
    return { ...l, somme, prix, actions, investi: actions !== null ? actions * prix : null };
  });
}

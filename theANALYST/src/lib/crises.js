/*
 * crises.js : simulation simple du test de crise d'Onesheet (données : src/data/crises.js).
 * L'indice est approché par la moyenne à poids égaux de ses membres connus. L'effet d'un titre sur l'indice est estimé
 * dans le pire cas permis par les règles : poids de 10 % (le plafond), soit 0,10 × (baisse du titre − baisse de l'indice).
 * Onesheet fait son propre calcul, avec ses poids et ses scénarios : ce n'est qu'un ordre de grandeur.
 */
import { BAISSES, CANDIDATS, FENETRES, MEMBRES_INDICE, PLAFOND, SOURCE_CRISES } from '../data/crises.js';

const moyenne = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : null);
const arrondi = (x, n = 1) => (x === null ? null : Math.round(x * 10 ** n) / 10 ** n);

/** Baisse moyenne des membres de l'indice dans une fenêtre, et combien de membres comptent. */
export function baisseIndice(fenetre) {
  const v = MEMBRES_INDICE.map((t) => BAISSES[t]?.[fenetre]).filter((x) => typeof x === 'number');
  return { baisse: arrondi(moyenne(v)), n: v.length };
}

/** Pour un candidat : sa baisse, celle de l'indice, l'écart et l'effet sur l'indice à 10 % de poids, par fenêtre. */
export function testDeCrise(ticker) {
  return FENETRES.map((f) => {
    const titre = BAISSES[ticker]?.[f.id];
    const indice = baisseIndice(f.id);
    if (typeof titre !== 'number') return { ...f, titre: null, indice: indice.baisse, nIndice: indice.n, ecart: null, effet: null, depasse: false };
    const ecart = titre - indice.baisse;
    const effet = PLAFOND * ecart;
    return { ...f, titre, indice: indice.baisse, nIndice: indice.n, ecart: arrondi(ecart), effet: arrondi(effet, 2), depasse: effet < -2 };
  });
}

/** Tableau complet pour les 5 candidats. */
export function tableauCrises() {
  return CANDIDATS.map((t) => ({ ticker: t, nom: BAISSES[t].nom, fenetres: testDeCrise(t), pire: BAISSES[t].pire2020_2026 }));
}

/**
 * Simulation à la demande : les titres choisis, une crise, un poids par titre (en %, au plus 10).
 * Pour chaque titre : sa baisse, celle de l'indice, l'écart et l'effet sur l'indice (poids × écart).
 * Effet total = somme des effets : ce que l'ajout des titres changerait à la baisse de l'indice, en points.
 */
export function simulerCrise({ tickers, fenetre, poids }) {
  const w = Math.min(Math.max(Number(poids) || 0, 0), PLAFOND * 100) / 100;
  const indice = baisseIndice(fenetre);
  const lignes = tickers.map((t) => {
    const titre = BAISSES[t]?.[fenetre];
    if (typeof titre !== 'number') return { ticker: t, nom: BAISSES[t]?.nom || t, titre: null, ecart: null, effet: null };
    const ecart = titre - indice.baisse;
    return { ticker: t, nom: BAISSES[t].nom, titre, ecart: arrondi(ecart), effet: arrondi(w * ecart, 2) };
  });
  const comptes = lignes.filter((l) => l.effet !== null);
  const effetTotal = comptes.length ? arrondi(comptes.reduce((s, l) => s + l.effet, 0), 2) : null;
  return {
    fenetre: FENETRES.find((f) => f.id === fenetre), indice: indice.baisse, nIndice: indice.n, poids: w * 100,
    lignes, effetTotal, reussi: effetTotal === null ? null : effetTotal >= -2,
    indiceApres: effetTotal === null ? null : arrondi(indice.baisse + effetTotal, 2),
  };
}

export { CANDIDATS };
export { FENETRES, PLAFOND, SOURCE_CRISES };

/** Vrai si le titre passe le test de crise : dans aucune crise il ne ferait baisser l'indice de plus de 2 points (poids de 10 %). */
export function passeLeTest(ticker) {
  return !testDeCrise(ticker).some((f) => f.depasse);
}

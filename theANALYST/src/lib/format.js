/**
 * format.js : affichage des nombres en français. Une donnée absente s'affiche « n. d. ».
 */
export const ND = 'n. d.';

/** Nombre au format français : espace pour les milliers, virgule pour les décimales. */
export function fr(x, decimales = 1) {
  if (x === null || x === undefined || Number.isNaN(x)) return ND;
  return Number(x).toLocaleString('fr-CA', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/** Valeur d'un ratio selon son format : pct, x, ans, nombre, montant (millions de CAD), dollars, entier. */
export function formater(valeur, format = 'nombre') {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return ND;
  switch (format) {
    case 'pct': return `${fr(valeur * 100, 1)} %`;
    case 'x': return `${fr(valeur, 2)}x`;
    case 'ans': return `${fr(valeur, 1)} ans`;
    case 'montant': return formaterMontant(valeur);
    case 'dollars': return `${fr(valeur, 2)} $`;
    case 'entier': return fr(valeur, 0);
    default: return fr(valeur, 2);
  }
}

/** Montant en millions de CAD, affiché en M$ ou en G$. */
export function formaterMontant(millions) {
  if (millions === null || millions === undefined || Number.isNaN(millions)) return ND;
  return Math.abs(millions) >= 1000 ? `${fr(millions / 1000, 1)} G$` : `${fr(millions, 0)} M$`;
}

/** Convertit en nombre ; null si la donnée manque. */
export function nombre(x) {
  if (x === null || x === undefined || x === '' || typeof x === 'boolean') return null;
  const v = typeof x === 'string' ? Number(x.replace(',', '.')) : Number(x);
  return Number.isFinite(v) ? v : null;
}

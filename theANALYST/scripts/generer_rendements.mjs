// Télécharge les rendements mensuels (cours ajustés, dividendes inclus) de Yahoo Finance et écrit src/data/rendements.js.
// Usage, dans theANALYST :  node scripts/generer_rendements.mjs
// Titres canadiens convertis en $ US avec le taux CADUSD=X de fin de mois, comme le test de crise.
import { writeFileSync } from 'node:fs';
import { BAISSES, CANDIDATS, MEMBRES_INDICE } from '../src/data/crises.js';

const SYMBOLES = { CSU: 'CSU.TO', TOI: 'TOI.V', WSP: 'WSP.TO', TFII: 'TFII.TO', ARE: 'ARE.TO' };
const DEBUT = '2016-11';
const FIN = '2026-10'; // dernier mois complet

async function mensuel(symbole) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbole)}?range=12y&interval=1mo&events=div,splits`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`${symbole} : HTTP ${r.status}`);
  const res = (await r.json()).chart.result[0];
  const prix = res.indicators.adjclose?.[0]?.adjclose || res.indicators.quote[0].close;
  const parMois = {};
  res.timestamp.forEach((t, i) => {
    // Yahoo date chaque mois de son 1er jour, à une heure qui varie (23 h la veille pour les changes, 4 h ou 5 h pour les bourses) :
    // on arrondit au jour le plus proche (+12 h) pour retrouver le bon mois. La dernière barre (mois en cours) n'est pas utilisée.
    if (typeof prix[i] === 'number') parMois[new Date((t + 12 * 3600) * 1000).toISOString().slice(0, 7)] = prix[i];
  });
  return { devise: res.meta.currency, parMois };
}

const mois = [];
for (let d = new Date(`${DEBUT}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= FIN; d.setUTCMonth(d.getUTCMonth() + 1)) mois.push(d.toISOString().slice(0, 7));
const precedent = (m) => { const d = new Date(`${m}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); };

const change = (await mensuel('CADUSD=X')).parMois;
const rendements = {};
for (const t of [...CANDIDATS, ...MEMBRES_INDICE]) {
  const { devise, parMois } = await mensuel(SYMBOLES[t] || t);
  const enUsd = (m) => (parMois[m] === undefined ? undefined : devise === 'CAD' ? parMois[m] * change[m] : parMois[m]);
  rendements[t] = mois.map((m) => {
    const a = enUsd(precedent(m)); const b = enUsd(m);
    return a && b ? Math.round((b / a - 1) * 10000) / 10000 : null;
  });
  console.log(t, devise, rendements[t].filter((x) => x !== null).length, 'mois');
}

const aujourdhui = new Date().toISOString().slice(0, 10);
const texte = `// Rendements mensuels en $ US (cours ajustés : dividendes et fractionnements inclus), de ${DEBUT} à ${FIN}.
// Généré par scripts/generer_rendements.mjs le ${aujourdhui} à partir de Yahoo Finance. null : le titre n'était pas encore coté.
// Titres canadiens convertis avec le taux CADUSD=X de fin de mois. Rendement d'un mois = cours de fin de mois ÷ cours de fin du mois précédent − 1.

export const SOURCE_RENDEMENTS = {
  base: 'Yahoo Finance (cours mensuels ajustés)', url: 'https://finance.yahoo.com/', date: '${aujourdhui}',
  periode: '${DEBUT} à ${FIN}', devise: 'dollars américains (titres canadiens convertis au taux de fin de mois)',
};

export const MOIS = ${JSON.stringify(mois)};

export const RENDEMENTS = {
${Object.entries(rendements).map(([t, l]) => `  ${t}: ${JSON.stringify(l)}, // ${BAISSES[t]?.nom || t}`).join('\n')}
};
`;
writeFileSync(new URL('../src/data/rendements.js', import.meta.url), texte);
console.log('src/data/rendements.js écrit.');

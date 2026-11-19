import { describe, expect, it } from 'vitest';
import { BAISSES, MEMBRES_INDICE } from '../src/data/crises.js';
import { baisseIndice, tableauCrises, testDeCrise } from '../src/lib/crises.js';

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const f = (t, id) => testDeCrise(t).find((x) => x.id === id);

describe('test de crise (simulation)', () => {
  it('a des données pour les 15 membres connus et les 5 candidats', () => {
    [...MEMBRES_INDICE, 'CSU', 'TOI', 'WSP', 'TFII', 'ARE'].forEach((t) => expect(BAISSES[t], t).toBeDefined());
  });
  it('moyenne de l\'indice sans les titres pas encore cotés', () => {
    expect(baisseIndice('covid').n).toBe(13); // GFL et Bending Spoons pas encore cotés
    expect(baisseIndice('baisse2022').baisse).toBeCloseTo(-27.6, 1);
  });
  it('effet à 10 % = 0,10 × (titre − indice)', () => {
    expect(f('CSU', 'covid').effet).toBeCloseTo(0.1 * (-27.3 - baisseIndice('covid').baisse), 2);
    expect(f('TOI', 'covid').titre).toBeNull(); // Topicus coté depuis février 2021
  });
  it('confirme le risque des titres écartés (Aecon et TFI dépassent -2 points)', () => {
    expect(testDeCrise('ARE').some((x) => x.depasse)).toBe(true);
    expect(testDeCrise('TFII').some((x) => x.depasse)).toBe(true);
    expect(testDeCrise('WSP').some((x) => x.depasse)).toBe(false);
    expect(testDeCrise('CSU').some((x) => x.depasse)).toBe(false);
  });
  it('aucun emoji', () => {
    expect(JSON.stringify(tableauCrises())).not.toMatch(emoji);
  });
});

describe('simulation à la demande', () => {
  it('WSP et CSU à 10 % réussissent la crise de 2022', async () => {
    const { simulerCrise } = await import('../src/lib/crises.js');
    const r = simulerCrise({ tickers: ['WSP', 'CSU'], fenetre: 'baisse2022', poids: 10 });
    expect(r.lignes.map((l) => l.ticker)).toEqual(['WSP', 'CSU']);
    expect(r.effetTotal).toBeCloseTo(0.1 * (-28.3 + 27.6) + 0.1 * (-27.5 + 27.6), 1);
    expect(r.reussi).toBe(true);
  });
  it('Topicus seul à 10 % échoue en 2022, mais réussit à 5 %', async () => {
    const { simulerCrise } = await import('../src/lib/crises.js');
    expect(simulerCrise({ tickers: ['TOI'], fenetre: 'baisse2022', poids: 10 }).reussi).toBe(false);
    expect(simulerCrise({ tickers: ['TOI'], fenetre: 'baisse2022', poids: 5 }).reussi).toBe(true);
  });
  it('le poids est plafonné à 10 % et un titre pas encore coté ne compte pas', async () => {
    const { simulerCrise } = await import('../src/lib/crises.js');
    expect(simulerCrise({ tickers: ['ARE'], fenetre: 'covid', poids: 50 }).poids).toBe(10);
    const r = simulerCrise({ tickers: ['TOI'], fenetre: 'covid', poids: 10 });
    expect(r.lignes[0].titre).toBeNull();
    expect(r.effetTotal).toBeNull();
  });
});

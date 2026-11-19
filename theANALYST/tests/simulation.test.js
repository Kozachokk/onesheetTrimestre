import { describe, expect, it } from 'vitest';
import { MOIS, RENDEMENTS, SOURCE_RENDEMENTS } from '../src/data/rendements.js';
import { SCENARIOS, indiceMensuel, membresUtilises, moisDesCrises, simulerMarche, statistiquesHistoriques } from '../src/lib/simulation.js';

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const largeur = (r) => r.avec.haut - r.avec.bas;

describe('simulation de marché', () => {
  it('a des données sourcées et datées sur 10 ans', () => {
    expect(MOIS).toHaveLength(120);
    expect(SOURCE_RENDEMENTS.base).toMatch(/Yahoo Finance/);
    expect(SOURCE_RENDEMENTS.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(RENDEMENTS.CSU.filter((x) => x !== null).length).toBe(120);
  });

  it('écarte les membres de l’indice qui ont moins d’un an d’historique', () => {
    expect(membresUtilises()).not.toContain('BSP');
    expect(indiceMensuel().every((x) => typeof x === 'number')).toBe(true);
  });

  it('repère les mois de chaque crise', () => {
    expect(moisDesCrises().covid.map((i) => MOIS[i])).toEqual(['2020-02', '2020-03']);
  });

  it('redonne les mêmes résultats avec la même graine', () => {
    const a = simulerMarche({ tickers: ['WSP'], n: 200 });
    const b = simulerMarche({ tickers: ['WSP'], n: 200 });
    expect(a.avec.mediane).toBe(b.avec.mediane);
  });

  it('sans titre, l’indice avec tes titres est l’indice actuel', () => {
    const r = simulerMarche({ tickers: [], n: 200 });
    expect(r.avec.mediane).toBe(r.actuel.mediane);
  });

  it('un marché intense donne une fourchette plus large qu’un marché calme', () => {
    const calme = simulerMarche({ tickers: ['CSU'], scenario: 'calme', n: 400 });
    const intense = simulerMarche({ tickers: ['CSU'], scenario: 'intense', n: 400 });
    expect(largeur(intense)).toBeGreaterThan(largeur(calme));
  });

  it('les crises allumées font baisser le résultat et sont rejouées', () => {
    const avec = simulerMarche({ tickers: ['CSU'], crises: true, n: 400 });
    const sans = simulerMarche({ tickers: ['CSU'], crises: false, n: 400 });
    expect(avec.actuel.mediane).toBeLessThan(sans.actuel.mediane);
    expect(avec.crisesParTrajectoire).toBeGreaterThan(0);
    expect(sans.crisesParTrajectoire).toBe(0);
  });

  it('plafonne le poids à 10 % par titre', () => {
    expect(simulerMarche({ tickers: ['CSU'], poids: 40, n: 50 }).poids).toBe(10);
  });

  it('avec les crises allumées, l’indice simulé reste proche de son vrai rendement', () => {
    const vrai = statistiquesHistoriques().indice.rendement;
    const r = simulerMarche({ tickers: [], annees: 10, n: 600 });
    expect(Math.abs(r.actuel.rendementAnnuel - vrai)).toBeLessThan(4);
  });

  it('aucun emoji dans les textes', () => {
    SCENARIOS.forEach((s) => expect(`${s.nom} ${s.explication}`).not.toMatch(emoji));
  });
});

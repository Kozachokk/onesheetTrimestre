import { describe, expect, it } from 'vitest';
import { TRANSACTIONS_ORBIS } from '../src/data/orbis.js';
import { estEstimation, resumeOrbis, transactionsOrbis, typeFr } from '../src/lib/orbis.js';

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const toutes = Object.values(TRANSACTIONS_ORBIS).flat();

describe('transactions Orbis M&A', () => {
  it('couvre les 5 acheteurs', () => {
    expect(Object.keys(TRANSACTIONS_ORBIS).sort()).toEqual(['ARE', 'CSU', 'TFII', 'TOI', 'WSP']);
  });
  it('écarte les chiffres d\'avant 2022 (ex. TRC : comptes de 2016)', () => {
    toutes.filter((t) => t.exercice).forEach((t) => expect(t.exercice >= '2022', t.cible).toBe(true));
    const trc = transactionsOrbis('WSP').find((t) => t.cible.startsWith('TRC'));
    expect(trc.valeur).toBe(3300);
    expect(trc.revenus).toBeUndefined();
    expect(trc.prixSurRevenus).toBeUndefined();
  });
  it('ne calcule pas de multiple sur une estimation ni sur une participation', () => {
    toutes.filter((t) => t.prixSurRevenus || t.prixSurBaiia).forEach((t) => {
      expect(estEstimation(t), t.cible).toBe(false);
      expect(typeFr(t.type)).toBe('Rachat complet');
    });
    const daseke = transactionsOrbis('TFII').find((t) => t.cible.startsWith('Daseke'));
    expect(daseke.prixSurBaiia).toBeCloseTo(6.8, 1);
  });
  it('écarte les rachats d\'actions et les achats de ses propres filiales', () => {
    expect(toutes.some((t) => /^TFI International/i.test(t.cible))).toBe(false);
    expect(toutes.some((t) => /^Aecon/i.test(t.cible))).toBe(false);
  });
  it('traduit les types de transaction', () => {
    expect(typeFr('Minority stake 49%')).toBe('Participation minoritaire (49 %)');
    expect(typeFr('Capital increase 12.7%')).toBe('Augmentation de capital (12,7 %)');
    expect(resumeOrbis('WSP').avecPrix).toBeGreaterThan(3);
  });
  it('aucun emoji', () => {
    expect(JSON.stringify(TRANSACTIONS_ORBIS)).not.toMatch(emoji);
  });
});

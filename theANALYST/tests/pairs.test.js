import { describe, expect, it } from 'vitest';
import { GROUPES, VALEURS } from '../src/data/pairs.js';
import { comparerAuxPairs, groupeDe, mediane } from '../src/lib/pairs.js';

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const ligne = (t, id) => comparerAuxPairs(t).lignes.find((l) => l.id === id);

describe('comparaison aux pairs (S&P Capital IQ)', () => {
  it('a les 12 sociétés de l\'export', () => {
    expect(Object.keys(VALEURS).sort()).toEqual(['ACM', 'ATRL', 'CSU', 'DSG', 'ENGH', 'J', 'LMN', 'OTEX', 'ROP', 'STN', 'TOI', 'WSP']);
  });
  it('calcule une médiane sans les valeurs NM ou NA', () => {
    expect(mediane([3, 1, 2])).toBe(2);
    expect(mediane([4, 1, 'NM', 2, 3])).toBe(2.5);
    expect(mediane(['NA'])).toBeNull();
  });
  it('compare WSP au génie-conseil, sans se compter lui-même', () => {
    expect(groupeDe('WSP')).toBe(GROUPES.genie);
    expect(ligne('WSP', 'croissance3ans').mediane).toBeCloseTo((7.13 + 13.37) / 2, 2);
    expect(ligne('WSP', 'croissance3ans').verdict).toBe('mieux');
    expect(ligne('WSP', 'rendementCapital').verdict).toBe('moins bien');
    expect(ligne('WSP', 'margeFcf').nPairs).toBe(3); // AECOM : NA
  });
  it('pour la dette, plus bas veut dire mieux', () => {
    expect(ligne('CSU', 'detteNetteBaiia').verdict).toBe('mieux');
    expect(ligne('CSU', 'detteNetteBaiia').nPairs).toBe(2); // trois pairs en NM
  });
  it('pas de pairs pour TFII et ARE', () => {
    expect(comparerAuxPairs('TFII')).toBeNull();
    expect(comparerAuxPairs('ARE')).toBeNull();
  });
  it('aucun emoji', () => {
    expect(JSON.stringify([GROUPES, VALEURS])).not.toMatch(emoji);
  });
});

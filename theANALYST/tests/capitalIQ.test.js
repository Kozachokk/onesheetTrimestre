import { describe, expect, it } from 'vitest';
import { RESUMES_CIQ } from '../src/data/capitalIQ.js';
import { ligneCiq, mentionSource, nomPaysCode, resumeCiq, texteExercices, vientDeCiq } from '../src/lib/capitalIQ.js';
import * as achats from '../src/lib/acquisitions.js';

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const fiche = (titre, nom) => achats.DONNEES.FICHES.find((f) => f.acquereur === titre && f.cible === nom);

describe('chiffres S&P Capital IQ', () => {
  it('reprend le nombre de filiales de chaque export', () => {
    expect(Object.fromEntries(Object.entries(RESUMES_CIQ).map(([t, r]) => [t, r.filiales])))
      .toEqual({ CSU: 987, TOI: 166, WSP: 506, TFII: 402, ARE: 36 });
  });
  it('résume Constellation par groupe interne', () => {
    const noms = resumeCiq('CSU').groupes.map((g) => g.nom);
    ['Volaris', 'Harris', 'Jonas', 'Vela', 'Perseus', 'Lumine'].forEach((g) => expect(noms).toContain(g));
    const total = resumeCiq('CSU').groupes.reduce((s, g) => s + g.filiales, 0);
    expect(total).toBe(987);
  });
  it('écarte les exercices antérieurs à 2022', () => {
    for (const r of Object.values(RESUMES_CIQ)) r.groupes.forEach((g) => g.exercices.forEach((a) => expect(a >= '2022').toBe(true)));
    achats.DONNEES.FICHES.filter((f) => f.capital_iq?.exercice).forEach((f) => expect(f.capital_iq.exercice >= '2022').toBe(true));
  });
  it('remplit seulement des cases vides, et le dit', () => {
    const lumine = fiche('CSU', 'Lumine Group (filiale cotée TSXV: LMN)');
    expect(lumine.baiia).toBeCloseTo(282.7);
    expect(vientDeCiq(lumine, 'baiia')).toBe(true);
    expect(vientDeCiq(lumine, 'revenus')).toBe(false);
    // Synchronoss garde son BAIIA d'origine (50,4) ; celui de Capital IQ est montré à part
    const sync = fiche('CSU', 'Synchronoss Technologies');
    expect(sync.baiia).toBe(50.4);
    expect(sync.employes).toBe(1096);
    expect(fiche('CSU', 'WideOrbit').employes).toBe(450);
    expect(fiche('CSU', 'Altera (ex-Allscripts hôpitaux)').employes).toBe(2640);
    expect(fiche('CSU', 'Optimal Blue (ex-Black Knight)').employes).toBe(319);
  });
  it('chaque chiffre Capital IQ affiché porte sa source et son année', () => {
    expect(mentionSource('2025')).toBe('Source : S&P Capital IQ, exercice 2025 (base payante, accessible seulement avec un compte, ici celui de la bibliothèque HEC Montréal)');
    expect(ligneCiq(fiche('WSP', 'Ricardo plc'))).toContain('Base payante, accessible seulement avec un compte');
    expect(ligneCiq(fiche('WSP', 'Ricardo plc'))).toMatch(/^S&P Capital IQ .*exercice 2025 : revenus 456,4 M USD/);
    expect(ligneCiq(fiche('TFII', 'Hearn Industrial Services'))).toBeNull(); // absente de Capital IQ
    expect(texteExercices(['2023', '2024', '2025'])).toBe('2023 à 2025');
    expect(nomPaysCode('GB')).toBe('Royaume-Uni');
  });
  it('aucun emoji dans les textes Capital IQ', () => {
    const textes = [...Object.values(RESUMES_CIQ).flatMap((r) => r.groupes.map((g) => g.nom)),
      ...achats.DONNEES.FICHES.map(ligneCiq).filter(Boolean)];
    textes.forEach((t) => expect(t).not.toMatch(emoji));
  });
});

describe('autres sources publiques', () => {
  it('Hulley & Kirkwood a ses vrais chiffres (Companies House, exercice juin 2025)', () => {
    const h = achats.DONNEES.FICHES.find((f) => f.cible === 'Hulley & Kirkwood (R.-U.)');
    expect(h.revenus).toBeCloseTo(10.865);
    expect(h.source).toContain('company-information.service.gov.uk/company/SC132484');
    expect(achats.statutChiffres('Hulley & Kirkwood (R.-U.)')).toMatch(/^Oui/);
  });
  it('les taux de change viennent de la Banque du Canada (moyennes 2025)', () => {
    expect(achats.DONNEES.TAUX_USD.EUR).toBeCloseTo(1.5782 / 1.3978, 3);
    expect(achats.DONNEES.TAUX_SOURCE.url).toMatch(/^https:\/\/www\.bankofcanada\.ca\//);
  });
});

describe('méthodologie', () => {
  it('donne une recette Capital IQ pour chaque acheteur, sans emoji', async () => {
    const { recetteCiq } = await import('../src/lib/capitalIQ.js');
    expect(recetteCiq('WSP').resultat).toBe('506 filiales, dont 32 avec des revenus depuis 2022');
    expect(recetteCiq('CSU').critere).toContain('Constellation Software Inc.');
    ['CSU', 'TOI', 'WSP', 'TFII', 'ARE'].forEach((t) => expect(JSON.stringify(recetteCiq(t))).not.toMatch(emoji));
  });
});

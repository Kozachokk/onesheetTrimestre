import { describe, expect, it } from 'vitest';
import { CHOIX } from '../src/data/proposition.js';
import { construireProposition, maintenantMontreal, signauxAvecLien, verifierProposition } from '../src/lib/proposition.js';

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const complete = () => construireProposition({ nomEquipe: 'Equipe test', video: 'https://youtu.be/abc123' });

describe('proposition d\'indice (trimestre.index-proposal/v2)', () => {
  it('propose WSP et CSU, sans TOI, TFII ni ARE (écartés par le test de crise)', () => {
    expect(CHOIX.map((c) => c.ticker)).toEqual(['WSP', 'CSU']);
  });
  it('un fichier complet respecte toutes les règles publiées', () => {
    expect(verifierProposition(complete())).toEqual([]);
  });
  it('refuse un fichier sans vidéo ni nom d\'équipe', () => {
    const erreurs = verifierProposition(construireProposition({ nomEquipe: '', video: '' }));
    expect(erreurs.some((e) => e.startsWith('judging.video'))).toBe(true);
    expect(erreurs.some((e) => e.startsWith('team.name'))).toBe(true);
  });
  it('repère un texte trop long et un titre hors stratégie', () => {
    const p = complete();
    p.picks = [{ ...p.picks[0], ticker: 'REI.UN', thesis: 'x'.repeat(281) }];
    const erreurs = verifierProposition(p);
    expect(erreurs.some((e) => e.includes('.ticker'))).toBe(true);
    expect(erreurs.some((e) => e.includes('.thesis'))).toBe(true);
  });
  it('chaque titre a au moins un signal vérifiable en un clic', () => {
    CHOIX.forEach((c) => expect(signauxAvecLien(c), c.ticker).toBeGreaterThan(0));
  });
  it('donne l\'heure de Montréal avec son décalage', () => {
    expect(maintenantMontreal(new Date('2026-11-19T02:00:00Z'))).toBe('2026-11-18T21:00:00-05:00');
  });
  it('aucun emoji dans la proposition', () => {
    expect(JSON.stringify(complete())).not.toMatch(emoji);
  });
});

describe('proposition contre le schéma officiel de trimestre.ca (copie du 18 nov. 2026)', () => {
  it('le fichier généré passe le schéma JSON officiel', async () => {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const { default: ajouterFormats } = await import('ajv-formats');
    const { readFileSync } = await import('node:fs');
    const schema = JSON.parse(readFileSync(new URL('./fixtures/index-proposal.v2.json', import.meta.url), 'utf-8'));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    ajouterFormats(ajv);
    const valider = ajv.compile(schema);
    const ok = valider(complete());
    expect(valider.errors || []).toEqual([]);
    expect(ok).toBe(true);
    expect(valider(construireProposition({ nomEquipe: '', video: '' }))).toBe(false);
  });
});

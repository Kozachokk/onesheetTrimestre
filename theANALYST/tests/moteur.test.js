// Tests du moteur : données, ratios, pointage, fiche, CSV du courtier et assistant par mots-clés.
import { beforeAll, describe, expect, it } from 'vitest';
import config from '../src/config/config.json';
import { chargerBase } from '../src/lib/donnees.js';
import { DEFINITIONS, FORMULES, calculerRatios, note, seuilsParDefaut } from '../src/lib/ratios.js';
import { CRITERES, PROFILS, classer, expliquerEcart, gagnant, poidsDuProfil, seuilsDuProfil, simulationSolidite } from '../src/lib/pointage.js';
import { sectionsDetail } from '../src/lib/detail.js';
import { ficheQualitative } from '../src/lib/qualitatif.js';
import { graphiquesDuTitre } from '../src/lib/series.js';
import { ajusterSelonPortefeuille, analyserCsvCourtier, resumePourIA } from '../src/lib/csvCourtier.js';
import { REFUS_CONSEIL, profilDepuisTexte, repondreEntreprise } from '../src/lib/assistant/motsCles.js';
import { csvClassement, justification } from '../src/lib/rapport.js';
import { formater } from '../src/lib/format.js';

const SEUILS = seuilsParDefaut(config.taux_obligataire_10ans);
const ZERO = Object.fromEntries(DEFINITIONS.map((d) => [d.id, 0]));
const profil = (id) => PROFILS.find((p) => p.id === id);
let base;
const classement = (id, poids, filtres) => classer(base, poids || poidsDuProfil(profil(id)), seuilsDuProfil(profil(id), SEUILS),
  filtres ?? profil(id).filtres, config.filtres);

beforeAll(async () => { base = await chargerBase(config.taux_change); });

describe('ratios', () => {
  it('note linéaire dans les deux sens', () => {
    expect(note(0.125, 0.05, 0.2)).toBeCloseTo(50);
    expect(note(23.5, 35, 12)).toBeCloseTo(50);
    expect(note(99, 0.05, 0.2)).toBe(100);
    expect(note(null, 0, 1)).toBeNull();
  });
  it('chaque ratio a une formule', () => {
    expect(DEFINITIONS.map((d) => d.id).sort()).toEqual(Object.keys(FORMULES).sort());
    expect(DEFINITIONS).toHaveLength(32);
  });
  it('une entreprise vide donne n. d. sans planter', () => {
    const v = calculerRatios({ ticker: 'X', champs: {} });
    expect(Object.values(v).every((x) => x.valeur === null)).toBe(true);
    expect(formater(null, 'pct')).toBe('n. d.');
  });
  it('données réelles : cinq entreprises, valeurs, sources et dates', () => {
    expect(Object.keys(base).sort()).toEqual(['ARE', 'CSU', 'TFII', 'TOI', 'WSP']);
    const csu = calculerRatios(base.CSU);
    expect(csu.roic.valeur).toBeCloseTo(0.1862);
    expect(csu.p_fcf.valeur).toBeCloseTo(74100 / 2390);
    expect(csu.croissance_bpa.valeur).toBeCloseTo((24.15 / 26.67) ** 0.5 - 1);
    expect(csu.roic.source).toContain('stockanalysis');
    expect(csu.roic.date).toBe('2026-11-12');
    expect(csu.rendement_6mois.source).toContain('Yahoo');
    const are = calculerRatios(base.ARE);
    expect(are.pe.valeur).toBeNull();
    expect(are.marge_brute.valeur).toBeCloseTo(394085 / 5434678);
    expect(base.WSP.entites.length).toBeGreaterThan(10);
    expect(base.TOI.evenements.length).toBeGreaterThan(5);
  });
});

describe('pointage', () => {
  it('les sept profils ont les poids demandés, qui font 100', () => {
    expect(PROFILS).toHaveLength(7);
    PROFILS.forEach((p) => {
      expect(Object.keys(p.poids)).toEqual(CRITERES.map((c) => c.id));
      expect(Object.values(p.poids).reduce((a, b) => a + b, 0)).toBe(100);
    });
    expect(Object.values(profil('buffett').poids)).toEqual([15, 15, 10, 20, 20, 15, 5]);
    expect(Object.values(profil('graham').poids)).toEqual([30, 25, 0, 5, 5, 30, 5]);
    expect(Object.values(profil('leonard').poids)).toEqual([0, 20, 25, 10, 30, 10, 5]);
    expect(Object.values(profil('croissance').poids)).toEqual([5, 5, 35, 25, 15, 10, 5]);
  });
  it('le score est la moyenne pondérée et la confiance suit les données', () => {
    const e = { T: { ticker: 'T', nom: 'T', champs: { roic: { valeur: 0.13, source: 't', date: '' } } } };
    const r = classer(e, { ...ZERO, roic: 1, ev_ebit: 3 }, SEUILS, [], config.filtres)[0];
    expect(r.score).toBeCloseTo(50);
    expect(r.confiance).toBeCloseTo(0.25);
  });
  it('filtres : Aecon et TFI éliminées sous Buffett et Leonard', () => {
    ['buffett', 'leonard'].forEach((id) => {
      const res = classement(id);
      expect(res.filter((r) => r.elimine).map((r) => r.ticker).sort()).toEqual(['ARE', 'TFII']);
      expect(gagnant(res)).not.toBeNull();
    });
  });
  it('changer un curseur change le classement', () => {
    const avant = classement('leonard').map((r) => r.ticker);
    const apres = classement('leonard', { ...ZERO, rendement_dividende: 100 }, []).map((r) => r.ticker);
    expect(apres[0]).toBe('TFII');
    expect(apres).not.toEqual(avant);
  });
  it('tous les poids à zéro : aucun score, aucun plantage', () => {
    const res = classement('buffett', ZERO);
    expect(res.every((r) => r.score === null)).toBe(true);
    expect(gagnant(res)).toBeNull();
    expect(justification(res, ZERO)).toBeNull();
  });
  it('simulation, explication d\'écart, justification et CSV', () => {
    const res = classement('leonard');
    const poids = poidsDuProfil(profil('leonard'));
    const sim = simulationSolidite(res, poids, 500);
    expect(Object.values(sim.frequences).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(sim.gagnant).toBe(res[0].ticker);
    const ecarts = expliquerEcart(res[0], res[1], 40);
    expect(ecarts.reduce((s, x) => s + x.ecart, 0)).toBeCloseTo(res[0].score - res[1].score);
    const j = justification(res, poids);
    expect(j.premier.ticker).toBe(res[0].ticker);
    expect(j.elimines).toHaveLength(2);
    expect(csvClassement(res).trim().split('\n')).toHaveLength(6);
  });
});

describe('fiche', () => {
  it('sections détaillées : huit sections, chaque valeur a une source', () => {
    const r = classement('buffett').find((x) => x.ticker === 'WSP');
    const sections = sectionsDetail(base.WSP, r.valeurs, config.taux_change);
    expect(sections.map((s) => s.titre)).toEqual(['Rentabilité', 'Croissance', 'Évaluation', 'Santé financière', 'Flux de trésorerie',
      'Efficacité', 'Retour aux actionnaires', 'Marché']);
    sections.flatMap((s) => s.lignes).forEach((l) => { if (l.valeur !== null) expect(l.source, l.nom).not.toBe(''); });
  });
  it('fiche qualitative : notes de 1 à 5 sourcées, sinon non évalué', () => {
    const r = classement('buffett').find((x) => x.ticker === 'CSU');
    const fiche = ficheQualitative(base.CSU, r);
    expect(fiche).toHaveLength(6);
    fiche.forEach((c) => {
      if (c.note === null) expect(c.justification).toBe('non évalué');
      else { expect(c.note).toBeGreaterThanOrEqual(1); expect(c.note).toBeLessThanOrEqual(5); expect(c.source).not.toBe(''); }
    });
    expect(fiche.find((c) => c.nom === 'Gouvernance').note).toBeNull();
  });
  it('quatre graphiques avec analyse et un seuil de 20 pour le P/FCF', () => {
    const g = graphiquesDuTitre(base.TOI, classement('buffett'), 20);
    expect(g).toHaveLength(4);
    g.forEach((x) => { expect(x.analyse.length).toBeGreaterThan(10); expect(x.etiquettes.length).toBeGreaterThan(0); });
    expect(g[3].seuil.valeur).toBe(20);
    expect(g[1].series).toHaveLength(3);
  });
});

describe('CSV du courtier', () => {
  const positions = 'Account Type,Account Number,Symbol,Name,Quantity,Market Value\nTFSA,HQ123456,CSU,Constellation,2,7000\nFHSA,HQ999,XEQT,iShares,100,3000\n';
  it('lit des positions et ne garde aucun numéro de compte', () => {
    const a = analyserCsvCourtier(positions);
    expect(a.titres.map((t) => t.symbole)).toEqual(['CSU', 'XEQT']);
    expect(a.titres[0].poids).toBeCloseTo(0.7);
    expect([...a.comptes].sort()).toEqual(['CELI', 'CELIAPP']);
    expect(JSON.stringify(a)).not.toContain('HQ123456');
    expect(resumePourIA(a)).not.toMatch(/HQ|7000/);
  });
  it('lit des activités (achats moins ventes) et refuse un fichier illisible', () => {
    const activites = 'date,transaction,symbol,amount,account\n2026-01-02,BUY,WSP,-1000,RRSP\n2026-02-02,SELL,WSP,400,RRSP\n2026-03-01,DIV,WSP,5,RRSP\n';
    const a = analyserCsvCourtier(activites);
    expect(a.titres[0].valeur).toBe(600);
    expect(a.comptes).toEqual(['REER']);
    expect(analyserCsvCourtier('a,b\n1,2\n').erreur).toBeTruthy();
  });
  it('ajuste les poids et explique pourquoi', () => {
    const { poids, explication } = ajusterSelonPortefeuille(poidsDuProfil(profil('croissance')), analyserCsvCourtier(positions));
    expect(poids.dette_fcf).toBeGreaterThan(10);
    expect(explication).toMatch(/CELIAPP/);
  });
});

describe('assistant sans clé', () => {
  it('traduit une description en poids qui font environ 100', () => {
    const { poids, explication } = profilDepuisTexte('Je vise la retraite dans 25 ans, je suis prudent et je veux des dividendes');
    const total = Object.values(poids).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(97);
    expect(total).toBeLessThan(103);
    expect(poids.rendement_dividende).toBeGreaterThan(poids.p_fcf);
    expect(explication).toMatch(/horizon long/);
    expect(profilDepuisTexte('bonjour').poids).toBeNull();
  });
  it('répond à partir des données, avoue son ignorance et ne conseille jamais', () => {
    const res = classement('buffett');
    const r = res.find((x) => x.ticker === 'CSU');
    expect(repondreEntreprise('Quel est le ROIC ?', base.CSU, r)).toMatch(/18,6 %.*stockanalysis/);
    expect(repondreEntreprise('Est-ce que je devrais acheter ?', base.CSU, r)).toBe(REFUS_CONSEIL);
    expect(repondreEntreprise('Quelle est la couleur du logo ?', base.CSU, r)).toMatch(/Je ne sais pas/);
    expect(repondreEntreprise('Qui dirige ?', base.CSU, r, { nom: 'Mark Miller', titre: 'Président' })).toMatch(/Mark Miller/);
    expect(repondreEntreprise('Quel est le nom du chien du PDG ?', base.CSU, r, { nom: 'Mark Miller', titre: 'Président' })).toMatch(/Je ne sais pas/);
    expect(repondreEntreprise('Y a-t-il des litiges ?', base.TOI, res.find((x) => x.ticker === 'TOI'))).toMatch(/Tax/);
  });
});

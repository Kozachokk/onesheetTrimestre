// Tests du moteur : données, ratios, pointage, fiche, CSV du courtier et assistant par mots-clés.
import { beforeAll, describe, expect, it } from 'vitest';
import config from '../src/config/config.json';
import { chargerBase } from '../src/lib/donnees.js';
import { DEFINITIONS, FORMULES, calculerRatios, note, seuilsParDefaut } from '../src/lib/ratios.js';
import { CRITERES, PROFILS, classer, expliquerEcart, gagnant, poidsDuProfil, seuilsDuProfil, simulationSolidite } from '../src/lib/pointage.js';
import { sectionsDetail } from '../src/lib/detail.js';
import { ficheQualitative } from '../src/lib/qualitatif.js';
import { graphiquesDuTitre } from '../src/lib/series.js';
import { CSV_DEMO, ajusterSelonPortefeuille, analyserCsvCourtier, resumePourIA } from '../src/lib/csvCourtier.js';
import { REFUS_CONSEIL, profilDepuisTexte, repondreEntreprise } from '../src/lib/assistant/motsCles.js';
import { csvClassement, justification } from '../src/lib/rapport.js';
import { formater } from '../src/lib/format.js';
import * as achats from '../src/lib/acquisitions.js';
import { traduire } from '../src/lib/traduction/traducteurDom.js';
import { arrondirA100, enMontants, plafonner, repartir } from '../src/lib/repartition.js';
import { harmoniserPrix, lireNombre, texteprix } from '../src/lib/prixAchat.js';

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
  it('l\'exemple de démonstration est lisible', () => {
    const a = analyserCsvCourtier(CSV_DEMO);
    expect(a.titres).toHaveLength(5);
    expect([...a.comptes].sort()).toEqual(['CELI', 'CELIAPP', 'REER']);
    expect(a.titres.reduce((s, t) => s + t.poids, 0)).toBeCloseTo(1);
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
    expect(profilDepuisTexte('Retirement in 25 years, cautious, I want dividends').poids.rendement_dividende).toBeGreaterThan(20);
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

describe('sous-compagnies (entreprises achetées)', () => {
  it('chaque titre a sa liste d\'achats et ses fiches', () => {
    expect(Object.keys(achats.DONNEES.LISTES).sort()).toEqual(['ARE', 'CSU', 'TFII', 'TOI', 'WSP']);
    expect(achats.DONNEES.LISTES.CSU).toHaveLength(15);
    expect(achats.fichesAvecRatios('CSU')).toHaveLength(10);
    const synchronoss = achats.fichesAvecRatios('CSU').find((f) => f.cible === 'Synchronoss Technologies');
    expect(synchronoss.prixSurRevenus).toBeCloseTo(1.78);
    expect(synchronoss.prixSurBaiia).toBeCloseTo(6.1);
  });
  it('indique où trouver les comptes officiels de chaque entreprise achetée', () => {
    const choix = achats.choixEntreprises('TOI');
    expect(choix.length).toBeGreaterThan(0);
    expect(choix.every((c) => ['edgar', 'registre', 'rien'].includes(c.type))).toBe(true);
    const csu = achats.choixEntreprises('CSU');
    const edgar = csu.find((c) => c.type === 'edgar');
    expect(edgar).toBeTruthy();
    expect(achats.lienEdgar(achats.trouverFiche(edgar.nom).cik)).toMatch(/^https:\/\/www\.sec\.gov\//);
  });
  it('les estimations restent identifiées comme peu fiables', () => {
    const v = achats.verdict();
    expect(v.total).toBe(9);
    expect(v.reussis).toBe(2);
    expect(v.niveau).toBe('rouge');
    expect(achats.estimations('TOI')).toHaveLength(0);
  });
});

describe('traduction anglaise de démonstration', () => {
  it('traduit les textes connus et garde les espaces autour', () => {
    expect(traduire('Classement')).toBe('Ranking');
    expect(traduire('  Mon profil ')).toBe('  My profile ');
    expect(traduire('Étape 1 · avant d’entrer')).toBe('Step 1 · before entering');
    expect(traduire('Dette = 5,2 ans de FCF')).toBe('Debt = 5,2 years of FCF');
    expect(traduire('Pourquoi WSP Global est en tête')).toBe('Why WSP Global is in the lead');
  });
  it('traduit les explications des ratios et les réponses de l\'assistant', () => {
    expect(traduire('Bénéfice net ÷ capitaux propres')).toBe("Net income ÷ shareholders' equity");
    expect(traduire('Dette / FCF : 4,7 ans (source : stockanalysis.com, 2026-11-12).')).toBe('Debt / FCF: 4,7 yrs (source: stockanalysis.com, 2026-11-12).');
    expect(traduire("C'est réglé. J'ai compris un horizon long, une faible tolérance au risque : j'ai donc mis l'accent sur dividende et solidité (peu de dette)."))
      .toBe('Done. I understood a long horizon, a low risk tolerance: so I emphasised dividend, strength (low debt).');
  });
  it('traduit les phrases de la répartition', () => {
    expect(traduire('total : 100 %')).toBe('total: 100%');
    expect(traduire('Avec des actions entières, 9 906 $ sont investis ; il reste 94 $ en liquidités.')).toBe('With whole shares, 9 906 $ is invested; 94 $ remains in cash.');
    expect(traduire('Sans part : TOI (pointage sous 50), CSU (éliminé (Perte nette sur 12 mois)).')).toBe('No share: TOI (score below 50), CSU (eliminated (Net loss over 12 months)).');
  });
  it('laisse tels quels les chiffres, les noms et les textes inconnus', () => {
    expect(traduire('51')).toBeNull();
    expect(traduire('WSP')).toBeNull();
    expect(traduire('Constellation Software')).toBeNull();
  });
});

describe('répartition du portefeuille', () => {
  const somme = (l) => l.reduce((s, x) => s + x.pct, 0);
  it('fait toujours 100 % et ne donne rien aux titres éliminés', () => {
    const res = classement('buffett');
    const { lignes, exclus } = repartir(res, { scoreMinimum: 0, maxTitres: 5, plafond: 0.4 });
    expect(somme(lignes)).toBe(100);
    expect(lignes.map((l) => l.ticker)).not.toContain('ARE');
    expect(lignes.map((l) => l.ticker)).not.toContain('TFII');
    expect(exclus.map((x) => x.ticker).sort()).toEqual(['ARE', 'TFII']);
    lignes.forEach((l) => expect(l.pct).toBeLessThanOrEqual(40));
  });
  it('respecte le plafond, le nombre de titres et le pointage minimum', () => {
    const res = classement('leonard');
    expect(repartir(res, { maxTitres: 1, scoreMinimum: 0 }).lignes).toEqual([expect.objectContaining({ ticker: res[0].ticker, pct: 100 })]);
    const egale = repartir(res, { methode: 'egale', maxTitres: 3, scoreMinimum: 0, plafond: 1 });
    expect(egale.lignes.map((l) => l.pct).sort()).toEqual([33, 33, 34]);
    expect(repartir(res, { scoreMinimum: 101 }).lignes).toHaveLength(0);
  });
  it('complète avec les titres suivants plutôt que de tout mettre sur un seul', () => {
    const { lignes } = repartir(classement('revenu'), { scoreMinimum: 50, maxTitres: 5, plafond: 0.4 });
    expect(somme(lignes)).toBe(100);
    expect(lignes.length).toBeGreaterThanOrEqual(3);
    lignes.forEach((l) => expect(l.pct).toBeLessThanOrEqual(40));
    expect(lignes.some((l) => l.complement)).toBe(true);
  });
  it('outils : plafond, arrondi et montants', () => {
    const p = plafonner([0.7, 0.2, 0.1], 0.5);
    expect(p[0]).toBeCloseTo(0.5);
    expect(p[1] + p[2]).toBeCloseTo(0.5);
    expect(p[1] / p[2]).toBeCloseTo(2);
    expect(plafonner([0.6, 0.4], 0.3).every((x) => Math.abs(x - 0.5) < 1e-9)).toBe(true); // plafond relevé à 50 %
    expect(arrondirA100([1 / 3, 1 / 3, 1 / 3]).reduce((a, b) => a + b, 0)).toBe(100);
    const m = enMontants([{ ticker: 'A', pct: 60 }, { ticker: 'B', pct: 40 }], 10000, { A: 99, B: null });
    expect(m[0].actions).toBe(60);
    expect(m[1].actions).toBeNull();
  });
});

describe('prix payés des sous-compagnies', () => {
  // fr() met une espace insécable entre les milliers : on la remplace par une espace simple pour comparer
  const prix = (montant, resume, devise = 'USD', unite = 'millions') => texteprix(harmoniserPrix({ montant, resume }, devise, unite)).replace(/[\u00a0\u202f]/g, ' ');
  it('lit les nombres écrits à l\'anglaise', () => {
    expect(lireNombre('22,508')).toBe(22508);
    expect(lireNombre('168.0')).toBe(168);
    expect(lireNombre('56.1 million')).toBe(56.1);
    expect(lireNombre(null)).toBeNull();
  });
  it('ramène tous les prix au même format (millions, virgule décimale, espace pour les milliers)', () => {
    expect(prix('22,508', 'for total consideration of EUR 22,508 thousand.', 'EUR', 'milliers')).toBe('22,5 M EUR');
    expect(prix('3.4', 'for a total cash purchase price of US$3.4 billion ($4.6 billion)', 'CAD')).toBe('3 400 M USD');
    expect(prix('2360', 'for US$1.75 billion ($2.36 billion).', 'CAD')).toBe('2 360 M CAD');
    expect(prix('817.0', 'for a total purchase price of $817.0 million')).toBe('817 M USD');
    expect(prix('56.1 million', 'total consideration of €56.1 million.', 'EUR')).toBe('56,1 M EUR');
    expect(prix('223629', 'completed the acquisition of 100% of the shares of Cipal', 'EUR', 'milliers')).toBe('223,6 M EUR');
    expect(prix('999', 'cash consideration of $757 plus holdbacks and contingent consideration, totaling $999, in the six months')).toBe('999 M USD');
    expect(prix(null, 'x')).toBe('n. d.');
  });
  it('signale un prix par action et un montant qui ne correspond pas au résumé', () => {
    const offre = harmoniserPrix({ montant: '51.50', resume: 'to acquire all shares of Arcadis N.V. at €51.50 per share' }, 'CAD');
    expect(offre.parAction).toBe(true);
    expect(texteprix(offre)).toBe('51,50 EUR par action');
    const ecart = harmoniserPrix({ montant: '673', resume: 'cash consideration of $1,241 plus cash holdbacks of $313, totaling $1,605 for the nine months' }, 'USD');
    expect(ecart.note).toMatch(/^à vérifier/);
  });
  it('aucun emoji dans les libellés des sous-compagnies', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const titres = Object.keys(achats.DONNEES.LISTES);
    const textes = [...titres.flatMap((t) => achats.choixEntreprises(t).map((c) => c.etiquette)),
      ...Object.values(achats.DONNEES.METHODES).map((m) => m.type), achats.verdict().titre,
      ...titres.flatMap((t) => achats.estimations(t).map((e) => `${e.confiance} ${e.revenus}`)),
      ...titres.flatMap((t) => achats.DONNEES.LISTES[t].map((l) => achats.statutChiffres(l.fiche)))];
    textes.forEach((t) => expect(t).not.toMatch(emoji));
  });
});

import { describe, expect, it } from 'vitest';
import { BASES_HEC, BASES_PAYS, PAYS_CIBLES } from '../src/data/bases.js';
import { basesHec, etiquetteChoix, nomRecherche, registrePays } from '../src/lib/bases.js';
import * as achats from '../src/lib/acquisitions.js';

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const titres = Object.keys(achats.DONNEES.LISTES);
const tousLesChoix = titres.flatMap((t) => achats.choixEntreprises(t));

describe('bases de données des entreprises achetées', () => {
  it('chaque entreprise de PAYS_CIBLES existe dans le site et a un pays connu', () => {
    const noms = new Set(tousLesChoix.map((c) => c.nom));
    for (const [nom, cible] of Object.entries(PAYS_CIBLES)) {
      expect(noms.has(nom), nom).toBe(true);
      expect(BASES_PAYS[cible.pays], nom).toBeDefined();
    }
  });
  it('donne un lien https pour chaque registre de pays connu', () => {
    for (const nom of Object.keys(PAYS_CIBLES)) expect(registrePays(nom).url).toMatch(/^https:\/\//);
    expect(registrePays('Cipal Schaubroeck').url).toBe('https://consult.cbso.nbb.be/consult-enterprise/0664474051');
    expect(registrePays('Ricardo plc').url).toContain('search/companies?q=Ricardo%20plc');
  });
  it('ne devine pas le pays quand il est inconnu', () => {
    expect(registrePays('DerbySoft')).toBeNull();
  });
  it('ajoute le pays de Communica et de Triangle Warehouse (S&P Capital IQ)', () => {
    expect(registrePays('Communica Public Affairs Inc.').code).toBe('CA');
    expect(registrePays('Triangle Warehouse').code).toBe('US');
  });
  it('enlève les précisions entre parenthèses avant la recherche', () => {
    expect(nomRecherche('Proxion Plan (Finlande)')).toBe('Proxion Plan');
    expect(nomRecherche('TRC Companies')).toBe('TRC Companies');
  });
  it('propose les trois bases HEC pour toutes les entreprises', () => {
    expect(BASES_HEC.map((b) => b.nom)).toEqual(['S&P Capital IQ', 'FP Advisor', 'Orbis']);
    expect(basesHec('Duna Services')).toHaveLength(3);
    BASES_HEC.forEach((b) => expect(b.url).toMatch(/^https:\/\/www\.hec\.ca\//));
  });
  it('remplace « aucune base » par le registre du pays dans la liste déroulante', () => {
    const proxion = tousLesChoix.find((c) => c.nom === 'Proxion Plan (Finlande)');
    expect(etiquetteChoix(proxion)).toContain('Registre du commerce finlandais');
    const edgar = tousLesChoix.find((c) => c.type === 'edgar');
    expect(etiquetteChoix(edgar)).toBe(edgar.etiquette);
  });
  it('aucun emoji dans les textes des bases', () => {
    const textes = [...Object.values(BASES_PAYS).flatMap((b) => [b.pays, b.nom, b.contenu]),
      ...BASES_HEC.flatMap((b) => [b.nom, b.pourQui, b.contenu, b.connexion]), ...tousLesChoix.map(etiquetteChoix)];
    textes.forEach((t) => expect(t).not.toMatch(emoji));
  });
});

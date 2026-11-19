/*
 * proposition.js : construit le fichier JSON de la proposition d'indice et le vérifie selon les règles publiées
 * (https://trimestre.ca/schema/index-proposal.v2.json). Ce contrôle sert à repérer les erreurs avant l'envoi ;
 * la vérification officielle reste celle de https://trimestre.ca/indexes/validate/.
 */
import { CHOIX, EQUIPE, OUTIL, SCHEMA_URL } from '../data/proposition.js';

export const TITRES_PERMIS = ['CSU', 'TOI', 'WSP', 'TFII', 'ARE'];
const TYPES_SOURCE = ['filing', 'api', 'transcript', 'dataset', 'other'];

/** Date et heure de Montréal au format ISO (ex. 2026-11-18T21:00:00-05:00). */
export function maintenantMontreal(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const decalage = Math.round((local - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const signe = decalage >= 0 ? '+' : '-';
  const h = String(Math.floor(Math.abs(decalage) / 60)).padStart(2, '0');
  const m = String(Math.abs(decalage) % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${signe}${h}:${m}`;
}

/** Le fichier de proposition complet, prêt à envoyer. */
export function construireProposition({ nomEquipe = EQUIPE.name, video = '', tickers = CHOIX.map((c) => c.ticker), date } = {}) {
  return {
    $schema: SCHEMA_URL,
    spec: 'trimestre.index-proposal/v2',
    submitted_at: maintenantMontreal(date),
    team: { name: nomEquipe.trim(), members: EQUIPE.members },
    base_index: 'serial-acquirers',
    execution: { fill: 'on-acceptance', funded_by: 'cash', sizing: 'index-rules' },
    picks: CHOIX.filter((c) => tickers.includes(c.ticker)),
    tool: OUTIL,
    judging: { video: video.trim() },
  };
}

const estUri = (x) => { try { const u = new URL(x); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; } };
const estTexte = (x, min, max) => typeof x === 'string' && x.length >= min && x.length <= max;

/** Liste des erreurs (texte en français, avec l'endroit) ; vide si le fichier respecte les règles publiées. */
export function verifierProposition(p) {
  const e = [];
  const exiger = (ok, ou, quoi) => { if (!ok) e.push(`${ou} : ${quoi}`); };
  const permis = new Set(['$schema', 'spec', 'submitted_at', 'team', 'base_index', 'execution', 'picks', 'tool', 'judging']);
  Object.keys(p).forEach((k) => exiger(permis.has(k), k, 'champ non prévu par le format'));
  exiger(p.spec === 'trimestre.index-proposal/v2', 'spec', 'doit valoir trimestre.index-proposal/v2');
  exiger(estTexte(p.team?.name, 1, 60), 'team.name', 'nom d’équipe obligatoire (1 à 60 caractères)');
  const membres = p.team?.members || [];
  exiger(membres.length >= 1 && membres.length <= 6, 'team.members', '1 à 6 membres');
  membres.forEach((m, i) => {
    exiger(estTexte(m.name, 1, 80), `team.members[${i}].name`, '1 à 80 caractères');
    if (m.role !== undefined) exiger(estTexte(m.role, 0, 60), `team.members[${i}].role`, '60 caractères au plus');
  });
  exiger(p.base_index === 'serial-acquirers', 'base_index', 'doit valoir serial-acquirers pour notre indice');
  exiger(p.execution?.fill === 'on-acceptance' && p.execution?.funded_by === 'cash' && p.execution?.sizing === 'index-rules',
    'execution', 'valeurs imposées : on-acceptance, cash, index-rules');
  const choix = p.picks || [];
  exiger(choix.length >= 1 && choix.length <= 5, 'picks', '1 à 5 titres');
  exiger(new Set(choix.map((c) => c.ticker)).size === choix.length, 'picks', 'un même titre apparaît deux fois');
  choix.forEach((c, i) => {
    const ou = `picks[${i}] (${c.ticker})`;
    exiger(TITRES_PERMIS.includes(c.ticker), `${ou}.ticker`, `doit être un de ${TITRES_PERMIS.join(', ')}`);
    if (c.exchange !== undefined) exiger(['TSX', 'TSXV'].includes(c.exchange), `${ou}.exchange`, 'TSX ou TSXV');
    exiger(estTexte(c.thesis, 1, 280), `${ou}.thesis`, `1 à 280 caractères (actuellement ${c.thesis?.length ?? 0})`);
    exiger(estTexte(c.edge, 1, 280), `${ou}.edge`, `1 à 280 caractères (actuellement ${c.edge?.length ?? 0})`);
    const signaux = c.signals || [];
    exiger(signaux.length >= 1 && signaux.length <= 10, `${ou}.signals`, '1 à 10 signaux');
    signaux.forEach((s, j) => {
      const o = `${ou}.signals[${j}]`;
      exiger(typeof s.name === 'string' && s.name.length > 0, `${o}.name`, 'obligatoire');
      exiger(typeof s.value === 'number' || typeof s.value === 'string', `${o}.value`, 'nombre ou texte obligatoire');
      exiger(TYPES_SOURCE.includes(s.source?.type), `${o}.source.type`, TYPES_SOURCE.join(', '));
      exiger(typeof s.source?.ref === 'string' && s.source.ref.length > 0, `${o}.source.ref`, 'obligatoire');
      if (s.source?.url !== undefined) exiger(estUri(s.source.url), `${o}.source.url`, 'adresse web invalide');
    });
    if (c.risks !== undefined) {
      exiger(c.risks.length <= 5, `${ou}.risks`, '5 risques au plus');
      c.risks.forEach((r, j) => exiger(estTexte(r, 0, 200), `${ou}.risks[${j}]`, `200 caractères au plus (actuellement ${r.length})`));
    }
    if (c.review_trigger !== undefined) exiger(estTexte(c.review_trigger, 0, 200), `${ou}.review_trigger`, '200 caractères au plus');
  });
  exiger(estTexte(p.tool?.name, 1, 1000), 'tool.name', 'obligatoire');
  ['url', 'repo'].forEach((k) => { if (p.tool?.[k] !== undefined) exiger(estUri(p.tool[k]), `tool.${k}`, 'adresse web invalide'); });
  exiger(estUri(p.judging?.video), 'judging.video', 'lien de la vidéo de 2 minutes obligatoire (ex. https://youtu.be/...)');
  return e;
}

/** Nombre de signaux qu'on peut vérifier en un clic (avec un lien), par titre. */
export function signauxAvecLien(choix) {
  return choix.signals.filter((s) => s.source.url).length;
}

/** Texte du fichier (indentation de 2 espaces), nom de fichier conseillé. */
export function texteProposition(p) {
  return JSON.stringify(p, null, 2) + '\n';
}
export const NOM_FICHIER = 'index-proposal.json';

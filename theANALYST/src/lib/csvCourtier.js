/**
 * csvCourtier.js : lecture, dans le navigateur, du CSV exporté d'un courtier (Wealthsimple : activités ou Holdings report).
 *
 * Le fichier ne quitte jamais le navigateur. Seul un résumé (titres, poids arrondis, types de comptes)
 * peut être envoyé à l'IA : jamais le fichier, jamais les numéros de compte.
 */
import { decouperLigneCsv } from './donnees.js';
import { nombre } from './format.js';

/** Portefeuille fictif, pour montrer l'import sans fichier réel. */
export const CSV_DEMO = [
  'Account Type,Account Number,Symbol,Name,Quantity,Market Value',
  'TFSA,DEMO-0001,XEQT,iShares Core Equity ETF Portfolio,120,4300',
  'TFSA,DEMO-0001,CSU,Constellation Software,1,3500',
  'FHSA,DEMO-0002,CASH,Global X High Interest Savings ETF,60,3000',
  'RRSP,DEMO-0003,WSP,WSP Global,10,1850',
  'RRSP,DEMO-0003,VFV,Vanguard S&P 500 Index ETF,12,1750',
].join('\n');

const normaliser = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// L'ordre compte : CELIAPP avant CELI, FHSA avant TFSA.
const TYPES_COMPTES = [
  [/celiapp|fhsa|first home/, 'CELIAPP'], [/reee|resp/, 'REEE'], [/reer|rrsp/, 'REER'], [/celi|tfsa|tax.?free/, 'CELI'],
  [/non.?enregistre|non.?registered|personal|cash|margin/, 'Non enregistré'],
];

function typeDeCompte(cellule) {
  const n = normaliser(cellule);
  return TYPES_COMPTES.find(([motif]) => motif.test(n))?.[1] || null;
}

function trouverColonne(entetes, motifs) {
  return entetes.findIndex((e) => motifs.some((m) => m.test(e)));
}

/** Analyse le texte d'un CSV de courtier. Renvoie ce qui a été compris, sans rien modifier. */
export function analyserCsvCourtier(texte) {
  const lignes = texte.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lignes.length < 2) return { erreur: 'Le fichier est vide ou n\'a qu\'une ligne.' };
  const separateur = (lignes[0].match(/;/g) || []).length > (lignes[0].match(/,/g) || []).length ? ';' : ',';
  const decouper = (l) => (separateur === ';' ? l.split(';').map((c) => c.replace(/^"|"$/g, '')) : decouperLigneCsv(l));
  const entetes = decouper(lignes[0]).map(normaliser);

  const iSymbole = trouverColonne(entetes, [/^symbol/, /ticker/, /symbole/]);
  const iNom = trouverColonne(entetes, [/^name$/, /security/, /description/, /^nom/, /titre/]);
  const iValeur = trouverColonne(entetes, [/market value/, /valeur marchande/, /valeur au marche/, /book value/, /net cash amount/, /^amount/, /montant/]);
  const iCompte = trouverColonne(entetes, [/account type/, /type de compte/, /^account/, /^compte/]);
  const iOperation = trouverColonne(entetes, [/transaction/, /activity type/, /activity_type/, /^type$/, /^action$/, /operation/]);
  if (iSymbole < 0 || iValeur < 0) {
    return { erreur: 'Colonnes introuvables : il faut au moins une colonne de symbole (« Symbol ») et une colonne de montant (« Market Value » ou « Amount »).' };
  }

  const estActivites = iOperation >= 0 && !entetes.some((e) => /market value|valeur marchande/.test(e));
  const parTitre = {};
  const comptes = new Set();
  let lignesLues = 0;
  lignes.slice(1).forEach((ligne) => {
    const c = decouper(ligne);
    const symbole = (c[iSymbole] || '').trim().toUpperCase();
    const montant = nombre(String(c[iValeur] || '').replace(/[$\s]/g, ''));
    const compte = iCompte >= 0 ? typeDeCompte(c[iCompte]) : null;
    if (compte) comptes.add(compte);
    if (!symbole || montant === null) return;
    let signe = 1;
    if (estActivites) {
      const op = normaliser(c[iOperation]);
      if (/buy|achat|purchase/.test(op)) signe = 1;
      else if (/sell|vente|sale/.test(op)) signe = -1;
      else return; // dividendes, dépôts, frais : ne changent pas les positions
    }
    lignesLues += 1;
    parTitre[symbole] = parTitre[symbole] || { symbole, nom: iNom >= 0 ? (c[iNom] || '').trim() : '', valeur: 0 };
    parTitre[symbole].valeur += signe * Math.abs(montant);
  });

  const titres = Object.values(parTitre).filter((t) => t.valeur > 0).sort((a, b) => b.valeur - a.valeur);
  const total = titres.reduce((s, t) => s + t.valeur, 0);
  if (!titres.length) return { erreur: 'Aucune position lisible dans ce fichier.' };
  titres.forEach((t) => { t.poids = t.valeur / total; });
  return { type: estActivites ? 'activités (achats moins ventes)' : 'positions', titres, comptes: [...comptes], lignesLues, total };
}

/** Résumé envoyé à l'IA : symboles, poids arrondis et types de comptes seulement. */
export function resumePourIA(analyse) {
  const titres = analyse.titres.slice(0, 15).map((t) => `${t.symbole} ${Math.round(t.poids * 100)} %`).join(', ');
  return `Portefeuille actuel (${analyse.titres.length} titres) : ${titres}. Types de comptes : ${analyse.comptes.join(', ') || 'non précisés'}.`;
}

/** Sans IA : ajuste les poids des critères selon ce que l'utilisateur détient déjà. Renvoie { poids, explication }. */
export function ajusterSelonPortefeuille(poids, analyse) {
  const p = { ...poids };
  const raisons = [];
  const plus = (id, delta) => { p[id] = Math.max(0, (p[id] || 0) + delta); };
  const principal = analyse.titres[0];
  if (principal.poids > 0.4) {
    plus('dette_fcf', 10);
    raisons.push(`${principal.symbole} pèse ${Math.round(principal.poids * 100)} % du portefeuille, donc je renforce la solidité pour compenser cette concentration`);
  }
  if (analyse.comptes.includes('CELIAPP')) {
    plus('dette_fcf', 10); plus('rendement_dividende', 5); plus('croissance_revenus', -10);
    raisons.push('un CELIAPP sert à un achat immobilier à moyen terme, donc je privilégie la solidité plutôt que la croissance');
  }
  if (analyse.comptes.includes('REEE')) {
    plus('dette_fcf', 5);
    raisons.push('un REEE a une échéance connue, donc j\'ajoute un peu de solidité');
  }
  if (analyse.comptes.includes('REER') && !analyse.comptes.includes('CELIAPP')) {
    plus('croissance_bpa', 5);
    raisons.push('un REER vise le long terme, donc j\'ajoute un peu de croissance des profits');
  }
  return { poids: p, explication: raisons.length ? `${raisons.join(' ; ')}.`.replace(/^./, (c) => c.toUpperCase())
    : 'Ton portefeuille est diversifié et ne contient pas de compte à échéance courte : je ne change pas tes poids.' };
}

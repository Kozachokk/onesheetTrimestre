/**
 * motsCles.js : réponses de l'assistant sans clé d'IA, par mots-clés, uniquement à partir des données du site.
 * L'assistant ne dit jamais quoi acheter ; s'il ne sait pas, il le dit.
 */
import { CRITERES } from '../pointage.js';
import { DEFINITIONS } from '../ratios.js';
import { formater } from '../format.js';

const normaliser = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const REFUS_CONSEIL = 'Je ne peux pas te dire quoi acheter ou vendre : je présente seulement les données du site.';
const INCONNU = 'Je ne sais pas : cette information n\'est pas dans les données du site.';

// ----------------------------------------------------------------------------- profil décrit en mots

const THEMES = [
  { motifs: /long terme|retraite|\b(15|20|25|30|40) ans|patient|long term|retire|\b(15|20|25|30|40) years/, nom: 'un horizon long', effets: { croissance_revenus: 15, croissance_bpa: 10 } },
  { motifs: /court terme|bientot|maison|mise de fonds|\b(1|2|3) ans|short term|soon|house|home|down payment|\b(1|2|3) years/, nom: 'un horizon court', effets: { dette_fcf: 20, rendement_dividende: 5, croissance_revenus: -10 } },
  { motifs: /prudent|securit|conservat|risque (faible|bas)|peu de risque|peur|dormir|cautious|careful|safe|low risk|sleep/, nom: 'une faible tolérance au risque', effets: { dette_fcf: 20, pe: 5 } },
  { motifs: /agressi|audac|risque (eleve|haut)|beaucoup de risque|volatil|aggressive|bold|high risk|accept risk|accept the risk/, nom: 'une tolérance élevée au risque', effets: { croissance_revenus: 20, croissance_bpa: 10, dette_fcf: -5 } },
  { motifs: /revenu|dividende|rente|passif|income|dividend|passive/, nom: 'la recherche de revenu', effets: { rendement_dividende: 30, dette_fcf: 5 } },
  { motifs: /aubaine|pas cher|sous-evalue|valeur|rabais|bon prix|bargain|cheap|undervalued|value|good price/, nom: 'la recherche d\'aubaines', effets: { pe: 15, p_fcf: 15 } },
  { motifs: /croissance|techno|logiciel|innovation|growth|tech|software/, nom: 'un intérêt pour la croissance', effets: { croissance_revenus: 15, croissance_bpa: 10 } },
  { motifs: /qualite|rentab|argent comptant|cash|marge|quality|profitab|margin/, nom: 'la recherche de qualité', effets: { marge_fcf: 20 } },
  { motifs: /acquisition|consolidateur|acquereur|consolidator|acquirer/, nom: 'un intérêt pour les consolidateurs', effets: { marge_fcf: 15, p_fcf: 10, croissance_revenus: 10 } },
];

/** Traduit une description en poids de critères (somme = 100). Renvoie { poids, explication } ou { poids: null }. */
export function profilDepuisTexte(texte) {
  const t = normaliser(texte);
  const trouves = THEMES.filter((th) => th.motifs.test(t));
  if (!trouves.length) {
    return { poids: null, explication: 'Je n\'ai pas reconnu d\'horizon, de niveau de risque ni d\'objectif dans ta description. Essaie par exemple : « long terme, risque modéré, je veux des dividendes ».' };
  }
  const brut = Object.fromEntries(CRITERES.map((c) => [c.id, 10]));
  trouves.forEach((th) => Object.entries(th.effets).forEach(([id, d]) => { brut[id] = Math.max(0, brut[id] + d); }));
  const total = Object.values(brut).reduce((a, b) => a + b, 0) || 1;
  const poids = Object.fromEntries(Object.entries(brut).map(([id, v]) => [id, Math.round((v / total) * 100)]));
  const principaux = [...CRITERES].sort((a, b) => poids[b.id] - poids[a.id]).slice(0, 2).map((c) => c.nom.toLowerCase());
  return { poids, explication: `J'ai compris ${trouves.map((th) => th.nom).join(', ')} : j'ai donc mis l'accent sur ${principaux.join(' et ')}.` };
}

// ----------------------------------------------------------------------------- questions sur une entreprise

const SYNONYMES = {
  pe: ['p/e', 'cours benefice', 'cours/benefice'], pe_prevu: ['previsionnel', 'forward'], p_fcf: ['p/fcf'], pb: ['p/b', 'valeur comptable'],
  roe: ['roe'], roic: ['roic', 'rendement du capital'], marge_brute: ['marge brute', 'gross margin'], marge_exploitation: ['marge d\'exploitation', 'marge operationnelle'],
  marge_nette: ['marge nette', 'net margin'], marge_fcf: ['marge fcf', 'marge de fcf', 'fcf margin'], croissance_revenus: ['croissance des revenus', 'croissance des ventes', 'revenue growth', 'sales growth'],
  croissance_bpa: ['croissance du bpa', 'croissance des benefices', 'eps growth', 'earnings growth'], croissance_organique: ['organique'],
  dette_fcf: ['dette', 'endette', 'solidite', 'debt'], dette_capitaux_propres: ['capitaux propres'], couverture_interets: ['couverture', 'interets'],
  ratio_liquidite: ['liquidite', 'current ratio', 'liquidity'], altman_z: ['altman', 'faillite', 'bankruptcy'], piotroski_f: ['piotroski'], ev_ebit: ['ev/ebit', 've/ebit'],
  rendement_fcf: ['rendement fcf', 'rendement du fcf'], peg: ['peg'], rendement_dividende: ['dividende', 'dividend'], ratio_distribution: ['distribution'],
  variation_actions: ['dilution', 'rachat', 'nombre d\'actions', 'buyback', 'share count'], goodwill_actifs: ['goodwill', 'ecart d\'acquisition'],
  conversion_fcf: ['conversion', 'qualite des benefices'], beta: ['beta'], volatilite: ['volatilite'], rendement_6mois: ['6 mois', 'momentum'],
  ecart_mm200: ['moyenne mobile'], roic_plus_og: ['leonard'],
};

const phraseRatio = (d, v) => (v.valeur === null ? `${d.nom} : n. d. (donnée absente).`
  : `${d.nom} : ${formater(v.valeur, d.format)} (source : ${v.source}${v.date ? `, ${v.date}` : ''}).`);

/** Répond à une question sur une entreprise à partir de ses données. */
export function repondreEntreprise(question, entreprise, resultat, dirigeant, rang) {
  const q = normaliser(question);
  if (/acheter|vendre|devrais|recommand|bon placement|investir dans|conseil|\bbuy\b|\bsell\b|should i|advice/.test(q)) return REFUS_CONSEIL;

  if (/qui (dirige|est (le|la) (pdg|president|presidente|chef|patron|dirigeant))|^quel(le)? est (le|la) (pdg|president|presidente|chef de la direction|dirigeant)|nom du dirigeant|who (runs|leads)|who is the (ceo|president|chief)|^(the )?ceo\b/.test(q)) {
    return dirigeant ? `${dirigeant.nom}, ${dirigeant.titre.toLowerCase()} (vérifié le 12 novembre 2026).` : INCONNU;
  }
  if (/rang|classement|score|pointage|note globale|\brank/.test(q)) {
    if (resultat.score === null) return 'Aucun pointage : aucun critère pondéré n\'a de donnée pour ce titre.';
    return `${entreprise.nom} obtient ${Math.round(resultat.score)} sur 100 selon ton profil${rang ? `, au rang ${rang}` : ''}${resultat.elimine ? ` ; le titre est éliminé (${resultat.raisons.join(' ; ')})` : ''}.`;
  }
  const typesEvenements = [[/acquisition|achete|rachete|achat d'entreprise|bought/, 'acquisition', 'acquisitions'], [/litige|poursuite|proces|tribunal|litigation|lawsuit|legal/, 'litigation', 'litiges'],
    [/financement|emprunt|obligation|financing|borrow/, 'financing', 'financements'], [/prevision|guidance|perspective/, 'guidance-change', 'changements de prévisions']];
  for (const [motif, type, nom] of typesEvenements) {
    if (motif.test(q)) {
      const evs = (entreprise.evenements || []).filter((ev) => ev.type === type).slice(0, 3);
      if (!evs.length) return `Aucun événement de type « ${nom} » dans les données du site pour ${entreprise.nom}.`;
      return `Derniers ${nom} recensés (résumés des dépôts, en anglais) :\n${evs.map((ev) => `• ${ev.date || 'date n. d.'} : ${ev.resume} [${ev.source}]`).join('\n')}`;
    }
  }
  if (/filiale|segment|possede|division|projet|subsidiar|owns|project/.test(q)) {
    const noms = (entreprise.entites || []).slice(0, 12).map((x) => x.nom);
    return noms.length ? `${entreprise.nom} regroupe notamment : ${noms.join(', ')}. Le Hall des dirigeants les montre toutes.` : INCONNU;
  }
  if (/que fait|activite|secteur|description|c'est quoi|presente|what does|business|sector/.test(q)) {
    return entreprise.description ? `${entreprise.description} (description du fichier OneSheet, en anglais)` : INCONNU;
  }
  if (/force|faiblesse|point fort|point faible|strength|weakness/.test(q)) {
    const notes = DEFINITIONS.filter((d) => resultat.notes[d.id] !== null).sort((a, b) => resultat.notes[b.id] - resultat.notes[a.id]);
    if (!notes.length) return INCONNU;
    const liste = (ds) => ds.map((d) => `${d.nom} ${formater(resultat.valeurs[d.id].valeur, d.format)}`).join(', ');
    return `Meilleures notes : ${liste(notes.slice(0, 3))}. Notes les plus faibles : ${liste(notes.slice(-3).reverse())}.`;
  }
  // Un ratio nommé dans la question (le synonyme le plus long l'emporte)
  const candidats = DEFINITIONS.flatMap((d) => [normaliser(d.nom), ...(SYNONYMES[d.id] || [])].map((mot) => ({ d, mot })))
    .filter(({ mot }) => q.includes(mot)).sort((a, b) => b.mot.length - a.mot.length);
  if (candidats.length) {
    const vus = [...new Set(candidats.map((c) => c.d))].slice(0, 2);
    return vus.map((d) => phraseRatio(d, resultat.valeurs[d.id])).join('\n');
  }
  return INCONNU;
}

/** Contexte envoyé à l'IA pour une fiche : uniquement des données déjà affichées sur le site. */
export function contexteEntreprise(entreprise, resultat, dirigeant) {
  const ratios = DEFINITIONS.map((d) => `${d.nom}: ${formater(resultat.valeurs[d.id].valeur, d.format)}`).join(' | ');
  const evenements = (entreprise.evenements || []).slice(0, 12).map((ev) => `${ev.date} ${ev.type}: ${ev.resume}`).join('\n');
  return [`Entreprise : ${entreprise.nom} (${entreprise.ticker}), secteur ${entreprise.secteur || 'n. d.'}.`,
    entreprise.description, dirigeant ? `Dirigeant : ${dirigeant.nom}, ${dirigeant.titre}.` : '',
    `Pointage selon le profil : ${resultat.score === null ? 'n. d.' : Math.round(resultat.score)} / 100.`,
    `Ratios : ${ratios}`, `Événements récents :\n${evenements}`,
    `Entités : ${(entreprise.entites || []).map((x) => x.nom).join(', ')}`].filter(Boolean).join('\n');
}

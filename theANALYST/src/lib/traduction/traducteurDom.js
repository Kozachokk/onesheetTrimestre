/**
 * traducteurDom.js : traduction anglaise de démonstration, appliquée à la page affichée.
 *
 * Le site est écrit en français. Quand l'anglais est choisi, on remplace à l'écran chaque texte connu du
 * dictionnaire (src/lib/traduction/dictionnaire.js) et on surveille la page pour traduire ce qui apparaît ensuite.
 * Revenir au français restaure les textes d'origine. Ce qui n'est pas dans le dictionnaire reste en français.
 * Un élément marqué data-sans-traduction (ex. un message tapé par l'utilisateur) n'est jamais touché.
 */
import { EXACT, MOTIFS } from './dictionnaire.js';

const ATTRIBUTS = ['placeholder', 'title', 'aria-label'];
const originaux = new WeakMap();        // nœud de texte → { fr, en }
const originauxAttributs = new WeakMap(); // élément → { attribut: { fr, en } }
const manquants = new Set();
let observateur = null;

/** Traduit un texte ; renvoie null s'il n'y a rien à changer. */
export function traduire(texte) {
  const coeur = texte.trim();
  if (!coeur || !/[A-Za-zÀ-ÿ]/.test(coeur)) return null;
  const avant = texte.slice(0, texte.indexOf(coeur));
  const apres = texte.slice(avant.length + coeur.length);
  const cle = coeur.replace(/[\u00a0\u202f]/g, ' ').replace(/\u2019/g, "'");
  if (cle in EXACT) return avant + EXACT[cle] + apres;
  let resultat = cle;
  MOTIFS.forEach(([motif, remplacement]) => { resultat = resultat.replace(motif, remplacement); });
  if (resultat !== cle) return avant + resultat + apres;
  if (/[àâçéèêëîïôùûœ]|\b(le|la|les|des|une|du|et|pour|avec|sur|dans|est)\b/i.test(cle)) manquants.add(cle);
  return null;
}

const exclu = (noeud) => Boolean((noeud.nodeType === 1 ? noeud : noeud.parentElement)?.closest('[data-sans-traduction], script, style'));

function traduireTexte(noeud) {
  if (exclu(noeud)) return;
  const connu = originaux.get(noeud);
  if (connu && connu.en === noeud.data) return; // déjà traduit, rien n'a changé
  const en = traduire(noeud.data);
  if (en === null) { originaux.delete(noeud); return; }
  originaux.set(noeud, { fr: noeud.data, en });
  noeud.data = en;
}

function traduireAttributs(element) {
  if (exclu(element)) return;
  ATTRIBUTS.forEach((attribut) => {
    const valeur = element.getAttribute?.(attribut);
    if (!valeur) return;
    const memoire = originauxAttributs.get(element) || {};
    if (memoire[attribut]?.en === valeur) return;
    const en = traduire(valeur);
    if (en === null) return;
    memoire[attribut] = { fr: valeur, en };
    originauxAttributs.set(element, memoire);
    element.setAttribute(attribut, en);
  });
}

function parcourir(racine, surTexte, surElement) {
  if (racine.nodeType === 3) { surTexte(racine); return; }
  if (racine.nodeType !== 1) return;
  surElement(racine);
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) (n.nodeType === 3 ? surTexte : surElement)(n);
}

/** Passe la page en anglais et traduit tout ce qui s'affichera ensuite. */
export function activerAnglais(racine = document.body) {
  desactiverAnglais(racine);
  parcourir(racine, traduireTexte, traduireAttributs);
  observateur = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.type === 'characterData') traduireTexte(m.target);
      else if (m.type === 'attributes') traduireAttributs(m.target);
      else m.addedNodes.forEach((n) => parcourir(n, traduireTexte, traduireAttributs));
    });
  });
  observateur.observe(racine, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTS });
  document.documentElement.lang = 'en';
}

/** Revient au français : restaure les textes d'origine. */
export function desactiverAnglais(racine = document.body) {
  observateur?.disconnect();
  observateur = null;
  parcourir(racine, (noeud) => {
    const connu = originaux.get(noeud);
    if (connu && connu.en === noeud.data) noeud.data = connu.fr;
    originaux.delete(noeud);
  }, (element) => {
    const memoire = originauxAttributs.get(element);
    if (!memoire) return;
    Object.entries(memoire).forEach(([attribut, { fr, en }]) => { if (element.getAttribute(attribut) === en) element.setAttribute(attribut, fr); });
    originauxAttributs.delete(element);
  });
  document.documentElement.lang = 'fr';
}

/** Textes français rencontrés sans traduction (utile pour compléter le dictionnaire). */
export const textesManquants = () => [...manquants];

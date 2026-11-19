/*
 * bases.js : pour une entreprise achetée, la liste des bases de données où chercher ses états financiers.
 * Données : src/data/bases.js (BASES_PAYS, PAYS_CIBLES, BASES_HEC). Aucune base n'est lue automatiquement :
 * le site donne le bon lien, l'utilisateur ouvre la page.
 */
import { BASES_HEC, BASES_PAYS, PAYS_CIBLES } from '../data/bases.js';

/** Code du pays d'une entreprise achetée (ex. 'GB'), ou null si on ne le connaît pas. */
export function paysDe(nom) {
  return PAYS_CIBLES[nom]?.pays || null;
}

/** Nom lisible du pays, ou null. */
export function nomPays(nom) {
  const code = paysDe(nom);
  return code ? BASES_PAYS[code].pays : null;
}

/** Nom à chercher dans les bases : sans les précisions entre parenthèses ajoutées par le site. */
export function nomRecherche(nom) {
  return String(nom).replace(/\s*\(.*\)\s*$/, '').trim();
}

/** Remplit {nom} et {id} dans une adresse. Retourne null s'il manque le numéro demandé. */
function remplir(modele, nom, id) {
  if (!modele) return null;
  if (modele.includes('{id}') && !id) return null;
  return modele.replace('{nom}', encodeURIComponent(nomRecherche(nom))).replace('{id}', encodeURIComponent(id || ''));
}

/** Le registre du pays de l'entreprise : { pays, nom, acces, url, contenu, note }, ou null si pays inconnu. */
export function registrePays(nom) {
  const cible = PAYS_CIBLES[nom];
  if (!cible) return null;
  const base = BASES_PAYS[cible.pays];
  const url = remplir(base.urlPage, nom, cible.id) || base.urlSansId || null;
  return { code: cible.pays, pays: base.pays, nom: base.nom, acces: base.acces, url, contenu: base.contenu, note: cible.note || null };
}

/** Les bases HEC (même liste pour toutes les entreprises), avec le nom à coller. */
export function basesHec(nom) {
  return BASES_HEC.map((b) => ({ ...b, aChercher: nomRecherche(nom) }));
}

/**
 * Libellé de la liste déroulante. Reprend celui de acquisitions.js, mais remplace « aucune base de données publique »
 * par le registre du pays quand on le connaît.
 */
export function etiquetteChoix(choix) {
  if (choix.type !== 'rien') return choix.etiquette;
  const registre = registrePays(choix.nom);
  if (!registre) return choix.etiquette;
  return `${choix.nom} (registre du pays : ${registre.nom}, ${registre.acces})`;
}

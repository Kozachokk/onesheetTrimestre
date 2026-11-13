/**
 * prixAchat.js : présentation harmonisée du prix payé pour une entreprise achetée.
 *
 * Dans les données d'origine, le prix est écrit tel qu'il apparaît dans chaque dépôt : « 22,508 » (milliers d'euros),
 * « 168.0 », « 56.1 million », « 3.4 » (milliards), « 2360 »… On le ramène toujours au même format :
 * un montant en millions, au format français (espace pour les milliers, virgule pour les décimales), suivi de la devise.
 *
 * Règles, pour ne rien inventer :
 *   1. on cherche dans le résumé du dépôt le montant qui correspond à la valeur brute ; s'il y est écrit avec son unité
 *      (thousand, million, billion) et sa devise, on s'en sert ;
 *   2. sinon, on applique l'unité dans laquelle l'acquéreur présente ses états financiers (config.json), en le signalant ;
 *   3. un prix par action (ex. une offre publique) n'est pas un prix total : il est affiché comme tel ;
 *   4. si le résumé donne un autre total que la valeur brute, on garde la valeur brute et on signale l'écart.
 */
import { fr } from './format.js';

const DEVISES = { 'US$': 'USD', USD: 'USD', 'C$': 'CAD', CAD: 'CAD', '€': 'EUR', EUR: 'EUR', '£': 'GBP', GBP: 'GBP', PLN: 'PLN' };
const UNITES = { thousand: 0.001, million: 1, billion: 1000 };
const MENTION = /(US\$|C\$|\$|€|£|EUR|USD|CAD|GBP|PLN)\s?(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s*(thousand|million|billion))?(\s+per share)?/gi;

/** « 22,508 » → 22508 ; « 168.0 » → 168 ; « 56.1 million » → 56.1 (la virgule anglaise sépare les milliers). */
export function lireNombre(brut) {
  if (brut === null || brut === undefined || brut === '') return null;
  const n = Number(String(brut).replace(/[^\d.,]/g, '').replace(/,(?=\d{3}(\D|$))/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Toutes les sommes d'argent écrites dans un résumé : { valeur, unite, devise, parAction }. */
export function mentions(texte) {
  return [...String(texte || '').matchAll(MENTION)].map((m) => ({
    valeur: lireNombre(m[2]),
    unite: m[3] ? m[3].toLowerCase() : null,
    devise: DEVISES[m[1].toUpperCase()] || DEVISES[m[1]] || null, // « $ » seul : devise de l'acquéreur
    parAction: Boolean(m[4]),
  }));
}

const proches = (a, b) => Math.abs(a - b) <= Math.max(0.05, Math.abs(b) * 0.005);

/**
 * achat : { montant, resume } ; deviseAcquereur : devise des états financiers de l'acquéreur ;
 * uniteEtats : 'millions' ou 'milliers' (unité de ses états financiers).
 * Renvoie { millions, devise, parAction, unite, note } ou null si aucun prix n'est publié.
 */
export function harmoniserPrix(achat, deviseAcquereur, uniteEtats = 'millions') {
  const brut = lireNombre(achat.montant);
  if (brut === null) return null;
  const devise = (d) => d || deviseAcquereur;
  const dits = mentions(achat.resume);
  const enMillions = /million/i.test(String(achat.montant)) ? brut : null;

  // 1. Le résumé écrit ce montant avec son unité
  for (const m of dits) {
    if (m.valeur === null) continue;
    if (m.parAction && proches(m.valeur, brut)) return { millions: null, prixAction: m.valeur, devise: devise(m.devise), parAction: true, note: 'prix par action d’une offre, pas un prix total payé' };
    if (m.unite) {
      const total = m.valeur * UNITES[m.unite];
      if (proches(m.valeur, brut) || proches(total, brut) || (enMillions !== null && proches(total, enMillions))) {
        return { millions: total, devise: devise(m.devise), unite: m.unite, note: '' };
      }
    }
  }
  if (enMillions !== null) return { millions: enMillions, devise: devise(dits[0]?.devise), note: '' };

  // 2. Le résumé écrit ce montant sans unité, ou ne l'écrit pas : unité des états financiers de l'acquéreur
  const facteur = uniteEtats === 'milliers' ? 0.001 : 1;
  const ecritSansUnite = dits.find((m) => !m.unite && !m.parAction && proches(m.valeur, brut));
  const autreTotal = dits.filter((m) => !m.parAction && m.valeur !== null).map((m) => m.valeur * (m.unite ? UNITES[m.unite] : facteur));
  const ecart = !ecritSansUnite && autreTotal.length && !autreTotal.some((t) => proches(t, brut * facteur));
  return {
    millions: brut * facteur,
    devise: devise(ecritSansUnite?.devise),
    note: ecart ? `à vérifier : le résumé du dépôt indique d’autres montants (${autreTotal.map((t) => fr(t, t % 1 ? 1 : 0)).join(' ; ')} M ${deviseAcquereur})`
      : `unité déduite : états financiers en ${uniteEtats} de ${deviseAcquereur}`,
  };
}

/** Montant en millions au format commun : « 3 400 M USD », « 223,6 M EUR », « 48,9 M USD ». */
export function formaterMillions(millions, devise) {
  if (millions === null || millions === undefined) return 'n. d.';
  const arrondi = Math.round(millions * 10) / 10;
  return `${fr(arrondi, Number.isInteger(arrondi) ? 0 : 1)} M ${devise}`;
}

/** Texte affiché pour un prix harmonisé (ou « n. d. »). */
export function texteprix(prix) {
  if (!prix) return 'n. d.';
  if (prix.parAction) return `${fr(prix.prixAction, 2)} ${prix.devise} par action`;
  return formaterMillions(prix.millions, prix.devise);
}

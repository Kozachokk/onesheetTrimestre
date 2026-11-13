/**
 * reglagesAssistant.js : IA choisie, modèle et clé de l'utilisateur.
 * La clé reste dans le stockage local du navigateur. Elle n'est jamais écrite dans le code ni affichée.
 */
import { FOURNISSEURS } from '../lib/assistant/fournisseurs.js';

const CLE = 'theanalyst.assistant.v1';

export function lireReglages() {
  try {
    const r = JSON.parse(localStorage.getItem(CLE)) || {};
    const fournisseur = r.fournisseur in FOURNISSEURS ? r.fournisseur : 'claude';
    return { fournisseur, modele: r.modele || FOURNISSEURS[fournisseur].modele, cle: r.cle || '' };
  } catch {
    return { fournisseur: 'claude', modele: FOURNISSEURS.claude.modele, cle: '' };
  }
}

export function enregistrerReglages(reglages) {
  try { localStorage.setItem(CLE, JSON.stringify(reglages)); } catch { /* stockage indisponible */ }
}

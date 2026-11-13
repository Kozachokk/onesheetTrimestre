import { useState } from 'react';
import { FOURNISSEURS } from '../../lib/assistant/fournisseurs.js';
import { enregistrerReglages, lireReglages } from '../../etat/reglagesAssistant.js';

/** Réglages de l'assistant : choix de l'IA et clé de l'utilisateur (gardée dans son navigateur, jamais affichée). */
export default function ReglagesAssistant({ onFermer }) {
  const [reglages, setReglages] = useState(lireReglages);
  const [nouvelleCle, setNouvelleCle] = useState('');
  const changerFournisseur = (fournisseur) => setReglages((r) => ({ ...r, fournisseur, modele: FOURNISSEURS[fournisseur].modele }));
  const enregistrer = () => {
    enregistrerReglages({ ...reglages, cle: nouvelleCle.trim() || reglages.cle });
    onFermer();
  };
  const effacer = () => { enregistrerReglages({ ...reglages, cle: '' }); setReglages((r) => ({ ...r, cle: '' })); setNouvelleCle(''); };

  return (
    <div className="assistant-reglages">
      <h3>Réglages de l’assistant</h3>
      <label className="petit discret" htmlFor="ia-fournisseur">Ton IA</label>
      <select id="ia-fournisseur" value={reglages.fournisseur} onChange={(e) => changerFournisseur(e.target.value)}>
        {Object.entries(FOURNISSEURS).map(([id, f]) => <option key={id} value={id}>{f.nom}</option>)}
      </select>
      <label className="petit discret" htmlFor="ia-modele">Modèle</label>
      <input id="ia-modele" type="text" value={reglages.modele} onChange={(e) => setReglages((r) => ({ ...r, modele: e.target.value }))} />
      <label className="petit discret" htmlFor="ia-cle">Ta clé {FOURNISSEURS[reglages.fournisseur].nom}</label>
      <input id="ia-cle" type="password" autoComplete="off" value={nouvelleCle} onChange={(e) => setNouvelleCle(e.target.value)}
        placeholder={reglages.cle ? 'Une clé est enregistrée (masquée)' : 'Colle ta clé ici'} />
      <p className="petit discret">
        La clé reste dans ce navigateur. Elle n’est jamais affichée ni écrite dans le code, et n’est envoyée qu’à {FOURNISSEURS[reglages.fournisseur].nom}.
        Sans clé, l’assistant répond par mots-clés à partir des données du site.
      </p>
      <div className="rangee">
        <button type="button" className="bouton plein" onClick={enregistrer}>Enregistrer</button>
        {reglages.cle && <button type="button" className="bouton" onClick={effacer}>Effacer la clé</button>}
        <button type="button" className="bouton" onClick={onFermer}>Fermer</button>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { analyserCsvCourtier } from '../../lib/csvCourtier.js';

/**
 * Import du CSV du courtier. Le fichier est lu dans le navigateur ; on montre ce qui a été compris
 * (titres, poids, comptes) avant d'ajuster quoi que ce soit.
 */
export default function ImportCsv({ avecIA, onAjuster }) {
  const fichier = useRef(null);
  const [aide, setAide] = useState(false);
  const [analyse, setAnalyse] = useState(null);

  const lire = (evenement) => {
    const f = evenement.target.files?.[0];
    if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => setAnalyse(analyserCsvCourtier(String(lecteur.result)));
    lecteur.onerror = () => setAnalyse({ erreur: 'Impossible de lire ce fichier.' });
    lecteur.readAsText(f);
    evenement.target.value = '';
  };

  return (
    <div className="assistant-csv">
      <input ref={fichier} type="file" accept=".csv,text/csv" hidden onChange={lire} />
      <button type="button" className="bouton plein" onClick={() => fichier.current.click()}>Importer le CSV de mon courtier</button>
      <br />
      <button type="button" className="lien-bouton petit" onClick={() => setAide((a) => !a)}>Comment exporter en CSV ?</button>
      {aide && (
        <div className="petit" style={{ marginTop: '0.4rem' }}>
          <b>Wealthsimple (sur le web seulement)</b>
          <ol style={{ margin: '0.3rem 0', paddingLeft: '1.1rem' }}>
            <li>Ouvre l’onglet Activités (icône d’horloge) dans le menu de gauche.</li>
            <li>Clique « Download activities ».</li>
            <li>Choisis la période, puis « Next ».</li>
            <li>Coche les comptes voulus (CELI, CELIAPP, REER, REEE).</li>
            <li>Clique « Download CSV ».</li>
          </ol>
          Pour la liste de tes positions, demande plutôt le Holdings report (CSV).
        </div>
      )}
      {analyse?.erreur && <p style={{ color: 'var(--alerte)' }} className="petit">{analyse.erreur}</p>}
      {analyse && !analyse.erreur && (
        <div className="assistant-compris">
          <b>Voici ce que j’ai compris</b> <span className="discret petit">({analyse.type})</span>
          <table className="donnees" style={{ fontSize: '0.8rem' }}>
            <thead><tr><th>Titre</th><th>Poids</th></tr></thead>
            <tbody>
              {analyse.titres.slice(0, 8).map((t) => <tr key={t.symbole}><td><b>{t.symbole}</b> <span className="discret">{t.nom}</span></td><td>{Math.round(t.poids * 100)} %</td></tr>)}
              {analyse.titres.length > 8 && <tr><td colSpan="2" className="discret">et {analyse.titres.length - 8} autres titres</td></tr>}
            </tbody>
          </table>
          <p className="petit">Comptes : <b>{analyse.comptes.join(', ') || 'non précisés'}</b></p>
          <p className="petit discret">
            Ton fichier reste dans ton navigateur. {avecIA
              ? 'Seul ce résumé (titres, poids arrondis, types de comptes) sera envoyé à l’IA : jamais le fichier ni les numéros de compte.'
              : 'Rien n’est envoyé : sans clé, l’ajustement est calculé ici même.'}
          </p>
          <div className="rangee">
            <button type="button" className="bouton plein" onClick={() => { onAjuster(analyse); setAnalyse(null); }}>Ajuster mon profil</button>
            <button type="button" className="bouton" onClick={() => setAnalyse(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

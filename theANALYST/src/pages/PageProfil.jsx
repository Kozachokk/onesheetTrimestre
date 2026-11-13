import { useProfil } from '../etat/ProfilContext.jsx';
import { aller } from '../etat/navigation.js';
import CartesProfils from '../components/profil/CartesProfils.jsx';
import Curseurs from '../components/profil/Curseurs.jsx';
import ClassementDirect from '../components/classement/ClassementDirect.jsx';

/** Première page du site : création du profil d'investisseur. */
export default function PageProfil() {
  const { profil, ajuste, total, setEntre, entre } = useProfil();
  const entrer = () => { setEntre(true); aller('classement'); };
  return (
    <main className="page">
      <p className="etiquette accent">{entre ? 'Mon profil' : 'Étape 1 · avant d’entrer'}</p>
      <h1>Quel investisseur es-tu ?</h1>
      <p className="discret" style={{ maxWidth: 720 }}>
        Choisis un profil : il règle tous les curseurs d’un coup. Ajuste-les ensuite à la main, ou décris-toi à l’assistant
        (bulle en bas à droite). Le classement des titres se met à jour en direct.
      </p>
      <CartesProfils />
      <div className="grille deux-colonnes" style={{ marginTop: '1.2rem' }}>
        <section className="carte">
          <div className="rangee entre">
            <h2>Importance des critères</h2>
            <span className="pastille">{profil ? `${profil.nom}${ajuste ? ' · ajusté' : ''}` : 'Profil sur mesure'}</span>
          </div>
          <Curseurs />
        </section>
        <section className="carte">
          <h2>Classement en direct</h2>
          {total === 0
            ? <p style={{ color: 'var(--alerte)' }}>Tous les curseurs sont à 0 : monte au moins un critère.</p>
            : <ClassementDirect />}
          <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
            <button type="button" className="bouton plein grand" onClick={entrer} disabled={total === 0}>Entrer</button>
          </div>
        </section>
      </div>
    </main>
  );
}

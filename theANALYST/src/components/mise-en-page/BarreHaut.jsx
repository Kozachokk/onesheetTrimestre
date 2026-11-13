import { useProfil } from '../../etat/ProfilContext.jsx';

const LIENS = [['classement', 'Classement'], ['hall', 'Hall des dirigeants'], ['comparer', 'Comparer'], ['methode', 'Méthode']];

/** Barre du haut, présente sur toutes les pages : nom du site, navigation, bouton de langue (EN / FR) et bouton Mon profil. */
export default function BarreHaut({ page, langue, basculerLangue }) {
  const { config, entre } = useProfil();

  return (
    <header className="barre-haut">
      <a className="marque" href={entre ? '#/classement' : '#/profil'}><i />{config.nom_site}</a>
      {entre && (
        <nav>
          {LIENS.map(([id, nom]) => <a key={id} href={`#/${id}`} className={page === id ? 'actif' : ''}>{nom}</a>)}
        </nav>
      )}
      <div className="rangee">
        <button type="button" className="bouton" onClick={basculerLangue} data-sans-traduction
          title={langue === 'en' ? 'Revenir au français' : 'Switch to English'}>{langue === 'en' ? 'FR' : 'EN'}</button>
        <a className="bouton plein" href="#/profil">Mon profil</a>
      </div>
    </header>
  );
}

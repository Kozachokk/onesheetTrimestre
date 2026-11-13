import { useEffect, useState } from 'react';
import { useProfil } from '../../etat/ProfilContext.jsx';

const LIENS = [['classement', 'Classement'], ['hall', 'Hall des dirigeants'], ['comparer', 'Comparer'], ['methode', 'Méthode']];

/** Barre du haut, présente sur toutes les pages : nom du site, navigation, bouton EN et bouton Mon profil. */
export default function BarreHaut({ page }) {
  const { config, entre } = useProfil();
  const [message, setMessage] = useState(false);
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(false), 2500);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <header className="barre-haut">
      <a className="marque" href={entre ? '#/classement' : '#/profil'}><i />{config.nom_site}</a>
      {entre && (
        <nav>
          {LIENS.map(([id, nom]) => <a key={id} href={`#/${id}`} className={page === id ? 'actif' : ''}>{nom}</a>)}
        </nav>
      )}
      <div className="rangee">
        <button type="button" className="bouton" onClick={() => setMessage(true)} title="Traduire en anglais">EN</button>
        <a className="bouton plein" href="#/profil">Mon profil</a>
      </div>
      {message && <div className="bulle-info" role="status">Traduction bientôt disponible</div>}
    </header>
  );
}

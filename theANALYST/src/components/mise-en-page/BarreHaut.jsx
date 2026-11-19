import { useProfil } from '../../etat/ProfilContext.jsx';

/** Liens de la barre, dans l'ordre d'utilisation : d'abord le profil, puis le reste. « libre » : visible avant d'entrer. */
const LIENS = [
  { id: 'profil', nom: 'Mon profil', libre: true },
  { id: 'classement', nom: 'Classement' },
  { id: 'simulation', nom: 'Simulation' },
  { id: 'conclusion', nom: 'Conclusion' },
  { id: 'hall', nom: 'Hall des dirigeants' },
  { id: 'methode', nom: 'Méthodologie', libre: true },
];

/** Barre du haut, présente sur toutes les pages : nom du site, navigation et bouton de langue (EN / FR). */
export default function BarreHaut({ page, langue, basculerLangue }) {
  const { config, entre } = useProfil();
  const actif = page === 'crise' ? 'simulation' : page;

  return (
    <header className="barre-haut">
      <a className="marque" href={entre ? '#/classement' : '#/profil'}><i />{config.nom_site}</a>
      <nav>
        {LIENS.filter((l) => entre || l.libre).map((l) => (
          <a key={l.id} href={`#/${l.id}`} className={actif === l.id ? 'actif' : ''}>{l.nom}</a>
        ))}
      </nav>
      <button type="button" className="bouton" onClick={basculerLangue} data-sans-traduction
        title={langue === 'en' ? 'Revenir au français' : 'Switch to English'}>{langue === 'en' ? 'FR' : 'EN'}</button>
    </header>
  );
}

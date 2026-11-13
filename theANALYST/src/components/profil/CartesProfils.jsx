import { useProfil } from '../../etat/ProfilContext.jsx';
import { MENTION, PROFILS } from '../../lib/pointage.js';

/** Profils cliquables : un clic règle tous les curseurs d'un coup. */
export default function CartesProfils() {
  const { profilId, ajuste, choisirProfil } = useProfil();
  return (
    <div className="profils">
      {PROFILS.map((p) => (
        <button key={p.id} type="button" className={`profil ${profilId === p.id ? 'choisi' : ''}`} onClick={() => choisirProfil(p.id)} title={p.description}>
          {p.inspire && <em>{MENTION}</em>}
          <b>{p.nom}</b>
          <span>{p.style || p.description}{profilId === p.id && ajuste ? ' · ajusté' : ''}</span>
        </button>
      ))}
    </div>
  );
}

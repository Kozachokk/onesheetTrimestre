import { useProfil } from '../../etat/ProfilContext.jsx';
import Barre from '../commun/Barre.jsx';

/** Classement compact, recalculé en direct à chaque mouvement de curseur. */
export default function ClassementDirect({ cliquable = false }) {
  const { resultats, rangs, portefeuille } = useProfil();
  const detenus = new Set((portefeuille?.titres || []).map((t) => t.symbole.split('.')[0]));
  return (
    <div>
      {resultats.map((r) => {
        const classe = `ligne-classement ${r.elimine ? 'elimine' : ''}`;
        const contenu = (
          <>
            <span className="rang">{rangs[r.ticker] ?? '–'}</span>
            <span>
              <b>{r.nom}</b> <span className="discret petit">{r.ticker}</span>
              {detenus.has(r.ticker) && <span className="pastille ok" style={{ marginLeft: 6 }}>déjà détenu</span>}
              <br />
              {r.elimine
                ? <span className="petit" style={{ color: 'var(--alerte)' }}>Éliminé : {r.raisons.join(' ; ')}</span>
                : <Barre note={r.score} largeur={170} afficherNombre={false} />}
            </span>
            <span className="score">{r.score === null ? 'n. d.' : Math.round(r.score)}</span>
          </>
        );
        return cliquable
          ? <a key={r.ticker} href={`#/entreprise/${r.ticker}`} className={classe} style={{ color: 'inherit', textDecoration: 'none' }}>{contenu}</a>
          : <div key={r.ticker} className={classe}>{contenu}</div>;
      })}
    </div>
  );
}

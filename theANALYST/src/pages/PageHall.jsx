import { useRef, useState } from 'react';
import { useProfil } from '../etat/ProfilContext.jsx';
import { aller } from '../etat/navigation.js';
import Personnage from '../components/hall/Personnage.jsx';
import { GEOMETRIE } from '../components/hall/geometrie.js';
import dirigeantsConfig from '../config/dirigeants.json';

const PORTEE = 330;      // distance (dans le dessin) à laquelle le dirigeant commence à tendre le bras
const DUREE_POIGNEE = 900; // durée de la poignée de main avant d'ouvrir la fiche (ms)

/** Main du visiteur, qui suit la souris au-dessus d'un dirigeant. */
function Main({ position, secoue }) {
  return (
    <svg className={`hall-main ${secoue ? 'secoue' : ''}`} style={{ left: position.x - 22, top: position.y - 22 }} width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <path d="M12 24 V10 a3 3 0 0 1 6 0 V20 V7 a3 3 0 0 1 6 0 V20 V9 a3 3 0 0 1 6 0 V22 V14 a3 3 0 0 1 6 0 V28 c0 8 -5 13 -13 13 c-6 0 -9 -3 -12 -8 l-6 -9 a3 3 0 0 1 5 -3 Z"
        fill="#ffffff" stroke="#69db7c" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** Un dirigeant : le nom de l'entreprise en haut, le personnage, puis son nom. Il tend la main quand la souris approche. */
function Poste({ ticker, entreprise, resultat, rang, dirigeant, poignee, serrer }) {
  const zone = useRef(null);
  const [souris, setSouris] = useState(null); // { ecran: position dans la carte, locale: position dans le dessin }
  const bouger = (ev) => {
    const cadre = zone.current.getBoundingClientRect();
    const ecran = { x: ev.clientX - cadre.left, y: ev.clientY - cadre.top };
    const echelle = GEOMETRIE.largeur / cadre.width;
    setSouris({ ecran, locale: { x: ecran.x * echelle, y: ecran.y * echelle } });
  };
  const enPoignee = poignee === ticker;
  const distance = souris ? Math.hypot(souris.locale.x - 150, souris.locale.y - 230) : Infinity;
  const proximite = enPoignee ? 1 : Math.max(0, Math.min(1, (PORTEE - distance) / (PORTEE - 110)));

  return (
    <div className={`carte hall-poste ${resultat.elimine ? 'elimine' : ''} ${enPoignee ? 'poignee' : ''}`}>
      <div className="hall-entete">
        <b>{entreprise.nom}</b> <span className="discret petit">{ticker}</span>
        <div className="petit">{resultat.elimine ? <span style={{ color: 'var(--alerte)' }}>Éliminé pour ton profil</span>
          : <>Rang <b className="accent">{rang}</b> · {Math.round(resultat.score)} / 100</>}</div>
      </div>
      <div ref={zone} className="hall-scene" onMouseMove={bouger} onMouseLeave={() => setSouris(null)} onClick={() => serrer(ticker)}
        role="button" tabIndex={0} aria-label={`Serrer la main de ${dirigeant.nom} pour ouvrir la fiche de ${entreprise.nom}`}
        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); serrer(ticker); } }}>
        <Personnage apparence={dirigeant.apparence} main={souris?.locale || null} proximite={proximite} poignee={enPoignee} />
        {souris && <Main position={souris.ecran} secoue={enPoignee} />}
        {enPoignee && <span className="hall-bulle">Enchanté !</span>}
      </div>
      <b className="hall-nom">{dirigeant.nom}</b>
      <span className="discret petit">{dirigeant.titre}</span>
    </div>
  );
}

/** Hall des dirigeants : un dirigeant par entreprise, dans l'ordre du classement. On lui serre la main pour ouvrir la fiche. */
export default function PageHall() {
  const { entreprises, resultats, rangs, dirigeants } = useProfil();
  const [poignee, setPoignee] = useState(null);
  const ordre = resultats.filter((r) => dirigeants[r.ticker] && entreprises[r.ticker]);
  const serrer = (ticker) => {
    if (poignee) return;
    setPoignee(ticker);
    setTimeout(() => aller('entreprise', ticker), DUREE_POIGNEE);
  };

  return (
    <main className="page">
      <header className="centre">
        <p className="etiquette accent">Hall des dirigeants</p>
        <h1>Serre la main d’un dirigeant pour ouvrir sa fiche</h1>
        <p className="discret intro">Approche la main : le dirigeant te tend la sienne. Clique pour la serrer. Ils sont rangés dans l’ordre de ton classement.</p>
      </header>
      <div className="hall-grille">
        {ordre.map((r) => (
          <Poste key={r.ticker} ticker={r.ticker} entreprise={entreprises[r.ticker]} resultat={r} rang={rangs[r.ticker]}
            dirigeant={dirigeants[r.ticker]} poignee={poignee} serrer={serrer} />
        ))}
      </div>
      <p className="discret petit centre" style={{ marginTop: '1rem' }}>
        Dirigeants vérifiés le {dirigeantsConfig.verifie_le} sur les sites des entreprises. Personnages illustrés, sans photo : seuls quelques traits simples (cheveux, lunettes, barbe) les rapprochent des vrais dirigeants.
      </p>
    </main>
  );
}

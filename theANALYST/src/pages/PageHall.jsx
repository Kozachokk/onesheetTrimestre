import { useEffect, useMemo, useRef, useState } from 'react';
import { useProfil } from '../etat/ProfilContext.jsx';
import { aller } from '../etat/navigation.js';
import Personnage from '../components/hall/Personnage.jsx';
import { GEOMETRIE, brasVers } from '../components/hall/geometrie.js';
import '../styles/hall.css';

const ESPACE = 760;      // distance entre deux dirigeants
const MARGE = 420;       // espace avant le premier et après le dernier
const SOL = 560;         // hauteur du sol dans la scène
const HAUTEUR = 640;
const PORTEE = 330;      // distance à laquelle le dirigeant commence à réagir
const TYPES = { segment: 'Segment', subsidiary: 'Filiale', project: 'Projet', 'business-line': 'Secteur d’activité', product: 'Produit', partnership: 'Partenariat', other: 'Autre' };

/**
 * Date et prix d'achat d'une entité, seulement s'ils figurent dans un événement d'acquisition des fichiers :
 * l'entité doit être la contrepartie de l'acquisition ou être nommée dans le résumé du dépôt.
 */
function achatDe(entite, entreprise) {
  const nom = entite.nom.toLowerCase();
  const ev = entreprise.evenements.find((e) => e.type === 'acquisition'
    && ((e.attributs?.counterparty || '').toLowerCase().includes(nom) || e.resume.toLowerCase().includes(nom)));
  if (!ev) return null;
  const montant = ev.attributs?.amount;
  return { date: ev.date || null, prix: montant ? `${montant} ${ev.attributs.currency || ''} (montant tel qu’inscrit dans le dépôt)` : null,
    resume: ev.resume, source: ev.source };
}

/** Hall des dirigeants : scène 2D vue de côté. La main du visiteur serre celle d'un dirigeant pour ouvrir sa fiche. */
export default function PageHall() {
  const { entreprises, resultats, rangs, parTicker, dirigeants, premier } = useProfil();
  const ordre = useMemo(() => resultats.map((r) => r.ticker).filter((t) => dirigeants[t]), [resultats, dirigeants]);
  const largeurMonde = MARGE * 2 + ESPACE * (ordre.length - 1);
  const scene = useRef(null);
  const etat = useRef({ touches: {}, sourisX: null, largeur: 1000 });
  const [camera, setCamera] = useState(0);
  const [main, setMain] = useState(null);          // position de la main dans la scène
  const [poignee, setPoignee] = useState(null);    // ticker du dirigeant dont on serre la main
  const [entite, setEntite] = useState(null);      // mini-fiche ouverte

  // Promenade : flèches du clavier ou main près du bord de l'écran
  useEffect(() => {
    const appui = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { etat.current.touches[e.key] = e.type === 'keydown'; e.preventDefault(); } };
    window.addEventListener('keydown', appui);
    window.addEventListener('keyup', appui);
    let image;
    const boucle = () => {
      const s = etat.current;
      s.largeur = scene.current?.clientWidth || 1000;
      let vitesse = 0;
      if (s.touches.ArrowLeft) vitesse -= 14;
      if (s.touches.ArrowRight) vitesse += 14;
      if (s.sourisX !== null) {
        if (s.sourisX < 90) vitesse -= 12 * (1 - s.sourisX / 90);
        if (s.sourisX > s.largeur - 90) vitesse += 12 * (1 - (s.largeur - s.sourisX) / 90);
      }
      if (vitesse) setCamera((c) => Math.max(0, Math.min(Math.max(0, largeurMonde - s.largeur), c + vitesse)));
      image = requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);
    return () => { cancelAnimationFrame(image); window.removeEventListener('keydown', appui); window.removeEventListener('keyup', appui); };
  }, [largeurMonde]);

  // Pour chaque dirigeant : position, main dans son repère, proximité et contact avec l'extrémité du bras
  const calculerActeurs = (positionMain, serre) => ordre.map((ticker, i) => {
    const gauche = MARGE + i * ESPACE - GEOMETRIE.largeur / 2 - camera;
    const haut = SOL - GEOMETRIE.hauteur + 14;
    const locale = positionMain ? { x: positionMain.x - gauche, y: positionMain.y - haut } : null;
    const distance = locale ? Math.hypot(locale.x - 150, locale.y - 230) : Infinity;
    const proximite = serre === ticker ? 1 : Math.max(0, Math.min(1, (PORTEE - distance) / (PORTEE - 110)));
    const bras = brasVers(locale, proximite);
    const touche = Boolean(locale) && proximite > 0.5 && Math.hypot(locale.x - bras.bout.x, locale.y - bras.bout.y) < 30;
    return { ticker, gauche, haut, locale, proximite, touche };
  });

  const bouger = (e) => {
    const cadre = scene.current.getBoundingClientRect();
    const position = { x: e.clientX - cadre.left, y: e.clientY - cadre.top };
    etat.current.sourisX = position.x;
    if (poignee) return;
    setMain(position);
    // Les deux mains se touchent : la poignée de main commence
    const contact = calculerActeurs(position, null).find((a) => a.touche);
    if (contact) setPoignee(contact.ticker);
  };
  const sortir = () => { etat.current.sourisX = null; if (!poignee) setMain(null); };
  const acteurs = calculerActeurs(main, poignee);

  // Après la poignée de main, la fiche de l'entreprise s'ouvre
  useEffect(() => {
    if (!poignee) return undefined;
    const t = setTimeout(() => aller('entreprise', poignee), 1150);
    return () => clearTimeout(t);
  }, [poignee]);

  return (
    <main className="page" style={{ maxWidth: 'none', paddingLeft: 0, paddingRight: 0 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
        <p className="etiquette accent">Hall des dirigeants</p>
        <h1>Serre la main d’un dirigeant pour ouvrir sa fiche</h1>
        <p className="discret">Promène-toi avec les flèches ← → ou en amenant la main près du bord. Clique une étiquette au mur pour découvrir ce que l’entreprise possède.
          Dirigeants vérifiés le 12 novembre 2026 ; personnages illustrés, sans ressemblance recherchée.</p>
      </div>
      <div ref={scene} className={`hall ${poignee ? 'poignee' : ''}`} style={{ height: HAUTEUR }} onMouseMove={bouger} onMouseLeave={sortir}>
        <div className="hall-mur" style={{ backgroundPositionX: -camera * 0.5 }} />
        <div className="hall-sol" style={{ top: SOL, backgroundPositionX: -camera }} />
        {acteurs.map(({ ticker, gauche, haut, locale, proximite }) => {
          const e = entreprises[ticker];
          const r = parTicker[ticker];
          const d = dirigeants[ticker];
          const tete = premier?.ticker === ticker;
          return (
            <div key={ticker} className="hall-poste" style={{ left: gauche, top: 0 }}>
              {tete && <div className="hall-projecteur" />}
              <div className="hall-etiquettes">
                {e.entites.map((x) => (
                  <button key={`${x.type}-${x.nom}`} type="button" className={`hall-etiquette ${x.type}`} onClick={() => setEntite({ ...x, entreprise: e })} title={`${TYPES[x.type] || x.type} · ${x.nom}`}>
                    {x.nom.length > 26 ? `${x.nom.slice(0, 25)}…` : x.nom}
                  </button>
                ))}
              </div>
              <div className={`hall-rang ${tete ? 'premier' : ''} ${r.elimine ? 'elimine' : ''}`}>
                <b>{r.elimine ? 'Éliminé' : `No ${rangs[ticker]}`}</b>
                <span>{r.score === null ? 'n. d.' : `${Math.round(r.score)} / 100`}</span>
              </div>
              <div style={{ position: 'absolute', top: haut, left: 0 }} onClick={() => aller('entreprise', ticker)}>
                <Personnage apparence={d.apparence} main={locale} proximite={proximite} poignee={poignee === ticker} />
              </div>
              <button type="button" className="hall-plaque" style={{ top: SOL + 14 }} onClick={() => aller('entreprise', ticker)}>
                <b>{d.nom}</b>
                <span>{d.titre}</span>
                <em>{e.nom}</em>
              </button>
            </div>
          );
        })}
        {main && (
          <svg className={`hall-main ${poignee ? 'secoue' : ''}`} style={{ left: main.x - 22, top: main.y - 22 }} width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
            <path d="M12 24 V10 a3 3 0 0 1 6 0 V20 V7 a3 3 0 0 1 6 0 V20 V9 a3 3 0 0 1 6 0 V22 V14 a3 3 0 0 1 6 0 V28 c0 8 -5 13 -13 13 c-6 0 -9 -3 -12 -8 l-6 -9 a3 3 0 0 1 5 -3 Z"
              fill="#ffffff" stroke="#69db7c" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {entite && (
        <div className="modale-fond" onClick={() => setEntite(null)}>
          <div className="modale" onClick={(ev) => ev.stopPropagation()}>
            <span className="etiquette accent">{TYPES[entite.type] || entite.type}</span>
            <h2>{entite.nom}</h2>
            <p><span className="discret">Entreprise mère :</span> <b>{entite.parent}</b>{entite.parent !== entite.entreprise.nom && <span className="discret"> ({entite.entreprise.nom})</span>}</p>
            <p>{entite.description || <span className="nd">Description n. d.</span>}</p>
            {(() => {
              const achat = achatDe(entite, entite.entreprise);
              return (
                <>
                  <p><span className="discret">Date d’achat :</span> {achat?.date || <span className="nd">n. d.</span>}</p>
                  <p><span className="discret">Prix d’achat :</span> {achat?.prix || <span className="nd">n. d.</span>}</p>
                  {achat && <p className="discret petit">{achat.resume} [{achat.source}]</p>}
                </>
              );
            })()}
            <p className="discret petit">Source : fichier JSON OneSheet (document.profile.entities), descriptions en anglais.</p>
            <button type="button" className="bouton" onClick={() => setEntite(null)}>Fermer</button>
          </div>
        </div>
      )}
    </main>
  );
}

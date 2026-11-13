import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const LARGEUR = 340;
const MARGE = 12;

/** Libellé du lien selon le site de la source. */
function libelleLien(url) {
  if (!url) return '';
  if (url.includes('sedarplus')) return 'Chercher le dépôt sur SEDAR+ ↗';
  if (url.includes('stockanalysis')) return 'Voir la page du titre sur stockanalysis.com ↗';
  if (url.includes('yahoo')) return 'Voir la page du titre sur Yahoo Finance ↗';
  if (url.includes('sec.gov')) return 'Ouvrir les rapports dans EDGAR ↗';
  return 'Ouvrir le site de la source ↗';
}

/**
 * Lien « voir la source » : un clic ouvre une fenêtre avec la source, la date, la citation du dépôt et un lien externe.
 * La fenêtre est affichée par-dessus la page (elle n'est plus coupée par les tableaux ni les sections repliées),
 * reste ouverte quand on va cliquer son lien, et se ferme avec un clic ailleurs, la touche Échap ou le défilement.
 */
export default function Source({ source, date, url, citation }) {
  const [ouvert, setOuvert] = useState(false);
  const [position, setPosition] = useState(null);
  const bouton = useRef(null);
  const fenetre = useRef(null);

  // Place la fenêtre sous le bouton (ou au-dessus s'il n'y a pas la place), sans sortir de l'écran
  useLayoutEffect(() => {
    if (!ouvert || !bouton.current) return;
    const b = bouton.current.getBoundingClientRect();
    const hauteur = fenetre.current?.offsetHeight || 120;
    const gauche = Math.max(MARGE, Math.min(b.right - LARGEUR, window.innerWidth - LARGEUR - MARGE));
    const dessous = b.bottom + 6 + hauteur <= window.innerHeight - MARGE;
    setPosition({ left: gauche, top: dessous ? b.bottom + 6 : Math.max(MARGE, b.top - 6 - hauteur) });
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return undefined;
    const fermer = () => setOuvert(false);
    const clic = (e) => {
      if (!fenetre.current?.contains(e.target) && !bouton.current?.contains(e.target)) fermer();
    };
    const touche = (e) => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', touche);
    window.addEventListener('scroll', fermer, true);
    window.addEventListener('resize', fermer);
    return () => {
      document.removeEventListener('mousedown', clic);
      document.removeEventListener('keydown', touche);
      window.removeEventListener('scroll', fermer, true);
      window.removeEventListener('resize', fermer);
    };
  }, [ouvert]);

  if (!source) return <span className="nd petit">source n. d.</span>;
  return (
    <>
      <button ref={bouton} type="button" className="lien-bouton petit" aria-expanded={ouvert}
        onClick={() => { setPosition(null); setOuvert((o) => !o); }}>
        voir la source
      </button>
      {ouvert && createPortal(
        <div ref={fenetre} className="fenetre-source" role="dialog" aria-label="Source de la donnée"
          style={{ width: LARGEUR, left: position?.left ?? -9999, top: position?.top ?? -9999 }}>
          <button type="button" className="fermer" onClick={() => setOuvert(false)} aria-label="Fermer">✕</button>
          <div className="etiquette">Source</div>
          <b>{source}</b>
          <div className="discret petit">Date : {date || 'n. d.'}</div>
          {citation && <q>{citation}</q>}
          {url && <a href={url} target="_blank" rel="noreferrer">{libelleLien(url)}</a>}
        </div>,
        document.body,
      )}
    </>
  );
}

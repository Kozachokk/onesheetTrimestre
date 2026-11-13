import { useState } from 'react';

/** Lien « voir la source » : ouvre une petite fenêtre avec la source, la date, la citation et un lien externe. */
export default function Source({ source, date, url, citation }) {
  const [ouvert, setOuvert] = useState(false);
  if (!source) return <span className="nd petit">source n. d.</span>;
  return (
    <span className="source" onMouseLeave={() => setOuvert(false)}>
      <button type="button" className="lien-bouton petit" onClick={() => setOuvert((o) => !o)}>voir la source</button>
      {ouvert && (
        <span className="fenetre">
          <b>{source}</b>
          <br />
          <span className="discret">Date : {date || 'n. d.'}</span>
          {citation && <q>{citation}</q>}
          {url && <a href={url} target="_blank" rel="noreferrer">Ouvrir le site de la source ↗</a>}
        </span>
      )}
    </span>
  );
}

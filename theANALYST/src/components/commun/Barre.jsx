/** Mini-barre animée de 0 à 100. */
export default function Barre({ note, largeur = 70, afficherNombre = true }) {
  if (note === null || note === undefined) return <span className="nd">n. d.</span>;
  return (
    <>
      <span className="barre" style={{ width: largeur }}><i style={{ width: `${Math.max(0, Math.min(100, note))}%` }} /></span>
      {afficherNombre && <span style={{ marginLeft: 6, fontVariantNumeric: 'tabular-nums' }}>{Math.round(note)}</span>}
    </>
  );
}

/** Encadré « À retenir » : conclusion générée à partir des chiffres (vert, orange ou rouge). */
export default function Conclusion({ conclusion }) {
  if (!conclusion) return null;
  return (
    <div className={`verdict-acq ${conclusion.niveau}`}>
      <b>{conclusion.titre}</b>
      <div className="petit">{conclusion.texte}</div>
    </div>
  );
}

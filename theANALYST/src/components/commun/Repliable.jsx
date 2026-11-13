/** Section repliée par défaut : l'essentiel reste visible, le reste s'ouvre au clic. */
export default function Repliable({ titre, ouvert = false, children }) {
  return (
    <details className="repli" open={ouvert}>
      <summary>{titre}</summary>
      <div className="contenu">{children}</div>
    </details>
  );
}

import { comparerAuxPairs, conclusionPairs, SOURCE_PAIRS, VALEURS } from '../../lib/pairs.js';
import Conclusion from '../commun/Conclusion.jsx';
import { ACCES_COMPTE } from '../../lib/capitalIQ.js';
import { fr } from '../../lib/format.js';

const nd = <span className="nd">n. d.</span>;
const texte = (x, unite) => {
  if (x === 'NM') return <span className="discret" title="Non significatif selon Capital IQ">n. s.</span>;
  if (typeof x !== 'number') return nd;
  return unite === 'x' ? `${fr(x, 2)}x` : `${fr(x, 1)} %`;
};

/** Par rapport aux pairs : chaque ratio du titre contre la médiane de ses pairs (S&P Capital IQ). */
export default function ParRapportAuxPairs({ ticker }) {
  const c = comparerAuxPairs(ticker);
  if (!c) return <p className="discret">Pas de groupe de pairs pour ce titre.</p>;
  return (
    <div>
      <Conclusion conclusion={conclusionPairs(ticker)} />
      <div className="defilement">
        <table className="donnees">
          <thead><tr><th>Ratio</th><th>{ticker}</th><th>Médiane des pairs</th><th>Par rapport aux pairs</th></tr></thead>
          <tbody>
            {c.lignes.map((l) => (
              <tr key={l.id}>
                <td>{l.nom}{l.sens === 'bas' && <span className="discret petit"> (plus bas = mieux)</span>}</td>
                <td><b>{texte(l.valeur, l.unite)}</b></td>
                <td>{l.mediane === null ? nd : texte(l.mediane, l.unite)} <span className="discret petit">({l.nPairs} pairs)</span></td>
                <td>{l.verdict ? <span className={`pastille ${l.verdict === 'mieux' ? 'ok' : l.verdict === 'moins bien' ? 'non' : ''}`}>{l.verdict}</span> : nd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="repli">
        <summary>Valeurs de chaque pair</summary>
        <div className="contenu defilement">
          <table className="donnees petit">
            <thead><tr><th>Société</th>{c.lignes.map((l) => <th key={l.id}>{l.nom}</th>)}</tr></thead>
            <tbody>
              {[ticker, ...c.groupe.pairs].map((t) => (
                <tr key={t}>
                  <td><b>{VALEURS[t].nom}</b> <span className="discret">({VALEURS[t].bourse}:{t})</span></td>
                  {c.lignes.map((l) => <td key={l.id}>{texte(VALEURS[t][l.id], l.unite)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="discret petit">Source : {SOURCE_PAIRS.base}, {SOURCE_PAIRS.periode}, export du {SOURCE_PAIRS.date} ({ACCES_COMPTE}).
        Pairs : {c.pairs.map((p) => p.nom).join(', ')}. {c.groupe.note} « n. s. » : non significatif selon Capital IQ (souvent quand la société a plus de trésorerie que de dette) ; ces valeurs ne comptent pas dans la médiane.
        Les sociétés ne ferment pas toutes leur exercice à la même date.</p>
    </div>
  );
}

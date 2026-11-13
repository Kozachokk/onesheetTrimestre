import { useState } from 'react';
import { useProfil } from '../etat/ProfilContext.jsx';
import { expliquerEcart } from '../lib/pointage.js';
import { CATEGORIES, DEFINITIONS } from '../lib/ratios.js';
import { fr, formater } from '../lib/format.js';
import Source from '../components/commun/Source.jsx';

/** Deux ou trois titres côte à côte, ratio par ratio, puis « Pourquoi A devant B ? ». */
export default function PageComparer() {
  const { resultats, parTicker, poids, total } = useProfil();
  const [choisis, setChoisis] = useState(() => resultats.slice(0, 2).map((r) => r.ticker));
  const basculer = (t) => setChoisis((a) => (a.includes(t) ? a.filter((x) => x !== t) : a.length < 3 ? [...a, t] : a));
  const ordonnes = [...choisis].sort((a, b) => (parTicker[b].score ?? -1) - (parTicker[a].score ?? -1));
  const tete = parTicker[ordonnes[0]];
  const part = (id) => (total > 0 ? Math.round(((poids[id] || 0) / total) * 100) : 0);

  return (
    <main className="page">
      <p className="etiquette accent">Comparer</p>
      <h1>Deux ou trois titres côte à côte</h1>
      <div className="rangee" style={{ margin: '0.8rem 0' }}>
        {resultats.map((r) => (
          <button key={r.ticker} type="button" className={`bouton ${choisis.includes(r.ticker) ? 'plein' : ''}`} onClick={() => basculer(r.ticker)}>{r.ticker}</button>
        ))}
      </div>
      {choisis.length < 2 ? <p className="discret">Choisis au moins deux titres.</p> : (
        <>
          <section className="carte defilement">
            <table className="donnees">
              <thead><tr><th>Ratio</th>{choisis.map((t) => <th key={t}>{t} · {parTicker[t].nom}</th>)}<th>Importance</th></tr></thead>
              <tbody>
                <tr><td><b>Pointage</b></td>{choisis.map((t) => (
                  <td key={t} className={t === ordonnes[0] ? 'meilleur' : ''}><b>{parTicker[t].score === null ? 'n. d.' : Math.round(parTicker[t].score)}</b>{parTicker[t].elimine ? ' (éliminé)' : ''}</td>
                ))}<td /></tr>
                {CATEGORIES.map((cat) => [
                  <tr key={cat} className="groupe"><td colSpan={choisis.length + 2}>{cat}</td></tr>,
                  ...DEFINITIONS.filter((d) => d.categorie === cat).map((d) => {
                    const connues = choisis.map((t) => parTicker[t].valeurs[d.id].valeur).filter((v) => v !== null);
                    const meilleure = connues.length >= 2 ? (d.sens === 'haut' ? Math.max(...connues) : Math.min(...connues)) : null;
                    return (
                      <tr key={d.id}>
                        <td title={d.explication}>{d.nom}</td>
                        {choisis.map((t) => {
                          const v = parTicker[t].valeurs[d.id];
                          return (
                            <td key={t} className={v.valeur === null ? 'nd' : v.valeur === meilleure ? 'meilleur' : ''}>
                              {formater(v.valeur, d.format)} {v.valeur !== null && <Source {...v} />}
                            </td>
                          );
                        })}
                        <td className="discret">{part(d.id) ? `${part(d.id)} %` : '–'}</td>
                      </tr>
                    );
                  }),
                ])}
              </tbody>
            </table>
            <p className="discret petit" style={{ marginTop: '0.6rem' }}>En vert : le meilleur de chaque ligne.</p>
          </section>
          {ordonnes.slice(1).map((t) => {
            const autre = parTicker[t];
            if (tete.score === null || autre.score === null) return null;
            const ecarts = expliquerEcart(tete, autre, 5);
            const max = Math.max(...ecarts.map((x) => Math.abs(x.ecart)), 1);
            return (
              <section key={t} className="carte" style={{ marginTop: '1rem' }}>
                <h2>Pourquoi {tete.ticker} devant {autre.ticker} ?</h2>
                <p>Écart de <b className="accent">{fr(tete.score - autre.score, 1)} points</b>. Les ratios qui l’expliquent le plus :</p>
                {ecarts.length ? ecarts.map((x) => (
                  <div key={x.id} className="rangee" style={{ padding: '0.25rem 0' }}>
                    <span style={{ width: 230 }}>{x.nom}</span>
                    <span className="barre" style={{ width: 220 }}><i style={{ width: `${(Math.abs(x.ecart) / max) * 100}%`, background: x.ecart > 0 ? 'var(--accent)' : 'var(--alerte)' }} /></span>
                    <span>{x.ecart > 0 ? '+' : ''}{fr(x.ecart, 1)} points · {formater(x.valeurA, x.format)} contre {formater(x.valeurB, x.format)}</span>
                  </div>
                )) : <p className="discret">Aucun écart sur les critères pondérés.</p>}
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}

import { useState } from 'react';
import { BAISSES } from '../../data/crises.js';
import { CANDIDATS, FENETRES, PLAFOND, SOURCE_CRISES, simulerCrise } from '../../lib/crises.js';
import { fr } from '../../lib/format.js';

const nd = <span className="nd">n. d.</span>;
const pct = (x) => (typeof x === 'number' ? `${fr(x, 1)} %` : nd);
const pts = (x) => (typeof x === 'number' ? `${x > 0 ? '+' : ''}${fr(x, 2)} pt` : nd);

/**
 * Outil de test de crise : on choisit les titres, la crise et le poids, puis « Lancer le test ».
 * Les résultats sont calculés à la demande, puis suivent chaque changement de réglage.
 */
export default function TestDeCrise({ initial = ['WSP', 'CSU'] }) {
  const [titres, setTitres] = useState(initial);
  const [fenetre, setFenetre] = useState(FENETRES[1].id);
  const [poids, setPoids] = useState(PLAFOND * 100);
  const [lance, setLance] = useState(false);
  const r = lance && titres.length ? simulerCrise({ tickers: titres, fenetre, poids }) : null;

  const basculer = (t) => setTitres((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));

  return (
    <div>
      <p className="etiquette discret" style={{ margin: '0 0 0.4rem' }}>1. Titres à ajouter à l’indice</p>
      <div className="rangee">
        {CANDIDATS.map((t) => (
          <button key={t} type="button" className={`bouton ${titres.includes(t) ? 'plein' : ''}`} onClick={() => basculer(t)}
            aria-pressed={titres.includes(t)} title={BAISSES[t].nom}>{t}</button>
        ))}
      </div>

      <p className="etiquette discret" style={{ margin: '1rem 0 0.4rem' }}>2. Crise</p>
      <div className="rangee">
        {FENETRES.map((f) => (
          <button key={f.id} type="button" className={`bouton ${fenetre === f.id ? 'plein' : ''}`} onClick={() => setFenetre(f.id)}
            aria-pressed={fenetre === f.id} title={`${f.debut} au ${f.fin}`}>{f.nom}</button>
        ))}
      </div>

      <p className="etiquette discret" style={{ margin: '1rem 0 0.4rem' }}>3. Poids de chaque titre dans l’indice</p>
      <div className="curseur" style={{ maxWidth: 520 }}>
        <label htmlFor="poids-crise">Poids</label>
        <input id="poids-crise" type="range" min="1" max={PLAFOND * 100} step="0.5" value={poids}
          style={{ '--part': `${(poids / (PLAFOND * 100)) * 100}%` }} onChange={(e) => setPoids(Number(e.target.value))} />
        <output>{fr(poids, 1)} %</output>
      </div>

      <div className="rangee" style={{ marginTop: '1rem' }}>
        <button type="button" className="bouton plein grand" disabled={!titres.length} onClick={() => setLance(true)}>Lancer le test</button>
        {!titres.length && <span className="discret petit">Choisis au moins un titre.</span>}
      </div>

      {r && (
        <div className="carte" style={{ marginTop: '1rem' }} aria-live="polite">
          <div className="chiffres-cles">
            <div className="chiffre"><span className="etiquette">Baisse de l’indice actuel</span><b>{pct(r.indice)}</b></div>
            <div className="chiffre"><span className="etiquette">Avec les titres choisis</span><b>{pct(r.indiceApres)}</b></div>
            <div className="chiffre"><span className="etiquette">Effet total</span><b className={r.reussi ? 'accent' : ''} style={r.reussi === false ? { color: 'var(--alerte)' } : undefined}>{pts(r.effetTotal)}</b></div>
            <div className="chiffre"><span className="etiquette">Limite d’Onesheet : −2 points</span>
              <b>{r.reussi === null ? nd : <span className={`pastille ${r.reussi ? 'ok' : 'non'}`}>{r.reussi ? 'réussi' : 'échoué'}</span>}</b></div>
          </div>
          <div className="defilement">
            <table className="donnees">
              <thead><tr><th>Titre</th><th>Baisse du titre</th><th>Écart avec l’indice</th><th>Effet sur l’indice (poids {fr(r.poids, 1)} %)</th></tr></thead>
              <tbody>
                {r.lignes.map((l) => (
                  <tr key={l.ticker}>
                    <td><b>{l.ticker}</b> <span className="discret petit">{l.nom}</span></td>
                    <td>{l.titre === null ? <span className="discret petit">pas encore coté</span> : pct(l.titre)}</td>
                    <td>{l.ecart === null ? nd : `${l.ecart > 0 ? '+' : ''}${fr(l.ecart, 1)} pts de %`}</td>
                    <td>{l.effet === null ? nd : <span className={`pastille ${l.effet < -2 ? 'non' : 'ok'}`}>{pts(l.effet)}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="discret petit" style={{ marginBottom: 0 }}>{r.fenetre.nom} : {r.fenetre.debut} au {r.fenetre.fin}. Indice actuel : moyenne à poids égaux de {r.nIndice} membres connus.</p>
        </div>
      )}

      <details className="repli">
        <summary>Comment c’est calculé</summary>
        <p className="contenu petit">Baisse = plus forte chute du cours entre un sommet et un creux pendant la crise, en {SOURCE_CRISES.devise}, dividendes inclus.
          Effet d’un titre = poids × (baisse du titre − baisse de l’indice). L’effet total additionne les titres choisis.
          La règle d’Onesheet refuse un ajout si l’indice fait pire de plus de 2 points. C’est notre simulation : Onesheet fait son propre calcul, avec ses poids et ses scénarios.
          Source : <a href={SOURCE_CRISES.url} target="_blank" rel="noreferrer">{SOURCE_CRISES.base}</a>, calcul du {SOURCE_CRISES.date}.</p>
      </details>
    </div>
  );
}

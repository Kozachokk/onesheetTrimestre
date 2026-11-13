import { useMemo, useState } from 'react';
import { useProfil } from '../../etat/ProfilContext.jsx';
import { enMontants, repartir } from '../../lib/repartition.js';
import { fr } from '../../lib/format.js';

const COULEURS = ['#69db7c', '#c9f26c', '#7fb8b8', '#3f8f7a', '#a9c98a'];

/**
 * Répartition du portefeuille : quelle part (en %) mettre sur chaque titre, pour un total de 100 %.
 * Elle suit le classement en direct : changer le profil ou un curseur change la répartition.
 */
export default function Repartition() {
  const { config, resultats, entreprises } = useProfil();
  const defauts = config.repartition;
  const [methode, setMethode] = useState(defauts.methode);
  const [maxTitres, setMaxTitres] = useState(defauts.max_titres);
  const [scoreMinimum, setScoreMinimum] = useState(defauts.score_minimum);
  const [plafond, setPlafond] = useState(defauts.plafond * 100);
  const [montant, setMontant] = useState('');

  const { lignes, exclus, plafondApplique } = useMemo(
    () => repartir(resultats, { methode, maxTitres, scoreMinimum, plafond: plafond / 100 }),
    [resultats, methode, maxTitres, scoreMinimum, plafond],
  );
  const valeur = Number(String(montant).replace(/\s/g, '').replace(',', '.'));
  const avecMontant = Number.isFinite(valeur) && valeur > 0;
  const prix = Object.fromEntries(Object.values(entreprises).map((e) => [e.ticker, e.champs.prix_cad?.valeur ?? null]));
  const details = avecMontant ? enMontants(lignes, valeur, prix) : lignes;
  const investi = avecMontant ? details.reduce((s, l) => s + (l.investi ?? 0), 0) : 0;

  return (
    <section className="carte" style={{ margin: '1rem 0' }}>
      <div className="rangee entre">
        <h2 style={{ margin: 0 }}>Répartition du portefeuille</h2>
        <span className="pastille">{`total : ${lignes.reduce((s, l) => s + l.pct, 0)} %`}</span>
      </div>
      <p className="discret petit" style={{ margin: '0.4rem 0 0.8rem' }}>
        Combien mettre sur chaque titre pour un total de 100 %, selon ton profil. C’est une règle de calcul appliquée au classement,
        pas une recommandation de placement.
      </p>

      <div className="grille" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginBottom: '0.9rem' }}>
        <label className="petit discret">Méthode
          <select value={methode} onChange={(e) => setMethode(e.target.value)}>
            <option value="pointage">Selon le pointage</option>
            <option value="egale">Parts égales</option>
          </select>
        </label>
        <label className="petit discret">Nombre de titres maximum : <b className="accent">{maxTitres}</b>
          <input type="range" min="1" max="5" step="1" value={maxTitres} style={{ '--part': `${((maxTitres - 1) / 4) * 100}%` }}
            onChange={(e) => setMaxTitres(Number(e.target.value))} />
        </label>
        <label className="petit discret">Pointage minimum : <b className="accent">{scoreMinimum}</b>
          <input type="range" min="0" max="90" step="5" value={scoreMinimum} style={{ '--part': `${(scoreMinimum / 90) * 100}%` }}
            onChange={(e) => setScoreMinimum(Number(e.target.value))} />
        </label>
        <label className="petit discret">Maximum par titre : <b className="accent">{plafond} %</b>
          <input type="range" min="20" max="100" step="5" value={plafond} style={{ '--part': `${((plafond - 20) / 80) * 100}%` }}
            onChange={(e) => setPlafond(Number(e.target.value))} />
        </label>
        <label className="petit discret">Montant à investir (facultatif, $ CA)
          <input type="text" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="ex. 10 000" data-sans-traduction />
        </label>
      </div>

      {!lignes.length ? (
        <p style={{ color: 'var(--alerte)' }}>Aucun titre ne remplit les conditions : baisse le pointage minimum ou ajuste ton profil.</p>
      ) : (
        <>
          <div className="repartition-barre" role="img" aria-label="Répartition du portefeuille">
            {lignes.map((l, i) => (
              <span key={l.ticker} style={{ width: `${l.pct}%`, background: COULEURS[i % COULEURS.length] }} title={`${l.ticker} : ${l.pct} %`}>
                {l.pct >= 8 && <>{l.ticker} {l.pct} %</>}
              </span>
            ))}
          </div>
          <div className="defilement">
            <table className="donnees">
              <thead>
                <tr><th>Titre</th><th>Pointage</th><th>Part du portefeuille</th>
                  {avecMontant && <><th>Montant</th><th>Cours</th><th>Actions entières</th></>}</tr>
              </thead>
              <tbody>
                {details.map((l, i) => (
                  <tr key={l.ticker}>
                    <td><span className="pastille-couleur" style={{ background: COULEURS[i % COULEURS.length] }} /><b>{l.ticker}</b> · {l.nom}{l.complement && <span className="pastille" style={{ marginLeft: 6 }} title="Pointage sous le minimum, ajouté pour respecter le maximum par titre">ajouté pour le maximum</span>}</td>
                    <td>{Math.round(l.score)}</td>
                    <td><b className="accent" style={{ fontSize: '1.1rem' }}>{l.pct} %</b></td>
                    {avecMontant && (
                      <>
                        <td>{fr(l.somme, 0)} $</td>
                        <td>{l.prix ? `${fr(l.prix, 2)} $` : <span className="nd">n. d.</span>}</td>
                        <td>{l.actions ?? <span className="nd">n. d.</span>}{l.actions === 0 && <span className="discret petit"> (une action coûte plus que ce montant)</span>}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {avecMontant && (
            <p className="petit">{`Avec des actions entières, ${fr(investi, 0)} $ sont investis ; il reste ${fr(valeur - investi, 0)} $ en liquidités.`}{' '}
              <span className="discret">Cours du 12 novembre 2026 (source : stockanalysis.com), sans frais de courtage.</span></p>
          )}
        </>
      )}

      {exclus.length > 0 && (
        <p className="discret petit">{`Sans part : ${exclus.map((x) => `${x.ticker} (${x.raison})`).join(', ')}.`}</p>
      )}
      <details className="repli" style={{ background: 'var(--carte-2)' }}>
        <summary>Comment la répartition est calculée</summary>
        <div className="contenu petit">
          <ol style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.7 }}>
            <li>On garde les titres admissibles (non éliminés) dont le pointage atteint le minimum, puis les meilleurs, jusqu’au nombre maximum.</li>
            <li>« Selon le pointage » : chaque titre reçoit une part proportionnelle à son pointage. « Parts égales » : tous reçoivent la même part.</li>
            <li>Aucun titre ne dépasse le maximum par titre ; l’excédent est redistribué aux autres, au prorata. S’il y a trop peu de titres pour le respecter, on ajoute les meilleurs titres admissibles suivants, même sous le pointage minimum (pastille « ajouté pour le maximum »).
              {plafondApplique > plafond / 100 + 1e-9 && ` Avec ${lignes.length} titre(s), le maximum est relevé à ${Math.round(plafondApplique * 100)} % pour atteindre 100 %.`}</li>
            <li>Les parts sont arrondies à l’unité en gardant un total d’exactement 100 %.</li>
          </ol>
          <p style={{ marginTop: '0.6rem' }}>Limites : la règle ne tient compte ni de ce que tu détiens déjà, ni des secteurs (deux titres de logiciels peuvent recevoir l’essentiel),
            ni de ta situation personnelle. Avec cinq titres seulement, un portefeuille reste très peu diversifié.</p>
        </div>
      </details>
    </section>
  );
}

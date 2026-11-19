import { CANDIDATS, PLAFOND, SOURCE_CRISES, tableauCrises, testDeCrise } from '../../lib/crises.js';
import { fr } from '../../lib/format.js';

const nd = <span className="nd">n. d.</span>;
const source = <>Source : <a href={SOURCE_CRISES.url} target="_blank" rel="noreferrer">{SOURCE_CRISES.base}</a>, calcul du {SOURCE_CRISES.date}.</>;

/** Un titre est écarté si, dans au moins une crise, il ferait baisser l'indice de plus de 2 points (poids de 10 %). */
const echoue = (ticker) => testDeCrise(ticker).some((f) => f.depasse);

/** Encadré de conclusion pour les cinq candidats : retenus et écartés au test de crise. */
export function ConclusionCrises() {
  const lignes = tableauCrises();
  const retenus = lignes.filter((l) => !echoue(l.ticker)).map((l) => l.ticker);
  const ecartes = lignes.filter((l) => echoue(l.ticker)).map((l) => l.ticker);
  return (
    <div className="verdict-acq vert" style={{ marginBottom: '1rem' }}>
      <b>Notre conclusion : {retenus.join(' et ')} passent le test ; {ecartes.join(', ')} sont écartés.</b>
      <div className="petit">Règle d’Onesheet : un ajout est refusé s’il fait baisser l’indice de plus de 2 points dans une crise.
        Testé avec le poids maximal de {fr(PLAFOND * 100, 0)} % sur les {CANDIDATS.length} titres et les 3 crises. {source}</div>
    </div>
  );
}

/** Résultat du test de crise pour un seul titre, avec un lien vers l'outil complet. */
export function ResumeCrise({ ticker }) {
  const fenetres = testDeCrise(ticker);
  const ok = !echoue(ticker);
  return (
    <div>
      <p><span className={`pastille ${ok ? 'ok' : 'non'}`}>{ok ? 'Passe le test de crise' : 'Échoue au test de crise'}</span></p>
      <div className="defilement">
        <table className="donnees">
          <thead><tr><th>Crise</th><th>Baisse du titre</th><th>Baisse de l’indice</th><th>Effet sur l’indice (poids {fr(PLAFOND * 100, 0)} %)</th></tr></thead>
          <tbody>
            {fenetres.map((f) => (
              <tr key={f.id}>
                <td>{f.nom} <span className="discret petit">({f.debut.slice(0, 4)})</span></td>
                <td>{f.titre === null ? <span className="discret petit">pas encore coté</span> : `${fr(f.titre, 1)} %`}</td>
                <td>{f.indice === null ? nd : `${fr(f.indice, 1)} %`}</td>
                <td>{f.effet === null ? nd : <span className={`pastille ${f.depasse ? 'non' : 'ok'}`}>{`${f.effet > 0 ? '+' : ''}${fr(f.effet, 2)} pt`}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="discret petit">Limite d’Onesheet : −2 points. {source} <a href="#/simulation">Ouvrir la simulation et le test de crise complet</a></p>
    </div>
  );
}

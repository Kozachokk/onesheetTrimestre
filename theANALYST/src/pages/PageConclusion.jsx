import { CHOIX, COURRIEL_ENVOI, DATE_LIMITE, SCHEMA_URL, VALIDATEUR_URL } from '../data/proposition.js';
import { BAISSES } from '../data/crises.js';
import { passeLeTest } from '../lib/crises.js';
import { fr } from '../lib/format.js';
import { ConclusionCrises } from '../components/commun/ResumeCrise.jsx';

const TYPES = { filing: 'Dépôt officiel', dataset: 'Base de données', api: 'API', transcript: 'Transcription', other: 'Autre' };
const valeur = (s) => (typeof s.value === 'number' ? `${fr(s.value, s.value % 1 ? 2 : 0)}${s.unit ? ` ${s.unit}` : ''}` : s.value);

/** Une ligne de signal : nom, valeur, période et source (avec le lien quand il existe). */
function Signal({ s }) {
  return (
    <tr>
      <td><b>{s.name}</b></td>
      <td style={{ whiteSpace: 'nowrap' }}><b className="accent">{valeur(s)}</b></td>
      <td className="petit" style={{ whiteSpace: 'nowrap' }}>{s.period || <span className="nd">n. d.</span>}</td>
      <td className="petit"><span className="pastille">{TYPES[s.source.type] || s.source.type}</span> <span className="discret">{s.source.ref}</span>
        {s.source.url && <> <a href={s.source.url} target="_blank" rel="noreferrer">Ouvrir la source</a></>}</td>
    </tr>
  );
}

/** Conclusion : la proposition finale à Onesheet. Pour chaque titre retenu : thèse, avantage de notre outil et signaux sourcés. */
export default function PageConclusion() {
  const retenus = CHOIX.filter((c) => passeLeTest(c.ticker));
  const ecartesDuFichier = CHOIX.filter((c) => !passeLeTest(c.ticker));

  return (
    <main className="page">
      <header className="centre">
        <p className="etiquette accent">Conclusion</p>
        <h1>Notre proposition pour l’indice Serial Acquirers</h1>
        <p className="discret intro">Les titres que nous proposons à Onesheet, avec pour chacun notre thèse, l’avantage de notre outil et les signaux qu’il a trouvés, chacun avec sa source.
          Onesheet choisit les poids : nous ne proposons que les titres.</p>
      </header>

      <section className="carte vedette" style={{ margin: '1.4rem 0' }}>
        <div className="etiquette">Titres proposés</div>
        <h2 style={{ fontSize: '1.8rem', margin: '0.3rem 0' }}>{retenus.map((c) => `${BAISSES[c.ticker]?.nom || c.ticker} (${c.ticker})`).join(' et ')}</h2>
        <p className="petit" style={{ margin: 0 }}>Comment on y arrive : le classement mesure la qualité selon ton profil, puis le test de crise écarte les titres qui feraient trop baisser l’indice.</p>
      </section>
      <ConclusionCrises />

      {ecartesDuFichier.length > 0 && (
        <p className="petit" style={{ color: 'var(--alerte)' }}>
          À vérifier avant l’envoi : le fichier de proposition contient aussi {ecartesDuFichier.map((c) => c.ticker).join(', ')}, qui échoue au test de crise. Il n’est pas montré ici.
        </p>
      )}

      {retenus.map((c) => (
        <section key={c.ticker} className="carte" style={{ marginTop: '1.2rem' }}>
          <div className="rangee entre">
            <h2 style={{ margin: 0 }}>{BAISSES[c.ticker]?.nom || c.ticker} <span className="discret">{c.ticker} · {c.exchange}</span></h2>
            <a className="bouton" href={`#/entreprise/${c.ticker}`}>Ouvrir la fiche</a>
          </div>
          <div className="grille deux-colonnes" style={{ marginTop: '0.8rem' }}>
            <div>
              <h3 className="lime">Thèse</h3>
              <p style={{ marginTop: 0 }}>{c.thesis}</p>
            </div>
            <div>
              <h3 className="lime">Notre avantage (edge)</h3>
              <p style={{ marginTop: 0 }}>{c.edge}</p>
            </div>
          </div>
          <h3 className="lime">Signaux trouvés par notre outil ({c.signals.length})</h3>
          <div className="defilement">
            <table className="donnees">
              <thead><tr><th>Signal</th><th>Valeur</th><th>Période</th><th>Source</th></tr></thead>
              <tbody>{c.signals.map((s) => <Signal key={s.name} s={s} />)}</tbody>
            </table>
          </div>
          {(c.risks?.length > 0 || c.review_trigger) && (
            <div className="grille deux-colonnes" style={{ marginTop: '0.8rem' }}>
              {c.risks?.length > 0 && (
                <div>
                  <h3 style={{ color: 'var(--alerte)' }}>Risques</h3>
                  <ul className="petit" style={{ marginTop: 0 }}>{c.risks.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              )}
              {c.review_trigger && (
                <div>
                  <h3 className="lime">Quand revoir ce choix</h3>
                  <p className="petit" style={{ marginTop: 0 }}>{c.review_trigger}</p>
                </div>
              )}
            </div>
          )}
        </section>
      ))}

      <p className="discret petit" style={{ marginTop: '1.2rem' }}>
        Textes en anglais, tels qu’envoyés dans le fichier JSON (format <a href={SCHEMA_URL} target="_blank" rel="noreferrer">trimestre.index-proposal/v2</a>).
        Fichier vérifié avec le <a href={VALIDATEUR_URL} target="_blank" rel="noreferrer">validateur d’Onesheet</a>, puis envoyé à {COURRIEL_ENVOI} avant le {DATE_LIMITE.slice(0, 10)} à 16 h (heure de l’Est).
        Ce n’est pas un conseil de placement.
      </p>
    </main>
  );
}

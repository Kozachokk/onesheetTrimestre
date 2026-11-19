import { useMemo, useState } from 'react';
import { useProfil } from '../etat/ProfilContext.jsx';
import { BAISSES } from '../data/crises.js';
import { CANDIDATS, HORIZONS, PLAFOND, SCENARIOS, SOURCE_RENDEMENTS, simulerMarche, statistiquesHistoriques } from '../lib/simulation.js';
import { fr } from '../lib/format.js';
import TestDeCrise from '../components/commun/TestDeCrise.jsx';
import { ConclusionCrises } from '../components/commun/ResumeCrise.jsx';
import Repliable from '../components/commun/Repliable.jsx';

const pct = (x, d = 1) => (x === null || x === undefined ? 'n. d.' : `${x > 0 ? '+' : ''}${fr(x, d)} %`);
const dollars = (x) => `${fr(x, 0)} $`;
const source = (
  <>Source : <a href={SOURCE_RENDEMENTS.url} target="_blank" rel="noreferrer">{SOURCE_RENDEMENTS.base}</a>, rendements mensuels {SOURCE_RENDEMENTS.periode},
    en {SOURCE_RENDEMENTS.devise}, téléchargés le {SOURCE_RENDEMENTS.date}.</>
);

/** Rangée de boutons à choix unique. */
function Choix({ options, valeur, changer }) {
  return (
    <div className="rangee">
      {options.map((o) => (
        <button key={o.id} type="button" className={`bouton ${valeur === o.id ? 'plein' : ''}`} aria-pressed={valeur === o.id} onClick={() => changer(o.id)} title={o.titre}>{o.nom}</button>
      ))}
    </div>
  );
}

/** Graphique : valeur de 100 $ mois par mois (médiane des trajectoires) et bande où tombent 90 % des trajectoires avec tes titres. */
function GraphiqueSimulation({ r }) {
  const [survol, setSurvol] = useState(null);
  const L = 760; const H = 280; const g = { haut: 16, bas: 30, gauche: 52, droite: 96 };
  const nMois = r.annees * 12;
  const toutes = [...r.avec.bande.flat(), ...r.actuel.bande.map((b) => b[1])];
  const min = Math.min(100, ...toutes) * 0.95; const max = Math.max(...toutes) * 1.03;
  const x = (m) => g.gauche + (m / nMois) * (L - g.gauche - g.droite);
  const y = (v) => g.haut + (1 - (v - min) / (max - min)) * (H - g.haut - g.bas);
  const ligne = (bande, k) => bande.map((b, m) => `${m ? 'L' : 'M'}${x(m).toFixed(1)},${y(b[k]).toFixed(1)}`).join('');
  const zone = `${ligne(r.avec.bande, 2)}${[...r.avec.bande].reverse().map((b, j) => `L${x(nMois - j).toFixed(1)},${y(b[0]).toFixed(1)}`).join('')}Z`;
  const pas = (max - min) / 4;
  const graduations = [0, 1, 2, 3, 4].map((i) => min + i * pas);
  const ans = Array.from({ length: r.annees + 1 }, (_, a) => a).filter((a) => r.annees <= 5 || a % 2 === 0);
  const bouger = (ev) => {
    const boite = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - boite.left) / boite.width) * L;
    setSurvol(Math.round(Math.min(Math.max((px - g.gauche) / (L - g.gauche - g.droite), 0), 1) * nMois));
  };
  const fin = r.avec.bande[nMois]; const finActuel = r.actuel.bande[nMois];

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${L} ${H}`} className="graphique-simulation" role="img" onMouseMove={bouger} onMouseLeave={() => setSurvol(null)}
        aria-label={`Valeur médiane de 100 $ après ${r.annees} ans : ${fr(r.actuel.mediane, 0)} $ pour l’indice actuel, ${fr(r.avec.mediane, 0)} $ avec tes titres.`}>
        {graduations.map((v) => (
          <g key={v}>
            <line x1={g.gauche} x2={L - g.droite} y1={y(v)} y2={y(v)} stroke="var(--bord)" strokeWidth="1" />
            <text x={g.gauche - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--discret)">{fr(v, 0)} $</text>
          </g>
        ))}
        {ans.map((a) => <text key={a} x={x(a * 12)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--discret)">{a === 0 ? 'auj.' : `${a} an${a > 1 ? 's' : ''}`}</text>)}
        <path d={zone} fill="var(--accent)" opacity="0.13" />
        <path d={ligne(r.actuel.bande, 1)} fill="none" stroke="var(--discret)" strokeWidth="2" strokeDasharray="6 4" />
        <path d={ligne(r.avec.bande, 1)} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <text x={x(nMois) + 8} y={y(fin[1]) + (fin[1] >= finActuel[1] ? -2 : 12)} fontSize="12" fill="var(--texte)">Avec tes titres</text>
        <text x={x(nMois) + 8} y={y(finActuel[1]) + (fin[1] >= finActuel[1] ? 12 : -2)} fontSize="12" fill="var(--discret)">Indice actuel</text>
        {survol !== null && (
          <g>
            <line x1={x(survol)} x2={x(survol)} y1={g.haut} y2={H - g.bas} stroke="var(--discret)" strokeWidth="1" />
            <circle cx={x(survol)} cy={y(r.avec.bande[survol][1])} r="4" fill="var(--accent)" stroke="var(--carte)" strokeWidth="2" />
            <circle cx={x(survol)} cy={y(r.actuel.bande[survol][1])} r="4" fill="var(--discret)" stroke="var(--carte)" strokeWidth="2" />
          </g>
        )}
        <rect x={g.gauche} y={g.haut} width={L - g.gauche - g.droite} height={H - g.haut - g.bas} fill="transparent" />
      </svg>
      {survol !== null && (
        <div className="carte petit" style={{ position: 'absolute', top: 8, left: `${Math.min((x(survol) / L) * 100, 62)}%`, padding: '0.5rem 0.7rem', pointerEvents: 'none' }}>
          <b>{survol === 0 ? 'Aujourd’hui' : `Après ${fr(survol / 12, 1)} an${survol > 12 ? 's' : ''}`}</b><br />
          Avec tes titres : {dollars(r.avec.bande[survol][1])} <span className="discret">({dollars(r.avec.bande[survol][0])} à {dollars(r.avec.bande[survol][2])})</span><br />
          Indice actuel : {dollars(r.actuel.bande[survol][1])}
        </div>
      )}
      <div className="legende">
        <span><span className="pastille-couleur" style={{ background: 'var(--accent)' }} />Avec tes titres (médiane)</span>
        <span><span className="pastille-couleur" style={{ background: 'var(--accent)', opacity: 0.3 }} />90 % des trajectoires avec tes titres</span>
        <span><span className="pastille-couleur" style={{ background: 'var(--discret)' }} />Indice actuel (médiane, pointillés)</span>
      </div>
    </div>
  );
}

/** Nombre de titres proposés d'office : les premiers admissibles du classement de ton profil. */
const NB_PROPOSES = 2;

/** Titres proposés par le profil : les mieux classés qui ne sont pas éliminés, parmi les candidats. */
function titresDuProfil(resultats) {
  return resultats.filter((r) => !r.elimine && r.score !== null && CANDIDATS.includes(r.ticker)).slice(0, NB_PROPOSES).map((r) => r.ticker);
}

/** Simulation générale : choisir les titres, le marché et les crises, puis voir le rendement de l'indice. Le test de crise d'Onesheet en fait partie. */
export default function PageSimulation() {
  const { resultats, profil, ajuste } = useProfil();
  const proposes = useMemo(() => titresDuProfil(resultats), [resultats]);
  const [titres, setTitres] = useState(proposes);
  const nomProfil = profil ? `${profil.nom}${ajuste ? ' (ajusté)' : ''}` : 'profil sur mesure';
  const memeQueProfil = titres.length === proposes.length && proposes.every((t) => titres.includes(t));
  const [poids, setPoids] = useState(PLAFOND * 100);
  const [annees, setAnnees] = useState(5);
  const [scenario, setScenario] = useState('historique');
  const [crises, setCrises] = useState(true);
  const r = useMemo(() => simulerMarche({ tickers: titres, poids, annees, scenario, crises }), [titres, poids, annees, scenario, crises]);
  const hist = useMemo(() => statistiquesHistoriques(), []);
  const basculer = (t) => setTitres((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  const sc = SCENARIOS.find((s) => s.id === scenario);

  return (
    <main className="page">
      <p className="etiquette accent">Simulation</p>
      <h1>Et si on ajoutait ces titres à l’indice ?</h1>
      <p className="discret" style={{ maxWidth: 760 }}>Choisis des titres, un type de marché et si les crises sont incluses. Le site rejoue 1 000 avenirs possibles
        à partir de vrais mois passés (2016 à 2026) et compare l’indice Serial Acquirers actuel à l’indice avec tes titres.</p>

      <section className="carte" style={{ marginTop: '1rem' }}>
        <div className="reglages-simulation">
          <div>
            <p className="etiquette">1. Titres à ajouter</p>
            <p className="petit" style={{ margin: '0 0 0.5rem' }}>
              {proposes.length
                ? <>Choisis selon ton profil (<b>{nomProfil}</b>) : les {proposes.length} premiers titres admissibles de ton classement, <b>{proposes.join(' et ')}</b>.</>
                : <>Ton profil (<b>{nomProfil}</b>) n’a aucun titre admissible : choisis-en toi-même.</>}
              {!memeQueProfil && proposes.length > 0 && <> <button type="button" className="lien" onClick={() => setTitres(proposes)}>Revenir aux titres de mon profil</button></>}
            </p>
            <div className="rangee">
              {CANDIDATS.map((t) => (
                <button key={t} type="button" className={`bouton ${titres.includes(t) ? 'plein' : ''}`} aria-pressed={titres.includes(t)} onClick={() => basculer(t)} title={BAISSES[t].nom}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="etiquette">2. Poids de chaque titre</p>
            <div className="curseur" style={{ gridTemplateColumns: '2fr 3.4rem' }}>
              <input type="range" min="1" max={PLAFOND * 100} step="0.5" value={poids} aria-label="Poids de chaque titre"
                style={{ '--part': `${(poids / (PLAFOND * 100)) * 100}%` }} onChange={(e) => setPoids(Number(e.target.value))} />
              <output>{fr(poids, 1)} %</output>
            </div>
            <p className="discret petit" style={{ margin: 0 }}>Au plus {fr(PLAFOND * 100, 0)} % par titre (règle d’Onesheet). Le reste ({fr(r.poidsIndice ?? 100, 0)} %) reste dans l’indice actuel.</p>
          </div>
          <div>
            <p className="etiquette">3. Durée</p>
            <Choix options={HORIZONS.map((a) => ({ id: a, nom: `${a} an${a > 1 ? 's' : ''}` }))} valeur={annees} changer={setAnnees} />
          </div>
          <div>
            <p className="etiquette">4. Marché</p>
            <Choix options={SCENARIOS.map((s) => ({ id: s.id, nom: s.nom, titre: s.explication }))} valeur={scenario} changer={setScenario} />
            <p className="discret petit" style={{ margin: '0.4rem 0 0' }}>{sc.explication}</p>
          </div>
          <div>
            <p className="etiquette">5. Crises</p>
            <label className="case">
              <input type="checkbox" checked={crises} onChange={(e) => setCrises(e.target.checked)} />
              <b>{crises ? 'Crises incluses (allumé)' : 'Crises exclues (éteint)'}</b>
            </label>
            <p className="discret petit" style={{ margin: '0.2rem 0 0' }}>{crises
              ? 'COVID 2020, hausse des taux 2022 et tarifs 2025 sont rejoués tels quels, aussi souvent que de 2016 à 2026 (3 en 10 ans).'
              : 'Aucun mois de crise : un marché sans krach, donc plus optimiste que la réalité.'}</p>
          </div>
        </div>
      </section>

      {r.erreur ? <p style={{ color: 'var(--alerte)' }}>{r.erreur}</p> : (
        <section className="carte vedette" style={{ marginTop: '1rem' }} aria-live="polite">
          <div className="etiquette">Résultat sur {annees} an{annees > 1 ? 's' : ''}, 100 $ placés aujourd’hui (médiane de {fr(r.n, 0)} trajectoires)</div>
          <div className="chiffres-cles" style={{ margin: '0.6rem 0 1rem' }}>
            <div className="chiffre"><span className="etiquette">Indice actuel</span><b>{dollars(r.actuel.mediane)}</b><span className="discret petit">{pct(r.actuel.rendementAnnuel)} par an</span></div>
            <div className="chiffre"><span className="etiquette">Avec {titres.length ? titres.join(' + ') : 'aucun titre'}</span><b className="accent">{dollars(r.avec.mediane)}</b><span className="discret petit">{pct(r.avec.rendementAnnuel)} par an</span></div>
            <div className="chiffre"><span className="etiquette">Pire baisse (médiane)</span><b>{pct(r.avec.pireBaisse)}</b><span className="discret petit">indice actuel : {pct(r.actuel.pireBaisse)}</span></div>
            <div className="chiffre"><span className="etiquette">Fait mieux que l’indice</span><b>{titres.length ? `${fr(r.probabiliteMieux, 0)} %` : 'n. d.'}</b><span className="discret petit">des trajectoires</span></div>
          </div>
          <GraphiqueSimulation r={r} />
          <p className="discret petit">Dans 90 % des cas, 100 $ deviennent entre {dollars(r.avec.bas)} et {dollars(r.avec.haut)} avec tes titres (indice actuel : {dollars(r.actuel.bas)} à {dollars(r.actuel.haut)}).
            {crises && ` En moyenne ${fr(r.crisesParTrajectoire, 1)} crise par trajectoire.`} {r.moisUtilises} mois ordinaires tirés ({r.periode}). Indice actuel : moyenne à poids égaux de {r.nMembres} membres connus. {source}</p>
          <p className="discret petit" style={{ marginBottom: 0 }}>C’est une simulation à partir du passé, pas une prévision ni un conseil de placement.</p>
        </section>
      )}

      <Repliable titre="Les vrais chiffres de 2016 à 2026 (base de la simulation)">
        <div className="defilement">
          <table className="donnees">
            <thead><tr><th>Série</th><th>Rendement annuel moyen</th><th>Volatilité annuelle</th><th>Historique</th></tr></thead>
            <tbody>
              <tr><td><b>Indice actuel</b> <span className="discret petit">({r.nMembres ?? ''} membres, poids égaux)</span></td><td>{pct(hist.indice.rendement)}</td><td>{fr(hist.indice.volatilite, 1)} %</td><td className="petit">{hist.indice.mois} mois depuis {hist.indice.debut}</td></tr>
              {CANDIDATS.map((t) => {
                const s = hist.titres[t];
                return <tr key={t}><td><b>{t}</b> <span className="discret petit">{BAISSES[t].nom}</span></td><td>{pct(s.rendement)}</td><td>{fr(s.volatilite, 1)} %</td><td className="petit">{s.mois} mois depuis {s.debut}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <p className="discret petit">Rendement annuel moyen composé, dividendes inclus. Volatilité : écart type des rendements mensuels × √12. {source}</p>
      </Repliable>

      <Repliable titre="Comment la simulation est calculée">
        <ol className="petit" style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.7 }}>
          <li>On prend les vrais rendements mensuels de chaque titre et des membres de l’indice, de {SOURCE_RENDEMENTS.periode}.</li>
          <li>Pour chaque avenir possible, on tire au hasard des mois passés et on les enchaîne. Le même mois sert pour tous les titres : quand le marché a baissé, ils baissent ensemble.</li>
          <li>Marché calme ou intense : les hausses et les baisses de chaque mois sont réduites (× 0,5) ou grossies (× 1,5) autour de la moyenne. La moyenne ne change pas.</li>
          <li>Crises : les mois des trois crises sont retirés des tirages ordinaires. Allumées, chaque crise est rejouée en bloc, telle qu’elle s’est passée, à sa fréquence réelle.</li>
          <li>Indice avec tes titres : chaque titre a le poids choisi, le reste suit l’indice actuel ; les poids sont remis à niveau chaque mois.</li>
          <li>On répète {fr(1000, 0)} fois et on montre la médiane et la fourchette où tombent 90 % des résultats.</li>
        </ol>
      </Repliable>

      <h2 style={{ marginTop: '2rem' }}>Test de crise d’Onesheet</h2>
      <ConclusionCrises />
      <Repliable titre="Refaire le test de crise toi-même">
        <TestDeCrise />
      </Repliable>
    </main>
  );
}

import { useMemo, useState } from 'react';
import { useProfil } from '../etat/ProfilContext.jsx';
import { sectionsDetail } from '../lib/detail.js';
import { ficheQualitative } from '../lib/qualitatif.js';
import { graphiquesDuTitre } from '../lib/series.js';
import { CRITERES } from '../lib/pointage.js';
import { DEFS } from '../lib/ratios.js';
import { fr, formater, formaterMontant } from '../lib/format.js';
import { getLatestQuarterMetric } from '../lib/formatters.js';
import CompanyHeader from '../components/fiche/CompanyHeader.jsx';
import KpiGrid from '../components/fiche/KpiGrid.jsx';
import FinancialChart from '../components/graphiques/FinancialChart.jsx';
import DataTable from '../components/graphiques/DataTable.jsx';
import Graphique from '../components/graphiques/Graphique.jsx';
import Repliable from '../components/commun/Repliable.jsx';
import Source from '../components/commun/Source.jsx';
import Barre from '../components/commun/Barre.jsx';
import SousCompagnies from '../components/fiche/SousCompagnies.jsx';
import { DONNEES as ACHATS } from '../lib/acquisitions.js';

/** Explorateur d'origine du site : graphique interactif et tableau complet des périodes. */
function Explorateur({ entreprise }) {
  const [periodType, setPeriodType] = useState('Quarterly');
  const [chartType, setChartType] = useState('bar');
  const [metricMode, setMetricMode] = useState('revenue');
  const periodes = useMemo(() => entreprise.periodes.filter((p) => p.periodType === periodType).sort((a, b) => (a.reportDate > b.reportDate ? 1 : -1)),
    [entreprise, periodType]);
  return (
    <>
      <FinancialChart periods={periodes} periodType={periodType} chartType={chartType} metricMode={metricMode}
        source={`fichier JSON OneSheet (${entreprise.deviseRapport})`}
        onPeriodChange={setPeriodType} onChartTypeChange={setChartType} onMetricSelect={setMetricMode} />
      <DataTable periods={periodes} periodType={periodType} />
    </>
  );
}

/** Fiche d'une entreprise : l'essentiel visible, le reste dans des sections repliées. */
export default function PageEntreprise({ ticker }) {
  const { config, entreprises, parTicker, resultats, rangs, poids, total, dirigeants } = useProfil();
  const e = entreprises[ticker];
  const r = parTicker[ticker];
  const [typesChoisis, setTypesChoisis] = useState(['acquisition', 'litigation', 'capital-return']);
  if (!e || !r) return <main className="page"><h1>Titre introuvable</h1><a className="bouton" href="#/classement">Retour au classement</a></main>;

  const dirigeant = dirigeants[ticker];
  const kpis = { revenue: getLatestQuarterMetric(e.periodes, 'revenue'), netIncome: getLatestQuarterMetric(e.periodes, 'net_income'),
    ebitda: getLatestQuarterMetric(e.periodes, 'adjusted_ebitda'), eps: getLatestQuarterMetric(e.periodes, 'eps') };
  const champ = (cle) => e.champs[cle] || {};
  const essentiels = [['Cours', 'prix_cad', (v) => formater(v, 'dollars')], ['Capitalisation', 'capitalisation_cad_m', formaterMontant],
    ['Revenus (12 mois)', 'revenus_ttm_cad_m', formaterMontant], ['FCF (12 mois)', 'fcf_ttm_cad_m', formaterMontant],
    ['Bénéfice net (12 mois)', 'benefice_net_ttm_cad_m', formaterMontant], ['Dette totale', 'dette_totale_cad_m', formaterMontant]];
  const sections = sectionsDetail(e, r.valeurs, config.taux_change);
  const qualitatif = ficheQualitative(e, r);
  const graphiques = graphiquesDuTitre(e, resultats, config.seuil_p_fcf);
  const types = [...new Set(e.evenements.map((ev) => ev.type))].sort();
  const evenements = e.evenements.filter((ev) => typesChoisis.includes(ev.type)).slice(0, 12);

  return (
    <main className="page">
      <a className="discret petit" href="#/classement">← Retour au classement</a>
      <div className="app-container" style={{ marginTop: '0.6rem' }}>
        <CompanyHeader companyName={e.nom} companySymbol={ticker} currency={e.deviseRapport} exchange={e.bourse || 'TSX'}
          sector={e.secteur || 'Secteur n. d.'} source="JSON OneSheet + données de marché" description={e.description} />
      </div>

      <div className="grille deux-colonnes">
        <section className="carte vedette">
          <div className="etiquette">Selon ton profil</div>
          <div className="rangee entre">
            <div>
              <span style={{ fontSize: '2.6rem', fontWeight: 800 }} className="accent">{r.score === null ? 'n. d.' : Math.round(r.score)}</span>
              <span className="discret"> / 100 · rang {rangs[ticker] ?? '–'} sur {resultats.length}</span>
              <div>{r.elimine ? <span className="pastille non">Éliminé : {r.raisons.join(' ; ')}</span> : <span className="pastille ok">Admissible</span>}
                <span className="pastille" style={{ marginLeft: 6 }}>confiance {Math.round(r.confiance * 100)} %</span></div>
            </div>
            {dirigeant && <div className="petit" style={{ textAlign: 'right' }}><b>{dirigeant.nom}</b><br /><span className="discret">{dirigeant.titre}</span><br /><a href="#/hall">Voir au Hall des dirigeants</a></div>}
          </div>
        </section>
        <section className="carte">
          <div className="etiquette">Tes critères, pour ce titre</div>
          {CRITERES.map((c) => (
            <div key={c.id} className="rangee entre" style={{ padding: '0.16rem 0' }}>
              <span>{c.nom} <span className="discret petit">({total > 0 ? Math.round(((poids[c.id] || 0) / total) * 100) : 0} %)</span></span>
              <span><b style={{ marginRight: 10 }}>{formater(r.valeurs[c.id].valeur, DEFS[c.id].format)}</b><Barre note={r.notes[c.id]} largeur={70} /></span>
            </div>
          ))}
        </section>
      </div>

      <div className="chiffres-cles" style={{ margin: '1rem 0' }}>
        {essentiels.map(([nom, cle, f]) => (
          <div key={cle} className="chiffre">
            <span className="etiquette">{nom}</span>
            <b>{f(champ(cle).valeur ?? null)}</b>
            <Source {...champ(cle)} />
          </div>
        ))}
      </div>
      <div className="app-container"><KpiGrid kpis={kpis} /></div>

      <Repliable titre="Voir plus de données">
        {sections.map((s) => (
          <div key={s.titre} style={{ marginBottom: '1rem' }}>
            <h3 className="lime">{s.titre}</h3>
            <div className="defilement">
              <table className="donnees">
                <tbody>
                  {s.lignes.map((l) => (
                    <tr key={l.nom}>
                      <td>{l.nom}</td>
                      <td className={l.valeur === null ? 'nd' : ''} style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formater(l.valeur, l.format)}</td>
                      <td className="discret petit">{l.valeur === null ? '' : `${l.source.slice(0, 60)}${l.source.length > 60 ? '…' : ''}`}</td>
                      <td className="discret petit" style={{ whiteSpace: 'nowrap' }}>{l.date}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{l.valeur !== null && <Source {...l} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <p className="discret petit">Montants en dollars canadiens (1 USD = {fr(config.taux_change.USD, 2)} CAD, 1 EUR = {fr(config.taux_change.EUR, 2)} CAD). « n. d. » : la donnée n’est pas dans les sources.</p>
      </Repliable>

      <Repliable titre={`Sous-compagnies : entreprises achetées (${(ACHATS.LISTES[ticker] || []).length})`}>
        <SousCompagnies ticker={ticker} />
      </Repliable>

      <Repliable titre="Fiche qualitative">
        <p className="discret petit">Fiche informative : elle ne compte pas dans le pointage. Chaque note est calculée par une règle à partir des données du site ; ce n’est pas un jugement d’analyste.</p>
        <table className="donnees">
          <tbody>
            {qualitatif.map((c) => (
              <tr key={c.nom}>
                <td style={{ width: 210 }}><b>{c.nom}</b></td>
                <td style={{ width: 130 }}>{c.note === null ? <span className="nd">non évalué</span>
                  : <span className="etoiles" title={`${c.note} sur 5`}>{'●'.repeat(c.note)}<i>{'●'.repeat(5 - c.note)}</i></span>}</td>
                <td>{c.note === null ? <span className="nd">Aucune donnée sourcée dans les fichiers du site.</span> : c.justification}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{c.note !== null && <Source source={c.source} date="2026-11-12" url={c.url} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Repliable>

      <Repliable titre="Voir les graphiques financiers">
        {graphiques.map((g) => <Graphique key={g.titre} graphique={g} />)}
        <div className="app-container" style={{ marginTop: '1rem' }}>
          <h3 className="lime">Explorateur des résultats</h3>
          <Explorateur entreprise={e} />
        </div>
      </Repliable>

      <Repliable titre={`Événements récents (${e.evenements.length})`}>
        <div className="rangee" style={{ marginBottom: '0.7rem' }}>
          {types.map((t) => (
            <label key={t} className="case">
              <input type="checkbox" checked={typesChoisis.includes(t)} onChange={() => setTypesChoisis((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]))} />
              {config.types_evenements[t] || t}
            </label>
          ))}
        </div>
        {evenements.length ? evenements.map((ev, i) => (
          <p key={`${i}-${ev.date}`}>
            <b>{ev.date || 'date n. d.'} · {config.types_evenements[ev.type] || ev.type}</b> : {ev.resume}{' '}
            <Source source={`JSON OneSheet · ${ev.source}`} date={ev.date} url={ev.url} citation={ev.citation} />
          </p>
        )) : <p className="discret">Aucun événement de ce type.</p>}
        <p className="discret petit">Résumés tirés tels quels des dépôts (en anglais). Les 12 plus récents sont affichés.</p>
      </Repliable>
    </main>
  );
}

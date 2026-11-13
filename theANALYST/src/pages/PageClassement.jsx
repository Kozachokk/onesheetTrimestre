import { useMemo } from 'react';
import { useProfil } from '../etat/ProfilContext.jsx';
import { aller } from '../etat/navigation.js';
import { PROFILS, classer, gagnant, poidsDuProfil, seuilsDuProfil } from '../lib/pointage.js';
import { CATEGORIES, seuilsParDefaut } from '../lib/ratios.js';
import { csvClassement, justification } from '../lib/rapport.js';
import { fr, formater } from '../lib/format.js';
import Barre from '../components/commun/Barre.jsx';
import Repliable from '../components/commun/Repliable.jsx';
import Repartition from '../components/classement/Repartition.jsx';

function telecharger(nom, contenu) {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }));
  lien.download = nom;
  lien.click();
  URL.revokeObjectURL(lien.href);
}

/** Classement complet, titre en tête, justification, solidité du choix et comparaison des profils. */
export default function PageClassement() {
  const { config, entreprises, resultats, rangs, premier, solidite, poids, profil, ajuste } = useProfil();
  const j = useMemo(() => justification(resultats, poids), [resultats, poids]);
  const parProfil = useMemo(() => {
    const base = seuilsParDefaut(config.taux_obligataire_10ans);
    return Object.fromEntries(PROFILS.map((p) => [p.id, classer(entreprises, poidsDuProfil(p), seuilsDuProfil(p, base), p.filtres || [], config.filtres)]));
  }, [entreprises, config]);
  const nomProfil = profil ? `${profil.nom}${ajuste ? ' (ajusté)' : ''}` : 'profil sur mesure';

  return (
    <main className="page">
      <p className="etiquette accent">Classement selon ton profil : {nomProfil}</p>
      <h1>Les titres, du mieux noté au moins bien noté</h1>

      <section className="carte vedette" style={{ margin: '1rem 0' }}>
        <div className="etiquette">Titre en tête pour ce profil</div>
        {premier ? (
          <div className="rangee entre">
            <div>
              <h2 style={{ fontSize: '1.8rem', margin: '0.2rem 0' }}>{premier.nom} <span className="discret">({premier.ticker})</span></h2>
              <span>Pointage <b className="accent">{Math.round(premier.score)} / 100</b> · confiance {Math.round(premier.confiance * 100)} %
                {solidite?.gagnant === premier.ticker && <> · reste premier dans {Math.round(solidite.partGagnant * 100)} % des simulations</>}</span>
            </div>
            <a className="bouton plein" href={`#/entreprise/${premier.ticker}`}>Ouvrir la fiche</a>
          </div>
        ) : <h2>Aucun titre admissible : assouplis les filtres ou monte un curseur.</h2>}
      </section>

      <Repartition />

      <section className="carte defilement">
        <table className="donnees">
          <thead>
            <tr><th>Rang</th><th>Titre</th><th>Pointage</th><th>Confiance</th><th>Statut</th>{CATEGORIES.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {resultats.map((r) => (
              <tr key={r.ticker} className={`cliquable ${r.elimine ? 'elimine' : ''}`} onClick={() => aller('entreprise', r.ticker)} title="Ouvrir la fiche">
                <td>{rangs[r.ticker] ?? '–'}</td>
                <td><b>{r.ticker}</b> · {r.nom}</td>
                <td><Barre note={r.score} largeur={100} /></td>
                <td title="Part du poids pour laquelle les données existent">{Math.round(r.confiance * 100)} %</td>
                <td>{r.elimine ? <span className="pastille non">Éliminé : {r.raisons.join(' ; ')}</span> : <span className="pastille ok">Admissible</span>}</td>
                {CATEGORIES.map((c) => <td key={c}><Barre note={r.categories[c]} largeur={46} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="discret petit" style={{ marginTop: '0.6rem' }}>
          Colonnes de droite : note moyenne de chaque catégorie de ratios, de 0 à 100. Un titre éliminé reste visible, en gris, avec la raison.
        </p>
        <button type="button" className="bouton" onClick={() => telecharger('classement.csv', csvClassement(resultats))}>Télécharger le classement (CSV)</button>
      </section>

      {j && (
        <Repliable titre={`Pourquoi ${j.premier.nom} est en tête`} ouvert>
          <div className="grille" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div>
              <h3 className="accent">Forces</h3>
              {j.forces.length ? j.forces.map((x) => <p key={x.id}>{x.nom} : <b>{x.valeur}</b> (note {Math.round(x.note)}, +{fr(x.points, 1)} points)</p>) : <p className="discret">Aucune force marquée.</p>}
            </div>
            <div>
              <h3 style={{ color: 'var(--alerte)' }}>Faiblesses</h3>
              {j.faiblesses.length ? j.faiblesses.map((x) => <p key={x.id}>{x.nom} : <b>{x.valeur}</b> (note {Math.round(x.note)}, {fr(x.perdus, 1)} points perdus)</p>) : <p className="discret">Aucune faiblesse parmi les critères pondérés.</p>}
            </div>
            {j.deuxieme && (
              <div>
                <h3 className="lime">Face au 2e, {j.deuxieme.nom}</h3>
                <p>Avance de {fr(j.premier.score - j.deuxieme.score, 1)} points.</p>
                {j.ecarts.map((x) => <p key={x.id}>{x.nom} : {formater(x.valeurA, x.format)} contre {formater(x.valeurB, x.format)} ({x.ecart > 0 ? '+' : ''}{fr(x.ecart, 1)} points)</p>)}
              </div>
            )}
          </div>
          <p className="discret petit">Tous ces chiffres viennent des ratios calculés par le site. Ce n’est pas une recommandation d’achat.</p>
        </Repliable>
      )}

      <Repliable titre="Solidité du choix : 500 simulations">
        <p>On refait le classement {config.nb_simulations} fois en faisant varier chaque poids au hasard de ±{config.amplitude_simulation * 100} %. Si le premier change souvent, le choix dépend trop des poids.</p>
        {solidite && Object.keys(solidite.frequences).length ? Object.entries(solidite.frequences).sort((a, b) => b[1] - a[1]).map(([t, f]) => (
          <div key={t} className="rangee" style={{ padding: '0.25rem 0' }}>
            <b style={{ width: 60 }}>{t}</b><Barre note={f * 100} largeur={260} afficherNombre={false} /><span>premier dans {Math.round(f * 100)} % des cas</span>
          </div>
        )) : <p className="discret">Simulation impossible : aucun titre admissible ou aucun critère pondéré.</p>}
      </Repliable>

      <Repliable titre="Qui gagne selon le style d’investisseur ?">
        <div className="defilement">
          <table className="donnees">
            <thead><tr><th>Titre</th>{PROFILS.map((p) => <th key={p.id} title={p.description}>{p.nom}</th>)}</tr></thead>
            <tbody>
              {Object.keys(entreprises).sort().map((t) => (
                <tr key={t}>
                  <td><b>{t}</b></td>
                  {PROFILS.map((p) => {
                    const r = parProfil[p.id].find((x) => x.ticker === t);
                    const tete = gagnant(parProfil[p.id])?.ticker === t;
                    return <td key={p.id} className={r.elimine ? 'nd' : tete ? 'meilleur' : ''} title={r.elimine ? `Éliminé : ${r.raisons.join(' ; ')}` : ''}>
                      {r.score === null ? 'n. d.' : Math.round(r.score)}{r.elimine ? ' (éliminé)' : ''}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="discret petit">En vert : le premier de chaque profil, avec ses poids et ses filtres d’origine.</p>
      </Repliable>
    </main>
  );
}

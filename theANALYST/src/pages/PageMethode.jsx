import { useProfil } from '../etat/ProfilContext.jsx';
import { MENTION, PROFILS, CRITERES } from '../lib/pointage.js';
import { CATEGORIES, DEFINITIONS } from '../lib/ratios.js';
import { formater } from '../lib/format.js';
import Repliable from '../components/commun/Repliable.jsx';

/** Méthode : explication en langage simple du pointage, de chaque ratio, des profils et des données manquantes. */
export default function PageMethode() {
  const { config, seuils, resultats } = useProfil();
  const manquants = DEFINITIONS.map((d) => ({ d, sans: resultats.filter((r) => r.valeurs[d.id].valeur === null).map((r) => r.ticker) })).filter((x) => x.sans.length);
  return (
    <main className="page">
      <p className="etiquette accent">Méthode</p>
      <h1>Comment le pointage est calculé</h1>
      <section className="carte">
        <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li><b>Chaque ratio reçoit une note de 0 à 100.</b> Sous le seuil « mauvais », la note est 0 ; au-delà du seuil « bon », elle est 100 ; entre les deux, elle monte en ligne droite.</li>
          <li><b>Tu choisis l’importance de chaque critère</b> avec les curseurs. Un curseur à 0 exclut le critère.</li>
          <li><b>Pointage</b> = somme(importance × note) ÷ somme(importance des critères disponibles).</li>
          <li><b>Donnée absente</b> : le ratio vaut « n. d. », son importance est redistribuée et l’indice de confiance baisse.</li>
          <li><b>Filtres éliminatoires</b> : un titre qui échoue à un filtre actif est écarté, mais reste visible en gris avec la raison.</li>
          <li><b>Solidité</b> : {config.nb_simulations} simulations où chaque poids varie de ±{config.amplitude_simulation * 100} % montrent si le premier dépend trop des poids.</li>
        </ol>
      </section>

      {CATEGORIES.map((cat) => (
        <Repliable key={cat} titre={cat}>
          <div className="defilement">
            <table className="donnees">
              <thead><tr><th>Ratio</th><th>En une phrase</th><th>Formule</th><th>Seuils (mauvais → bon)</th></tr></thead>
              <tbody>
                {DEFINITIONS.filter((d) => d.categorie === cat).map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.nom}</b></td><td>{d.explication}</td><td className="discret">{d.formule}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formater(seuils[d.id][0], d.format)} → {formater(seuils[d.id][1], d.format)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Repliable>
      ))}

      <Repliable titre="Profils d’investisseur">
        <div className="defilement">
          <table className="donnees">
            <thead><tr><th>Profil</th>{CRITERES.map((c) => <th key={c.id}>{c.nom}</th>)}<th>Filtres</th></tr></thead>
            <tbody>
              {PROFILS.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.nom}</b>{p.inspire && <span className="discret petit"> ({MENTION})</span>}<br /><span className="discret petit">{p.description}</span></td>
                  {CRITERES.map((c) => <td key={c.id}>{p.poids[c.id]} %</td>)}
                  <td className="petit">{(p.filtres || []).map((f) => config.filtres[f].nom).join(', ') || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="discret petit">« {MENTION} » : ces profils reprennent des principes publics. Ce ne sont pas des recommandations de ces investisseurs.</p>
      </Repliable>

      <Repliable titre={`Données manquantes (${manquants.reduce((s, x) => s + x.sans.length, 0)})`}>
        <table className="donnees">
          <thead><tr><th>Ratio</th><th>Titres sans donnée</th></tr></thead>
          <tbody>{manquants.map(({ d, sans }) => <tr key={d.id}><td>{d.nom}</td><td className="discret">{sans.join(', ')}</td></tr>)}</tbody>
        </table>
        <p className="discret petit">Sources : fichiers JSON OneSheet (dépôts SEDAR+), stockanalysis.com (S&P Global) et Yahoo Finance pour les cours, au 12 novembre 2026.</p>
      </Repliable>
    </main>
  );
}

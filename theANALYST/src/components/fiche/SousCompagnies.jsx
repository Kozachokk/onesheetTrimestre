import { DONNEES, estVide, estimations, fichesAvecRatios, lienChiffres, statutChiffres, verdict } from '../../lib/acquisitions.js';
import { fr } from '../../lib/format.js';

/** Statut d'une entreprise achetée, avec des renvois adaptés à cette section. */
const statut = (fiche) => statutChiffres(fiche).replace('voir le tableau 2', 'chiffres plus bas').replace('(taille estimée au tableau 4)', '(taille estimée plus bas)');

const nb = (x, decimales = 1) => (estVide(x) ? <span className="nd">n. d.</span> : fr(x, decimales));

function Lien({ url, texte = 'Ouvrir ↗' }) {
  if (!url || !String(url).startsWith('http')) return <span className="nd">n. d.</span>;
  return <a href={url} target="_blank" rel="noreferrer">{texte}</a>;
}

/**
 * Sous-compagnies : les entreprises achetées par le titre, leurs chiffres réels quand ils existent,
 * où trouver leurs comptes, et (à part, bien identifiées) des estimations d'ordre de grandeur.
 */
export default function SousCompagnies({ ticker }) {
  const achats = DONNEES.LISTES[ticker] || [];
  const fiches = fichesAvecRatios(ticker);
  const estim = estimations(ticker);
  const v = verdict();
  if (!achats.length && !fiches.length) return <p className="discret">Aucune entreprise achetée recensée pour ce titre.</p>;

  const reels = fiches.filter((f) => !estVide(f.revenus)).length;
  const impossibles = estim.filter((e) => e.revenus.includes('impossible')).length;

  return (
    <div>
      <div className="chiffres-cles" style={{ marginBottom: '1rem' }}>
        <div className="chiffre"><span className="etiquette">Achats recensés</span><b>{achats.length}</b></div>
        <div className="chiffre"><span className="etiquette">Avec de vrais chiffres</span><b className="accent">{reels}</b></div>
        <div className="chiffre"><span className="etiquette">Taille seulement estimée</span><b className="lime">{estim.length - impossibles}</b></div>
        <div className="chiffre"><span className="etiquette">Impossibles à estimer</span><b>{impossibles}</b></div>
      </div>

      <h3 className="lime">Entreprises achetées</h3>
      <div className="defilement">
        <table className="donnees">
          <thead><tr><th>Date</th><th>Entreprise achetée</th><th>Prix payé</th><th>États financiers ?</th><th>Comptes</th><th>Description (rapport officiel)</th></tr></thead>
          <tbody>
            {achats.map((l, i) => (
              <tr key={`${i}-${l.date}`}>
                <td style={{ whiteSpace: 'nowrap' }}>{l.date || <span className="nd">n. d.</span>}</td>
                <td><b>{l.cible || <span className="nd">n. d.</span>}</b></td>
                <td style={{ whiteSpace: 'nowrap' }}>{estVide(l.montant) ? <span className="nd">n. d.</span> : `${l.montant} M`}</td>
                <td className="petit">{statut(l.fiche)}</td>
                <td><Lien url={lienChiffres(l.fiche)} /></td>
                <td className="discret petit">{l.resume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="discret petit">Prix en millions, dans la devise du rapport de l’acquéreur. Source : dépôts officiels (fichiers JSON OneSheet), descriptions en anglais.</p>

      {fiches.length > 0 && (
        <>
          <h3 className="lime" style={{ marginTop: '1.2rem' }}>Chiffres des entreprises achetées</h3>
          <div className="defilement">
            <table className="donnees">
              <thead>
                <tr><th>Entreprise</th><th>Devise</th><th>Prix payé</th><th>Revenus</th><th>BAIIA</th><th>Bénéfice net</th><th>Exercice</th>
                  <th>Prix ÷ revenus</th><th>Prix ÷ BAIIA</th><th>Marge BAIIA</th><th>Employés</th><th>Où trouver les comptes</th><th>Source</th></tr>
              </thead>
              <tbody>
                {fiches.map((f) => (
                  <tr key={f.cible} title={f.note || ''}>
                    <td><b>{f.cible}</b>{f.note && <><br /><span className="discret petit">{f.note}</span></>}</td>
                    <td>{f.devise}</td><td>{nb(f.prix)}</td><td>{nb(f.revenus)}</td><td>{nb(f.baiia)}</td><td>{nb(f.resultat_net)}</td>
                    <td className="petit">{f.exercice || <span className="nd">n. d.</span>}</td>
                    <td>{estVide(f.prixSurRevenus) ? <span className="nd">n. d.</span> : `${fr(f.prixSurRevenus, 2)}x`}</td>
                    <td>{estVide(f.prixSurBaiia) ? <span className="nd">n. d.</span> : `${fr(f.prixSurBaiia, 1)}x`}</td>
                    <td>{estVide(f.margeBaiia) ? <span className="nd">n. d.</span> : `${fr(f.margeBaiia, 1)} %`}</td>
                    <td>{nb(f.employes, 0)}</td>
                    <td className="petit">{f.registre || <span className="nd">n. d.</span>}</td>
                    <td><Lien url={f.source} texte="voir la source ↗" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="discret petit">Montants en millions, dans la devise indiquée. Ce sont des chiffres réels, tirés de la source de chaque ligne.</p>
        </>
      )}

      {estim.length > 0 && (
        <details className="repli" style={{ background: 'var(--carte-2)' }}>
          <summary>Estimations de taille (ce ne sont pas des données réelles)</summary>
          <div className="contenu">
            <p className="analyse" style={{ borderColor: 'var(--alerte)' }}>
              <b>{v.titre.replace(/^[^A-Za-zÀ-ÿ]+/, '')}</b><br />
              Quand on cache les vrais revenus pour tester la méthode, la vraie valeur tombe dans la fourchette {v.reussis} fois sur {v.total},
              avec un écart moyen d’environ {Math.round(v.ecartMoyen)} %. Ces fourchettes donnent seulement un ordre de grandeur et n’entrent pas dans le pointage.
            </p>
            <div className="defilement">
              <table className="donnees">
                <thead><tr><th>Entreprise</th><th>Revenus estimés (M$ US)</th><th>BAIIA (M$ US)</th><th>Méthode</th><th>Confiance</th><th>Basé sur</th></tr></thead>
                <tbody>
                  {estim.map((e) => (
                    <tr key={e.cible}>
                      <td><b>{e.cible}</b></td><td>{e.revenus}</td><td>{e.baiia}</td>
                      <td className="petit">{e.methode}<br /><span className="discret">{e.type}</span></td>
                      <td className="petit">{e.confiance}</td><td className="discret petit">{e.baseSur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

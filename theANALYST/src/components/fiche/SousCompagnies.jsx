import { useState } from 'react';
import {
  DONNEES, choixEntreprises, estVide, estimations, fichesAvecRatios, lienChiffres, lienEdgar, statutChiffres, trouverFiche, verdict,
} from '../../lib/acquisitions.js';
import { fr } from '../../lib/format.js';
import { formaterMillions, harmoniserPrix, texteprix } from '../../lib/prixAchat.js';
import config from '../../config/config.json';
import { basesHec, etiquetteChoix, registrePays } from '../../lib/bases.js';
import { RECETTE_ORBIS, SOURCE_ORBIS, estEstimation, resumeOrbis, transactionsOrbis, typeFr } from '../../lib/orbis.js';
import { ACCES_COMPTE, DATE_EXPORT, ligneCiq, recetteCiq, mentionSource, nomPaysCode, resumeCiq, texteExercices, vientDeCiq } from '../../lib/capitalIQ.js';

/**
 * Sous-compagnies : reprend toutes les fonctions de l'outil « Sous le capot des consolidateurs » pour un titre.
 *   1. entreprises achetées (rapports officiels de l'acquéreur) ;
 *   2. vrais chiffres des entreprises achetées, avec leurs ratios et leurs sources ;
 *   3. où trouver les états financiers officiels d'une entreprise choisie (EDGAR, registre du pays, ou rien) ;
 *   4. estimations de taille, à part et identifiées comme non réelles, avec leurs méthodes ;
 *   5. test de fiabilité de ces estimations.
 */

/** Statut d'une entreprise achetée, avec des renvois adaptés à cette section. */
const statut = (fiche) => statutChiffres(fiche);
/** Pastille de statut (couleur au lieu d'un emoji). */
const classeStatut = (texte) => (texte.startsWith('Oui') ? 'ok' : texte.startsWith('Non') ? 'non' : '');
/** Montant d'une fiche (en millions dans sa devise), au format commun. */
const montant = (x, devise) => (estVide(x) ? nd : formaterMillions(x, devise));
const nd = <span className="nd">n. d.</span>;
const nb = (x, decimales = 1, suffixe = '') => (estVide(x) ? nd : `${fr(x, decimales)}${suffixe}`);

function Lien({ url, texte = 'Ouvrir ↗' }) {
  if (!url || !String(url).startsWith('http')) return nd;
  return <a href={url} target="_blank" rel="noreferrer">{texte}</a>;
}

/** Prix payé, au format commun, avec une mention quand l'unité est déduite ou le montant à vérifier. */
function PrixPaye({ achat, devise, unite }) {
  const prix = harmoniserPrix(achat, devise, unite);
  if (!prix) return <td>{nd}</td>;
  return (
    <td style={{ whiteSpace: 'nowrap' }} title={`Valeur écrite dans les données : ${achat.montant}`}>
      <b>{texteprix(prix)}</b>
      {prix.note && <div className={`petit ${prix.note.startsWith('à vérifier') ? '' : 'discret'}`} style={{ whiteSpace: 'normal', maxWidth: 230, color: prix.note.startsWith('à vérifier') ? 'var(--alerte)' : undefined }}>{prix.note}</div>}
    </td>
  );
}

/** Petite mention à côté d'un chiffre ajouté depuis S&P Capital IQ. */
function MarqueCiq({ fiche, champ }) {
  if (!vientDeCiq(fiche, champ)) return null;
  return <div className="discret petit" title={mentionSource(fiche.capital_iq.exercice)}>S&amp;P Capital IQ{fiche.capital_iq.exercice ? ` ${fiche.capital_iq.exercice}` : ''}</div>;
}

/** Vue d'ensemble S&P Capital IQ : filiales de l'acheteur, par groupe interne, avec les revenus connus. */
function VueCapitalIQ({ ticker }) {
  const r = resumeCiq(ticker);
  if (!r) return null;
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <h3 className="lime">Filiales de l’acheteur (S&amp;P Capital IQ)</h3>
      <div className="chiffres-cles" style={{ marginBottom: '0.6rem' }}>
        <div className="chiffre"><span className="etiquette">Filiales recensées</span><b>{fr(r.filiales, 0)}</b></div>
        <div className="chiffre"><span className="etiquette">Avec des revenus depuis 2022</span><b className="accent">{fr(r.avecRevenusRecents, 0)}</b></div>
        <div className="chiffre"><span className="etiquette">Revenus connus (M$ US)</span><b>{r.revenusConnus ? fr(r.revenusConnus, 0) : nd}</b></div>
        <div className="chiffre"><span className="etiquette">Principaux pays</span><b style={{ fontSize: '0.95rem' }}>{r.pays.slice(0, 3).map(nomPaysCode).join(', ')}</b></div>
      </div>
      <details className="repli" style={{ marginTop: 0 }}>
        <summary>{`Voir les filiales par groupe interne (${r.groupes.length} groupes)`}</summary>
        <div className="contenu defilement">
        <table className="donnees">
          <thead><tr><th>Groupe interne</th><th>Filiales</th><th>Avec revenus</th><th>Revenus connus (M$ US)</th><th>Exercices</th><th>Principaux pays</th></tr></thead>
          <tbody>
            {r.groupes.map((g) => (
              <tr key={g.nom}>
                <td><b>{g.nom}</b></td><td>{fr(g.filiales, 0)}</td><td>{fr(g.avecRevenus, 0)}</td>
                <td>{g.revenusConnus ? fr(g.revenusConnus, 1) : nd}</td>
                <td className="petit">{texteExercices(g.exercices) || nd}</td>
                <td className="petit">{g.pays.map(nomPaysCode).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </details>
      <p className="discret petit">Source : S&amp;P Capital IQ, export du {DATE_EXPORT} ({ACCES_COMPTE} ; pas de lien public, d’où l’absence de bouton « Ouvrir »). Filiales dont la société mère ultime est l’acheteur.
        Revenus en millions de $ US, exercices 2022 et suivants seulement, sans double compte (une filiale dont la société mère a déjà ses revenus n’est pas ajoutée).
        Les revenus connus ne couvrent qu’une partie de l’acheteur : la plupart des petites filiales privées ne publient rien.</p>
    </div>
  );
}

/** Prix payés et chiffres des entreprises achetées, trouvés dans Orbis M&A (repliés par défaut). */
function TransactionsOrbis({ ticker }) {
  const liste = transactionsOrbis(ticker);
  const r = resumeOrbis(ticker);
  if (!liste.length) return null;
  const m = (x, d = 1) => (estVide(x) ? nd : fr(x, d));
  return (
    <details className="repli">
      <summary>{`Prix payés et chiffres trouvés dans Orbis M&A (${r.total} transactions, dont ${r.avecPrix} avec un prix)`}</summary>
      <div className="contenu">
        <div className="defilement">
          <table className="donnees">
            <thead><tr><th>Conclue le</th><th>Entreprise achetée</th><th>Type</th><th>Prix payé (M$ US)</th><th>Revenus (M$ US)</th><th>BAIIA (M$ US)</th>
              <th>Exercice et comptes</th><th>Prix ÷ revenus</th><th>Prix ÷ BAIIA</th></tr></thead>
            <tbody>
              {liste.map((t) => (
                <tr key={`${t.cible}-${t.date}`}>
                  <td style={{ whiteSpace: 'nowrap' }}>{t.date || nd}</td>
                  <td><b>{t.cible}</b>{t.pays && <span className="discret petit"> ({nomPaysCode(t.pays)})</span>}</td>
                  <td className="petit">{typeFr(t.type) || nd}</td>
                  <td><b>{m(t.valeur)}</b></td>
                  <td>{m(t.revenus)}</td><td>{m(t.baiia)}</td>
                  <td className="petit">{t.exercice ? <>{t.exercice}, {t.base}{t.origine ? ` (${t.origine})` : ''}</> : nd}
                    {estEstimation(t) && <div style={{ color: 'var(--alerte)' }}>Estimation, à confirmer</div>}</td>
                  <td>{t.prixSurRevenus ? `${fr(t.prixSurRevenus, 2)}x` : nd}</td><td>{t.prixSurBaiia ? `${fr(t.prixSurBaiia, 1)}x` : nd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="discret petit">Source : {SOURCE_ORBIS.base}, {SOURCE_ORBIS.periode}, export du {SOURCE_ORBIS.date} ({ACCES_COMPTE}).
          Chiffres de l’entreprise achetée : dernier exercice disponible avant la transaction, seulement s’il date de 2022 ou après.
          « Données limitées » : estimation d’un fournisseur de données (ex. Cortera), pas des comptes publiés. Les multiples ne sont calculés que pour un rachat complet,
          avec des comptes publiés d’au plus 2 ans avant la transaction. Ces chiffres sont affichés à part : ils ne changent pas les estimations ni le test de fiabilité.</p>
      </div>
    </details>
  );
}

/** Bouton qui copie le nom de l'entreprise (à coller dans une base qui demande une connexion). */
function CopierNom({ nom }) {
  const [copie, setCopie] = useState(false);
  const copier = () => {
    navigator.clipboard?.writeText(nom).then(() => { setCopie(true); setTimeout(() => setCopie(false), 2000); }).catch(() => {});
  };
  return <button type="button" className="bouton" onClick={copier}>{copie ? 'Nom copié' : `Copier « ${nom} »`}</button>;
}

/** Pastille gratuit / payant / compte HEC. */
const pastilleAcces = (acces) => (
  <span className={`pastille ${acces === 'gratuit' ? 'ok' : ''}`}>{acces === 'gratuit' ? 'Gratuit' : acces === 'payant' ? 'Payant' : 'Compte HEC'}</span>
);

/** Autres bases : registre du pays de l'entreprise, puis bases accessibles avec un compte HEC. */
function AutresBases({ nom }) {
  const registre = registrePays(nom);
  const hec = basesHec(nom);
  return (
    <div style={{ marginTop: '1rem' }}>
      <h4 style={{ margin: '0 0 0.4rem' }}>Autres bases de données pour cette entreprise</h4>
      <div className="defilement">
        <table className="donnees">
          <thead><tr><th>Base</th><th>Accès</th><th>Ce qu’on y trouve</th><th>Ouvrir</th></tr></thead>
          <tbody>
            {registre ? (
              <tr>
                <td><b>{registre.nom}</b><br /><span className="discret petit">Registre officiel : {registre.pays}</span></td>
                <td>{pastilleAcces(registre.acces)}</td>
                <td className="petit">{registre.contenu}{registre.note && <><br /><span style={{ color: 'var(--alerte)' }}>{registre.note}</span></>}</td>
                <td>{registre.url ? <Lien url={registre.url} /> : nd}</td>
              </tr>
            ) : (
              <tr>
                <td><b>Registre du pays</b></td><td>{nd}</td>
                <td className="petit discret">Pays de cette entreprise inconnu dans nos données : le site ne devine pas. Les bases HEC ci-dessous cherchent dans tous les pays.</td>
                <td>{nd}</td>
              </tr>
            )}
            {hec.map((b) => (
              <tr key={b.nom}>
                <td><b>{b.nom}</b><br /><span className="discret petit">{b.pourQui}</span></td>
                <td>{pastilleAcces('hec')}</td>
                <td className="petit">{b.contenu}<br /><span className="discret">{b.connexion}</span></td>
                <td><Lien url={b.url} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="discret petit" style={{ marginTop: '0.4rem' }}>Les bases HEC demandent une connexion : le site ne peut pas y lire les chiffres tout seul.
        Ouvre la base, puis colle le nom de l’entreprise dans sa recherche.</p>
      <CopierNom nom={hec[0].aChercher} />
    </div>
  );
}

/** 3. Où trouver les états financiers officiels de l'entreprise choisie. */
function EtatsOfficiels({ ticker }) {
  const choix = choixEntreprises(ticker);
  const [nom, setNom] = useState(choix[0]?.nom || '');
  if (!choix.length) return <p className="discret">Aucune entreprise achetée nommée pour ce titre.</p>;
  const fiche = trouverFiche(nom);
  const registre = DONNEES.REGISTRES[nom];

  return (
    <div>
      <details className="repli" style={{ marginTop: 0 }}>
        <summary>C’est quoi EDGAR ?</summary>
        <div className="contenu petit">
          <b>EDGAR</b> est la base de données publique et gratuite de la SEC, l’autorité des marchés américains. Toute entreprise cotée aux
          États-Unis doit y déposer ses états financiers. Si une entreprise achetée était cotée aux États-Unis avant son rachat, ses vrais
          chiffres s’y trouvent. Pour les autres, on passe par le registre officiel de leur pays (Royaume-Uni, Belgique…) quand il existe.
        </div>
      </details>
      <label className="petit discret" htmlFor={`choix-${ticker}`} style={{ display: 'block', margin: '0.8rem 0 0.3rem' }}>Choisir l’entreprise achetée</label>
      <select id={`choix-${ticker}`} value={nom} onChange={(e) => setNom(e.target.value)} style={{ maxWidth: 620 }}>
        {choix.map((c) => <option key={c.nom} value={c.nom}>{etiquetteChoix(c)}</option>)}
      </select>
      {!choix.some((c) => c.type === 'edgar') && (
        <p className="discret petit" style={{ marginTop: '0.4rem' }}>Aucune entreprise achetée par ce titre n’était cotée aux États-Unis : EDGAR ne s’applique pas ici.</p>
      )}
      <div className="carte vedette" style={{ marginTop: '0.8rem' }}>
        <div className="etiquette">Entreprise achetée choisie</div>
        <h3 style={{ margin: '0.2rem 0 0.6rem', fontSize: '1.3rem' }}>{nom}</h3>
        {fiche?.cik ? (
          <>
            <p className="accent">Cette entreprise était cotée aux États-Unis : ses rapports annuels officiels (10-K) sont dans EDGAR.</p>
            <a className="bouton plein" href={lienEdgar(fiche.cik)} target="_blank" rel="noreferrer">Ouvrir ses rapports annuels dans EDGAR ↗</a>
          </>
        ) : registre ? (
          <>
            <p className="accent">Pas dans EDGAR, mais ses comptes sont au registre officiel : <b>{registre[0]}</b></p>
            <a className="bouton plein" href={registre[1]} target="_blank" rel="noreferrer">Ouvrir ses comptes officiels ({registre[0]}) ↗</a>
          </>
        ) : (
          <p className="lime">Pas dans EDGAR et aucun lien direct vers ses comptes. Le site affiche ce que l’acquéreur a publié et, si possible,
            une estimation de taille. Les bases ci-dessous peuvent quand même avoir des chiffres.</p>
        )}
        <AutresBases nom={nom} />
      </div>
    </div>
  );
}

/** Méthodologie, repliée par défaut : d'où viennent les chiffres et comment refaire l'export Capital IQ. */
function Methodologie({ ticker }) {
  const r = recetteCiq(ticker);
  return (
    <details className="repli">
      <summary>Méthodologie</summary>
      <div className="contenu petit">
        <h4 style={{ margin: '0 0 0.4rem' }}>Règles suivies pour les chiffres</h4>
        <ul style={{ marginTop: 0 }}>
          <li>Chaque chiffre porte sa source et son année d’exercice. Un chiffre déjà sourcé n’est jamais remplacé par un autre, même quand deux sources diffèrent : la deuxième est affichée à côté.</li>
          <li>S&amp;P Capital IQ : colonnes « S&amp;P Global Universal » (SP_) en priorité, colonnes « Capital IQ Fundamentals » (IQ_) seulement si SP_ manque. Exercices antérieurs à 2022 écartés.</li>
          <li>Revenus par groupe : sans double compte. Une filiale dont la société mère a déjà ses revenus n’est pas ajoutée.</li>
          <li>Licence HEC Montréal : seulement des totaux et des chiffres clés dans le site, jamais les tableaux complets ni les fichiers d’export.</li>
          <li>Taux de change : {DONNEES.TAUX_SOURCE?.texte || 'approximatifs'}</li>
        </ul>
        {r && (
          <>
            <h4 style={{ margin: '0.8rem 0 0.4rem' }}>Refaire l’export S&amp;P Capital IQ de ce titre</h4>
            <p className="discret" style={{ marginTop: 0 }}>Les fichiers d’export ne peuvent pas être partagés ({ACCES_COMPTE}). Avec un compte, cette recette redonne les mêmes chiffres.</p>
            <table className="donnees">
              <tbody>
                <tr><th>Outil</th><td>{r.outil}</td></tr>
                <tr><th>Critère</th><td>{r.critere}</td></tr>
                <tr><th>Colonnes</th><td><code>{r.colonnes.join(', ')}</code></td></tr>
                <tr><th>Réglages</th><td>{r.parametres}</td></tr>
                <tr><th>Date de l’export</th><td>{r.date}</td></tr>
                <tr><th>Résultat attendu</th><td>{r.resultat}</td></tr>
              </tbody>
            </table>
          </>
        )}
        {transactionsOrbis(ticker).length > 0 && (
          <>
            <h4 style={{ margin: '0.8rem 0 0.4rem' }}>Refaire l’export Orbis M&amp;A</h4>
            <table className="donnees">
              <tbody>
                <tr><th>Outil</th><td>{RECETTE_ORBIS.outil}</td></tr>
                <tr><th>Critères</th><td>{RECETTE_ORBIS.criteres}</td></tr>
                <tr><th>Colonnes</th><td>{RECETTE_ORBIS.colonnes}</td></tr>
                <tr><th>Date de l’export</th><td>{RECETTE_ORBIS.date}</td></tr>
                <tr><th>Résultat attendu</th><td>{`${resumeOrbis(ticker).total} transactions chiffrées pour ce titre (77 conclues pour les 5 acheteurs)`}</td></tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </details>
  );
}

/** Nombre d'achats montres avant le bouton « Voir tous les achats ». */
const NB_VISIBLES = 5;

export default function SousCompagnies({ ticker, devise = 'CAD' }) {
  const [tousLesAchats, setTousLesAchats] = useState(false);
  const achats = DONNEES.LISTES[ticker] || [];
  const achatsAffiches = tousLesAchats ? achats : achats.slice(0, NB_VISIBLES);
  const fiches = fichesAvecRatios(ticker);
  const estim = estimations(ticker);
  const v = verdict();
  const unite = config.unites_etats_financiers?.[ticker] || 'millions';
  if (!achats.length && !fiches.length) return <p className="discret">Aucune entreprise achetée recensée pour ce titre.</p>;

  const reels = fiches.filter((f) => !estVide(f.revenus)).length;
  const impossibles = estim.filter((e) => e.revenus === 'impossible').length;

  return (
    <div>
      <div className="chiffres-cles" style={{ marginBottom: '1rem' }}>
        <div className="chiffre"><span className="etiquette">Achats recensés</span><b>{achats.length}</b></div>
        <div className="chiffre"><span className="etiquette">Avec de vrais chiffres</span><b className="accent">{reels}</b></div>
        <div className="chiffre"><span className="etiquette">Taille seulement estimée</span><b className="lime">{estim.length - impossibles}</b></div>
        <div className="chiffre"><span className="etiquette">Impossibles à estimer</span><b>{impossibles}</b></div>
      </div>

      <VueCapitalIQ ticker={ticker} />

      {/* 1. Entreprises achetées */}
      <h3 className="lime">{achats.length > NB_VISIBLES && !tousLesAchats ? `Les ${NB_VISIBLES} achats les plus récents` : 'Entreprises achetées'}</h3>
      <div className="defilement">
        <table className="donnees">
          <thead><tr><th>Date</th><th>Entreprise achetée</th><th>Prix payé</th><th>États financiers ?</th><th>Comptes</th><th>Description (rapport officiel)</th></tr></thead>
          <tbody>
            {achatsAffiches.map((l, i) => (
              <tr key={`${i}-${l.date}`}>
                <td style={{ whiteSpace: 'nowrap' }}>{l.date || nd}</td>
                <td><b>{l.cible || nd}</b></td>
                <PrixPaye achat={l} devise={devise} unite={unite} />
                <td className="petit"><span className={`pastille ${classeStatut(statut(l.fiche))}`}>{statut(l.fiche)}</span></td>
                <td><Lien url={lienChiffres(l.fiche)} /></td>
                <td className="discret petit">{l.resume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {achats.length > NB_VISIBLES && (
        <button type="button" className="bouton" style={{ marginTop: '0.6rem' }} onClick={() => setTousLesAchats((x) => !x)}>
          {tousLesAchats ? 'Voir seulement les plus récents' : `Voir tous les achats (${achats.length})`}
        </button>
      )}
      <p className="discret petit">Prix payés en millions, dans la devise indiquée, tels qu’écrits dans les dépôts de l’acquéreur et ramenés au même format. Une mention sous le prix signale une unité déduite ou un montant à vérifier. Source : dépôts officiels (fichiers JSON OneSheet), descriptions en anglais.</p>
      {resumeOrbis(ticker).total > 0 && (
        <p className="petit">
          <b>Orbis M&amp;A :</b> {resumeOrbis(ticker).total} transactions conclues, dont {resumeOrbis(ticker).avecPrix} avec un prix payé.{' '}
          <span className="discret">Source : {SOURCE_ORBIS.base}, {SOURCE_ORBIS.periode}, export du {SOURCE_ORBIS.date} ({ACCES_COMPTE}). Le tableau est dans le détail ci-dessous.</span>
        </p>
      )}

      <details className="repli">
        <summary>Voir le détail : Orbis M&amp;A, chiffres des entreprises achetées, états financiers, estimations et méthodologie</summary>
        <div className="contenu">
      <TransactionsOrbis ticker={ticker} />

      {/* 2. Vrais chiffres */}
      {fiches.length > 0 && (
        <>
          <h3 className="lime" style={{ marginTop: '1.2rem' }}>Chiffres des entreprises achetées</h3>
          <div className="defilement">
            <table className="donnees">
              <thead>
                <tr><th>Entreprise</th><th>Devise</th><th>Prix payé</th><th>Revenus</th><th>BAIIA</th><th>Résultat d’exploitation</th><th>Bénéfice net</th>
                  <th>Exercice</th><th>Prix ÷ revenus</th><th>Prix ÷ BAIIA</th><th>Marge BAIIA</th><th>Marge d’exploitation</th><th>Marge nette</th>
                  <th>Employés</th><th>Prix par employé (milliers)</th><th>Où trouver les comptes</th><th>Source</th></tr>
              </thead>
              <tbody>
                {fiches.map((f) => (
                  <tr key={f.cible}>
                    <td style={{ minWidth: 220 }}><b>{f.cible}</b>{f.note && <><br /><span className="discret petit">{f.note}</span></>}
                      {ligneCiq(f) && <><br /><span className="petit accent">{ligneCiq(f)}</span></>}</td>
                    <td>{f.devise}</td><td>{montant(f.prix, f.devise)}</td>
                    <td>{montant(f.revenus, f.devise)}<MarqueCiq fiche={f} champ="revenus" /></td>
                    <td>{montant(f.baiia, f.devise)}<MarqueCiq fiche={f} champ="baiia" /></td>
                    <td>{montant(f.resultat_exploitation, f.devise)}</td>
                    <td>{montant(f.resultat_net, f.devise)}<MarqueCiq fiche={f} champ="resultat_net" /></td>
                    <td className="petit">{f.exercice || nd}</td>
                    <td>{nb(f.prixSurRevenus, 2, 'x')}</td><td>{nb(f.prixSurBaiia, 1, 'x')}</td>
                    <td>{nb(f.margeBaiia, 1, ' %')}</td><td>{nb(f.margeExploitation, 1, ' %')}</td><td>{nb(f.margeNette, 1, ' %')}</td>
                    <td>{nb(f.employes, 0)}<MarqueCiq fiche={f} champ="employes" /></td><td>{nb(f.prixParEmploye, 0)}</td>
                    <td className="petit">{f.registre || nd}</td>
                    <td>{String(f.source).startsWith('http') ? <Lien url={f.source} texte="voir la source ↗" /> : <span className="discret petit">{f.source}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="discret petit">Montants en millions, dans la devise de chaque ligne. Ce sont des chiffres réels, tirés de la source de chaque ligne.
            La mention « S&amp;P Capital IQ » sous un chiffre veut dire qu’il manquait dans la source d’origine et vient de Capital IQ ({ACCES_COMPTE}).
            La ligne en couleur sous le nom donne les chiffres Capital IQ de l’entité, avec son exercice : on ne remplace jamais un chiffre déjà sourcé, même quand les deux diffèrent.</p>
        </>
      )}

      {/* 3. États financiers officiels */}
      <h3 className="lime" style={{ marginTop: '1.2rem' }}>Aller chercher les états financiers officiels</h3>
      <EtatsOfficiels key={ticker} ticker={ticker} />

      {/* 4 et 5. Estimations, méthodes et test de fiabilité */}
      <details className="repli" style={{ background: 'var(--carte-2)' }}>
        <summary>Estimations de taille (ce ne sont pas des données réelles)</summary>
        <div className="contenu">
          <p className="discret petit">Fourchettes calculées à partir des vraies fiches d’entreprises comparables, en millions de $ US (taux de change : {DONNEES.TAUX_SOURCE ? <a href={DONNEES.TAUX_SOURCE.url} target="_blank" rel="noreferrer">moyennes annuelles 2025 de la Banque du Canada</a> : 'approximatifs'}).
            Seules les entreprises achetées sans aucun revenu réel sont estimées ; les centaines de petites acquisitions sans nom ne peuvent pas l’être une par une.
            Elles n’entrent pas dans le pointage.</p>
          {estim.length ? (
            <div className="defilement">
              <table className="donnees">
                <thead><tr><th>Entreprise</th><th>Revenus estimés (M$ US)</th><th>BAIIA (M$ US)</th><th>Méthode</th><th>Confiance</th><th>Basé sur</th></tr></thead>
                <tbody>
                  {estim.map((e) => (
                    <tr key={e.cible}>
                      <td><b>{e.cible}</b></td><td className={e.revenus === 'impossible' ? 'nd' : ''}>{e.revenus}</td><td>{e.baiia}</td>
                      <td className="petit">{e.methode}<br /><span className="discret">{e.type}</span></td>
                      <td className="petit">{e.confiance}</td><td className="discret petit">{e.baseSur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="accent">Toutes les entreprises achetées de ce titre ont des revenus réels : aucune estimation n’est nécessaire.</p>}

          <h3 className="lime" style={{ marginTop: '1rem' }}>Les méthodes d’estimation</h3>
          {Object.values(DONNEES.METHODES).map((m) => (
            <p key={m.nom} className="petit"><b>{m.nom}</b> <span className="pastille">{m.type}</span><br />{m.explication}</p>
          ))}
          <p className="discret petit">« Méthode maison » : créée pour ce projet, peu répandue. « Méthode courante » : utilisée habituellement par les analystes.</p>

          <h3 className="lime" style={{ marginTop: '1rem' }}>Test de fiabilité : nos estimations contre la réalité</h3>
          <p className="discret petit">Pour chaque firme dont on connaît les vrais revenus, on les cache, on les estime avec la même méthode, puis on compare.</p>
          <div className={`verdict-acq ${v.niveau}`}>
            <b>{v.titre}</b>
            <div>{`La vraie valeur tombe dans la fourchette ${v.reussis} fois sur ${v.total} (${Math.round(v.taux * 100)} %), avec un écart moyen d’environ ${Math.round(v.ecartMoyen)} %.`}</div>
            <div className="petit">{`Méthode courante : ${v.okCourante} sur ${v.nCourante} · méthode maison : ${v.okMaison} sur ${v.nMaison}`}</div>
          </div>
          <ul className="petit">
            <li>Ces estimations donnent seulement un ordre de grandeur (petite, moyenne ou grosse entreprise).</li>
            <li>Ne jamais s’en servir pour décider d’investir ou pour calculer une valorisation : seuls les vrais chiffres servent à ça.</li>
            <li>Plus on ajoutera de vraies fiches, meilleures seront les estimations.</li>
          </ul>
          <div className="defilement">
            <table className="donnees">
              <thead><tr><th>Entreprise</th><th>Revenus réels (M$ US)</th><th>Estimé (M$ US)</th><th>Dans la fourchette ?</th><th>Écart (milieu vs réel)</th><th>Méthode</th></tr></thead>
              <tbody>
                {v.lignes.map((l) => (
                  <tr key={l.cible}>
                    <td><b>{l.cible}</b></td><td>{fr(l.reel, 0)}</td><td>{l.estime}</td>
                    <td><span className={`pastille ${l.dansFourchette ? 'ok' : 'non'}`}>{l.dansFourchette ? 'oui' : 'non'}</span></td>
                    <td>{l.ecart}</td><td className="petit">{l.methode}<br /><span className="discret">{l.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="discret petit">Le test porte sur toutes les entreprises achetées par les cinq titres, pas seulement celles de ce titre.</p>
        </div>
      </details>

      <Methodologie ticker={ticker} />
        </div>
      </details>
    </div>
  );
}

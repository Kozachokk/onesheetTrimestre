import { useState } from 'react';
import {
  DONNEES, choixEntreprises, estVide, estimations, fichesAvecRatios, lienChiffres, lienEdgar, statutChiffres, trouverFiche, verdict,
} from '../../lib/acquisitions.js';
import { fr } from '../../lib/format.js';
import { formaterMillions, harmoniserPrix, texteprix } from '../../lib/prixAchat.js';
import config from '../../config/config.json';

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
        {choix.map((c) => <option key={c.nom} value={c.nom}>{c.etiquette}</option>)}
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
          <p className="lime">Aucune base de données publique pour cette entreprise (privée, elle ne publie pas ses comptes). Le site affiche seulement
            ce que l’acquéreur a publié et, si possible, une estimation de taille.</p>
        )}
      </div>
    </div>
  );
}

export default function SousCompagnies({ ticker, devise = 'CAD' }) {
  const achats = DONNEES.LISTES[ticker] || [];
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

      {/* 1. Entreprises achetées */}
      <h3 className="lime">Entreprises achetées</h3>
      <div className="defilement">
        <table className="donnees">
          <thead><tr><th>Date</th><th>Entreprise achetée</th><th>Prix payé</th><th>États financiers ?</th><th>Comptes</th><th>Description (rapport officiel)</th></tr></thead>
          <tbody>
            {achats.map((l, i) => (
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
      <p className="discret petit">Prix payés en millions, dans la devise indiquée, tels qu’écrits dans les dépôts de l’acquéreur et ramenés au même format. Une mention sous le prix signale une unité déduite ou un montant à vérifier. Source : dépôts officiels (fichiers JSON OneSheet), descriptions en anglais.</p>

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
                    <td style={{ minWidth: 220 }}><b>{f.cible}</b>{f.note && <><br /><span className="discret petit">{f.note}</span></>}</td>
                    <td>{f.devise}</td><td>{montant(f.prix, f.devise)}</td><td>{montant(f.revenus, f.devise)}</td><td>{montant(f.baiia, f.devise)}</td><td>{montant(f.resultat_exploitation, f.devise)}</td><td>{montant(f.resultat_net, f.devise)}</td>
                    <td className="petit">{f.exercice || nd}</td>
                    <td>{nb(f.prixSurRevenus, 2, 'x')}</td><td>{nb(f.prixSurBaiia, 1, 'x')}</td>
                    <td>{nb(f.margeBaiia, 1, ' %')}</td><td>{nb(f.margeExploitation, 1, ' %')}</td><td>{nb(f.margeNette, 1, ' %')}</td>
                    <td>{nb(f.employes, 0)}</td><td>{nb(f.prixParEmploye, 0)}</td>
                    <td className="petit">{f.registre || nd}</td>
                    <td>{String(f.source).startsWith('http') ? <Lien url={f.source} texte="voir la source ↗" /> : <span className="discret petit">{f.source}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="discret petit">Montants en millions, dans la devise de chaque ligne. Ce sont des chiffres réels, tirés de la source de chaque ligne.</p>
        </>
      )}

      {/* 3. États financiers officiels */}
      <h3 className="lime" style={{ marginTop: '1.2rem' }}>Aller chercher les états financiers officiels</h3>
      <EtatsOfficiels key={ticker} ticker={ticker} />

      {/* 4 et 5. Estimations, méthodes et test de fiabilité */}
      <details className="repli" style={{ background: 'var(--carte-2)' }}>
        <summary>Estimations de taille (ce ne sont pas des données réelles)</summary>
        <div className="contenu">
          <p className="discret petit">Fourchettes calculées à partir des vraies fiches d’entreprises comparables, en millions de $ US (taux de change approximatifs).
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
    </div>
  );
}

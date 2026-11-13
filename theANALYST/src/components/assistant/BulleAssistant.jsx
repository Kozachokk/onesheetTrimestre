import { useEffect, useRef, useState } from 'react';
import { useProfil } from '../../etat/ProfilContext.jsx';
import { lireReglages } from '../../etat/reglagesAssistant.js';
import { CRITERES } from '../../lib/pointage.js';
import { CONSIGNE_ENTREPRISE, CONSIGNE_PROFIL, FOURNISSEURS, demanderIA, extraireJson } from '../../lib/assistant/fournisseurs.js';
import { REFUS_CONSEIL, contexteEntreprise, profilDepuisTexte, repondreEntreprise } from '../../lib/assistant/motsCles.js';
import { ajusterSelonPortefeuille, resumePourIA } from '../../lib/csvCourtier.js';
import ReglagesAssistant from './ReglagesAssistant.jsx';
import ImportCsv from './ImportCsv.jsx';
import '../../styles/assistant.css';

// Exemples cliquables : ils permettent une démonstration complète sans clé d'IA
const SUGGESTIONS = {
  profil: ['Retraite dans 25 ans, prudent, je veux des dividendes', 'Jeune, long terme, j’accepte le risque pour la croissance', 'Achat d’une maison dans 3 ans, peu de risque'],
  entreprise: ['Quelle est la dette ?', 'Quelles sont ses dernières acquisitions ?', 'Forces et faiblesses ?', 'Y a-t-il des litiges ?'],
  general: ['Qui est en tête ?', 'Comment le pointage est-il calculé ?', 'Dette de WSP ?'],
};
const PAUSE_DEMO = 650; // petite attente en mode démo, pour que la réponse ne paraisse pas instantanée

const INVITE_CSV = 'Importe le CSV de ton CELI, CELIAPP, REER ou REEE pour que je tienne compte de ce que tu détiens déjà.';

/** Assistant en bulle flottante, visible sur toutes les pages. Son texte et son rôle changent selon la page. */
export default function BulleAssistant({ page, ticker }) {
  const profil = useProfil();
  const { entreprises, parTicker, rangs, resultats, premier, dirigeants, poids, appliquerPoids, setPortefeuille } = profil;
  const [ouvert, setOuvert] = useState(false);
  const [reglages, setReglages] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [occupe, setOccupe] = useState(false);
  const fin = useRef(null);
  const contexte = page === 'profil' ? 'profil' : page === 'entreprise' && entreprises?.[ticker] ? 'entreprise' : 'general';
  const etiquette = contexte === 'profil' ? 'Améliorer mon profil' : contexte === 'entreprise' ? '?' : 'Une question ?';
  // Message d'accueil propre à chaque page (le composant est recréé quand la page change : voir `key` dans App.jsx)
  const [messages, setMessages] = useState(() => [{ de: 'assistant', texte: contexte === 'profil'
    ? 'Décris-toi en quelques mots : ton horizon, ta tolérance au risque, tes objectifs, ce qui t’intéresse. Je règle les curseurs pour toi.'
    : contexte === 'entreprise' ? `Pose-moi une question sur ${entreprises[ticker].nom}. Je réponds uniquement à partir des données du site.`
      : 'Pose-moi une question sur le classement, un titre ou la méthode.' }]);

  useEffect(() => { const fil = fin.current?.parentElement; if (fil) fil.scrollTop = fil.scrollHeight; }, [messages, ouvert, occupe]);

  const dire = (texte, extra = {}) => setMessages((m) => [...m, { de: 'assistant', texte, ...extra }]);

  /** Appelle l'IA si une clé est enregistrée ; sinon, ou en cas d'échec, utilise la réponse par mots-clés. */
  async function avecIA(systeme, message, secours) {
    const r = lireReglages();
    if (!r.cle) {
      await new Promise((suite) => { setTimeout(suite, PAUSE_DEMO); });
      return { texte: null, secours: secours() };
    }
    try {
      return { texte: await demanderIA({ ...r, systeme, message }) };
    } catch (erreur) {
      return { texte: null, secours: secours(), erreur: `${erreur.message} Je réponds donc par mots-clés.` };
    }
  }

  async function reglerProfil(texte) {
    const { texte: reponse, secours, erreur } = await avecIA(CONSIGNE_PROFIL(CRITERES), texte, () => profilDepuisTexte(texte));
    const resultat = reponse ? extraireJson(reponse) : secours;
    if (erreur) dire(erreur);
    if (!resultat?.poids) { dire(resultat?.explication || 'Je n’ai pas réussi à traduire ta description. Reformule-la en parlant d’horizon, de risque et d’objectifs.'); return; }
    appliquerPoids(Object.fromEntries(CRITERES.map((c) => [c.id, Number(resultat.poids[c.id]) || 0])));
    dire(`C’est réglé. ${resultat.explication || ''}`);
    dire(INVITE_CSV, { csv: true });
  }

  async function ajusterAvecPortefeuille(analyse) {
    setOccupe(true);
    setPortefeuille({ titres: analyse.titres.map((t) => ({ symbole: t.symbole, poids: t.poids })), comptes: analyse.comptes });
    const actuels = Object.fromEntries(CRITERES.map((c) => [c.id, poids[c.id] || 0]));
    const message = `${resumePourIA(analyse)}\nPoids actuels des critères : ${JSON.stringify(actuels)}.\nAjuste ces poids en tenant compte de ce portefeuille.`;
    const { texte: reponse, secours, erreur } = await avecIA(CONSIGNE_PROFIL(CRITERES), message, () => ajusterSelonPortefeuille(actuels, analyse));
    const resultat = reponse ? extraireJson(reponse) : secours;
    if (erreur) dire(erreur);
    if (resultat?.poids) {
      appliquerPoids(Object.fromEntries(CRITERES.map((c) => [c.id, Number(resultat.poids[c.id]) || 0])));
      dire(`J’ai tenu compte de ton portefeuille (${analyse.titres.length} titres). ${resultat.explication || ''}`);
    } else dire('Je n’ai pas réussi à ajuster ton profil à partir de ce portefeuille.');
    setOccupe(false);
  }

  function repondreGeneral(question) {
    const q = question.toLowerCase();
    if (/acheter|vendre|devrais|recommand|conseil|\bbuy\b|\bsell\b|should i|advice/.test(q)) return REFUS_CONSEIL;
    const cible = Object.values(entreprises).find((e) => q.includes(e.ticker.toLowerCase()) || q.includes(e.nom.toLowerCase().split(' ')[0]));
    if (cible) return repondreEntreprise(question, cible, parTicker[cible.ticker], dirigeants[cible.ticker], rangs[cible.ticker]);
    if (/premier|en tete|meilleur|classement|gagne|lead|first|\btop\b|best|ranking|win/.test(q.normalize('NFD').replace(/[̀-ͯ]/g, ''))) {
      return premier ? `Selon ton profil, ${premier.nom} est en tête avec ${Math.round(premier.score)} sur 100. Ce n’est pas une recommandation d’achat.` : 'Aucun titre n’est admissible avec ton profil actuel.';
    }
    if (/pointage|score|calcul|methode|note|method/.test(q)) return 'Chaque critère reçoit une note de 0 à 100 entre un seuil « mauvais » et un seuil « bon ». Le pointage est la moyenne de ces notes, pondérée par tes curseurs. La page Méthode détaille chaque ratio.';
    if (/profil|curseur|slider/.test(q)) return 'Ton profil se règle avec le bouton « Mon profil », en haut à droite : choisis un profil ou bouge les curseurs, et le classement suit partout.';
    return 'Je ne sais pas : cette information n’est pas dans les données du site. Nomme un titre (ex. « dette de WSP ») ou ouvre sa fiche.';
  }

  async function envoyer(evenement, direct) {
    evenement?.preventDefault();
    const texte = (direct ?? saisie).trim();
    if (!texte || occupe) return;
    setSaisie('');
    setMessages((m) => [...m, { de: 'moi', texte, exemple: direct !== undefined }]);
    setOccupe(true);
    if (contexte === 'profil') {
      await reglerProfil(texte);
    } else if (contexte === 'entreprise') {
      const e = entreprises[ticker];
      const r = parTicker[ticker];
      const secours = () => repondreEntreprise(texte, e, r, dirigeants[ticker], rangs[ticker]);
      const { texte: reponse, secours: s, erreur } = await avecIA(CONSIGNE_ENTREPRISE, `${contexteEntreprise(e, r, dirigeants[ticker])}\n\nQuestion : ${texte}`, secours);
      if (erreur) dire(erreur);
      dire(reponse || s);
    } else {
      const resume = resultats.map((r) => `${r.ticker} ${r.nom} : ${r.score === null ? 'n. d.' : Math.round(r.score)}${r.elimine ? ' (éliminé)' : ''}`).join(' ; ');
      const { texte: reponse, secours: s, erreur } = await avecIA(CONSIGNE_ENTREPRISE, `Classement selon le profil de l'utilisateur : ${resume}.\n\nQuestion : ${texte}`, () => repondreGeneral(texte));
      if (erreur) dire(erreur);
      dire(reponse || s);
    }
    setOccupe(false);
  }

  const r = lireReglages();
  return (
    <div className="assistant">
      {ouvert && (
        <div className="assistant-panneau" role="dialog" aria-label="Assistant">
          <div className="assistant-entete">
            <b>Assistant</b>
            {r.cle ? <span className="discret petit">{FOURNISSEURS[r.fournisseur].nom}</span> : <span className="assistant-demo" title="Réponses calculées à partir des données du site, sans IA">Mode démo · sans IA</span>}
            <span style={{ flex: 1 }} />
            <button type="button" className="lien-bouton petit" onClick={() => setReglages((x) => !x)}>Réglages</button>
            <button type="button" className="lien-bouton" onClick={() => setOuvert(false)} aria-label="Fermer">✕</button>
          </div>
          {reglages ? <ReglagesAssistant onFermer={() => setReglages(false)} /> : (
            <>
              <div className="assistant-fil">
                {messages.map((m, i) => (
                  <div key={`${i}-${m.de}`} className={`assistant-message de-${m.de}`} data-sans-traduction={m.de === 'moi' && !m.exemple ? '' : undefined}>
                    {m.texte}
                    {m.csv && <ImportCsv avecIA={Boolean(r.cle)} onAjuster={ajusterAvecPortefeuille} />}
                  </div>
                ))}
                {occupe && <div className="assistant-message de-assistant attente"><i /><i /><i /></div>}
                <div ref={fin} />
              </div>
              <div className="assistant-suggestions">
                {SUGGESTIONS[contexte].map((exemple) => (
                  <button key={exemple} type="button" disabled={occupe} onClick={() => envoyer(null, exemple)}>{exemple}</button>
                ))}
              </div>
              <form className="assistant-saisie" onSubmit={envoyer}>
                <input type="text" value={saisie} onChange={(e) => setSaisie(e.target.value)}
                  placeholder={contexte === 'profil' ? 'Ex. : long terme, prudent, je veux des dividendes' : 'Ta question'} />
                <button type="submit" className="bouton plein" disabled={occupe || !saisie.trim()}>Envoyer</button>
              </form>
            </>
          )}
        </div>
      )}
      <button type="button" className={`assistant-bulle ${etiquette === '?' ? 'ronde' : ''}`} onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
        {ouvert ? 'Fermer' : etiquette}
      </button>
    </div>
  );
}

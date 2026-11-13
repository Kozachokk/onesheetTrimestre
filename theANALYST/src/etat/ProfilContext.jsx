/**
 * ProfilContext.jsx : état partagé par tout le site.
 *
 * Le profil (poids des critères, filtres, seuils) vit ici. Dès qu'il change (clic sur un profil, curseur,
 * assistant, import CSV), le classement est recalculé et toutes les pages se mettent à jour.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import config from '../config/config.json';
import dirigeantsConfig from '../config/dirigeants.json';
import { chargerBase } from '../lib/donnees.js';
import { PROFILS, classer, gagnant, poidsDuProfil, rangs, seuilsDuProfil, simulationSolidite } from '../lib/pointage.js';
import { DEFINITIONS, seuilsParDefaut } from '../lib/ratios.js';

const CLE_STOCKAGE = 'theanalyst.profil.v1';
const Contexte = createContext(null);

function lireStockage() {
  try { return JSON.parse(localStorage.getItem(CLE_STOCKAGE)) || null; } catch { return null; }
}

export function FournisseurProfil({ children }) {
  const [sauvegarde] = useState(lireStockage);
  const [entreprises, setEntreprises] = useState(null);
  const [profilId, setProfilId] = useState(sauvegarde ? sauvegarde.profilId : PROFILS[0].id);
  const [poids, setPoids] = useState(sauvegarde?.poids ?? poidsDuProfil(PROFILS[0]));
  const [filtres, setFiltres] = useState(sauvegarde?.filtres ?? PROFILS[0].filtres);
  const [entre, setEntre] = useState(sauvegarde?.entre ?? false);
  const [portefeuille, setPortefeuille] = useState(null); // résumé du CSV importé (jamais sauvegardé)

  useEffect(() => { chargerBase(config.taux_change).then(setEntreprises); }, []);
  useEffect(() => {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ profilId, poids, filtres, entre })); } catch { /* stockage indisponible */ }
  }, [profilId, poids, filtres, entre]);

  const profil = PROFILS.find((p) => p.id === profilId) || null;
  const seuils = useMemo(() => {
    const base = seuilsParDefaut(config.taux_obligataire_10ans);
    return profil ? seuilsDuProfil(profil, base) : base;
  }, [profil]);

  const choisirProfil = useCallback((id) => {
    const p = PROFILS.find((x) => x.id === id);
    if (!p) return;
    setProfilId(id); setPoids(poidsDuProfil(p)); setFiltres(p.filtres || []);
  }, []);
  /** Change un seul curseur (le profil devient « ajusté »). */
  const reglerPoids = useCallback((id, valeur) => setPoids((avant) => ({ ...avant, [id]: Math.max(0, Number(valeur) || 0) })), []);
  /** Remplace plusieurs poids d'un coup (assistant, import CSV) ; les ratios non cités restent tels quels. */
  const appliquerPoids = useCallback((nouveaux) => setPoids((avant) => {
    const suite = { ...avant };
    Object.entries(nouveaux).forEach(([id, v]) => { if (id in suite) suite[id] = Math.max(0, Number(v) || 0); });
    return suite;
  }), []);
  const basculerFiltre = useCallback((f) => setFiltres((avant) => (avant.includes(f) ? avant.filter((x) => x !== f) : [...avant, f])), []);

  const calcul = useMemo(() => {
    if (!entreprises) return { resultats: [], parTicker: {}, rangs: {}, premier: null, solidite: null };
    const resultats = classer(entreprises, poids, seuils, filtres, config.filtres);
    return { resultats, parTicker: Object.fromEntries(resultats.map((r) => [r.ticker, r])), rangs: rangs(resultats), premier: gagnant(resultats),
      solidite: simulationSolidite(resultats, poids, config.nb_simulations, config.amplitude_simulation) };
  }, [entreprises, poids, seuils, filtres]);

  const total = DEFINITIONS.reduce((s, d) => s + (poids[d.id] || 0), 0);
  const ajuste = profil ? DEFINITIONS.some((d) => (poids[d.id] || 0) !== (profil.poids[d.id] || 0)) : true;

  const valeur = { config, entreprises, pret: entreprises !== null, dirigeants: dirigeantsConfig.dirigeants,
    profil, profilId, ajuste, poids, total, filtres, seuils, entre, portefeuille,
    choisirProfil, reglerPoids, appliquerPoids, basculerFiltre, setEntre, setPortefeuille, ...calcul };
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProfil = () => useContext(Contexte);

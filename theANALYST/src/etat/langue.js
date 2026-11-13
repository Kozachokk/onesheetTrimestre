/**
 * langue.js : langue d'affichage du site (français par défaut, anglais de démonstration).
 */
import { useEffect, useState } from 'react';
import { activerAnglais, desactiverAnglais } from '../lib/traduction/traducteurDom.js';

const CLE = 'theanalyst.langue.v1';

function lire() {
  try { return localStorage.getItem(CLE) === 'en' ? 'en' : 'fr'; } catch { return 'fr'; }
}

/** Renvoie [langue, basculer]. À utiliser une seule fois, dans la coquille du site. */
export function useLangue() {
  const [langue, setLangue] = useState(lire);
  useEffect(() => {
    if (langue === 'en') activerAnglais(); else desactiverAnglais();
    try { localStorage.setItem(CLE, langue); } catch { /* stockage indisponible */ }
    return () => desactiverAnglais();
  }, [langue]);
  return [langue, () => setLangue((l) => (l === 'en' ? 'fr' : 'en'))];
}

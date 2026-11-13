/**
 * navigation.js : petit routeur par ancre (#/profil, #/classement, #/entreprise/CSU, #/hall...), sans dépendance.
 */
import { useEffect, useState } from 'react';

function lire() {
  const [page = 'profil', parametre = ''] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { page: page || 'profil', parametre: decodeURIComponent(parametre) };
}

export function useRoute() {
  const [route, setRoute] = useState(lire);
  useEffect(() => {
    const maj = () => { setRoute(lire()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', maj);
    return () => window.removeEventListener('hashchange', maj);
  }, []);
  return route;
}

export function aller(page, parametre = '') {
  window.location.hash = `#/${page}${parametre ? `/${encodeURIComponent(parametre)}` : ''}`;
}

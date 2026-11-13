/** geometrie.js : mesures du personnage (viewBox 300 x 520) et calcul du bras tendu vers la main. */
export const GEOMETRIE = { largeur: 300, hauteur: 520, epauleD: { x: 196, y: 182 }, epauleG: { x: 104, y: 182 }, bras: 128 };
export const REPOS = Math.PI / 2; // bras le long du corps

/** Angle et extrémité du bras tendu vers la main. `proximite` va de 0 (loin) à 1 (tout près). */
export function brasVers(main, proximite) {
  const cote = main && main.x < GEOMETRIE.largeur / 2 ? 'G' : 'D';
  const epaule = cote === 'G' ? GEOMETRIE.epauleG : GEOMETRIE.epauleD;
  const cible = main ? Math.atan2(main.y - epaule.y, main.x - epaule.x) : REPOS;
  // Interpolation par le chemin le plus court entre le repos et la cible
  let ecart = cible - REPOS;
  while (ecart > Math.PI) ecart -= 2 * Math.PI;
  while (ecart < -Math.PI) ecart += 2 * Math.PI;
  const angle = REPOS + ecart * proximite;
  return { cote, epaule, angle, bout: { x: epaule.x + Math.cos(angle) * GEOMETRIE.bras, y: epaule.y + Math.sin(angle) * GEOMETRIE.bras } };
}

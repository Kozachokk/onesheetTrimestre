/**
 * Personnage.jsx : dirigeant illustré (aucune photo, aucune ressemblance recherchée), debout, vu de côté dans le hall.
 * Il suit la main des yeux, sourit et tend le bras quand elle s'approche.
 *
 * Repère local : viewBox 300 × 520, pieds en bas. `main` est la position de la main du visiteur dans ce repère (ou null).
 */
import { GEOMETRIE, REPOS, brasVers } from './geometrie.js';

function Bras({ epaule, angle, couleur, secoue }) {
  const degres = (angle * 180) / Math.PI - 90; // 0° = vers le bas
  return (
    <g transform={`rotate(${degres} ${epaule.x} ${epaule.y})`}>
      <g className={secoue ? 'secoue' : ''}>
        <rect x={epaule.x - 13} y={epaule.y - 6} width="26" height={GEOMETRIE.bras - 14} rx="13" fill={couleur} />
        <circle cx={epaule.x} cy={epaule.y + GEOMETRIE.bras - 6} r="15" fill="#e9c9a8" />
      </g>
    </g>
  );
}

export default function Personnage({ apparence, main, proximite, poignee }) {
  const { veston, cheveux, cravate } = apparence;
  const actif = brasVers(main, proximite);
  const regard = (ox, oy) => {
    if (!main) return { x: ox, y: oy };
    const a = Math.atan2(main.y - oy, main.x - ox);
    return { x: ox + Math.cos(a) * 3.2, y: oy + Math.sin(a) * 3.2 };
  };
  const [oeilG, oeilD] = [regard(137, 92), regard(163, 92)];
  const sourire = proximite > 0.25;

  return (
    <svg viewBox={`0 0 ${GEOMETRIE.largeur} ${GEOMETRIE.hauteur}`} width={GEOMETRIE.largeur} height={GEOMETRIE.hauteur} className="personnage" aria-hidden="true">
      <ellipse cx="150" cy="506" rx="92" ry="10" fill="rgba(0,0,0,0.55)" />
      {/* Jambes et souliers */}
      <rect x="112" y="318" width="34" height="176" rx="12" fill="#1b2424" />
      <rect x="154" y="318" width="34" height="176" rx="12" fill="#1b2424" />
      <rect x="104" y="484" width="46" height="18" rx="9" fill="#0a0a0a" />
      <rect x="150" y="484" width="46" height="18" rx="9" fill="#0a0a0a" />
      {/* Bras inactif (derrière le corps) */}
      <Bras epaule={actif.cote === 'G' ? GEOMETRIE.epauleD : GEOMETRIE.epauleG} angle={REPOS} couleur={veston} />
      {/* Torse : veston, chemise, cravate */}
      <path d="M96 176 Q150 150 204 176 L198 336 Q150 350 102 336 Z" fill={veston} />
      <path d="M136 162 L150 232 L164 162 Z" fill="#f4f4f4" />
      <path d="M145 172 L155 172 L159 236 L150 250 L141 236 Z" fill={cravate} />
      {/* Cou et tête */}
      <rect x="138" y="130" width="24" height="34" rx="8" fill="#dfbb98" />
      <ellipse cx="150" cy="96" rx="40" ry="46" fill="#e9c9a8" />
      <path d="M110 92 Q108 44 150 46 Q192 44 190 92 Q178 66 150 66 Q122 66 110 92 Z" fill={cheveux} />
      {/* Yeux qui suivent la main */}
      <ellipse cx="137" cy="92" rx="7.5" ry="8.5" fill="#fff" />
      <ellipse cx="163" cy="92" rx="7.5" ry="8.5" fill="#fff" />
      <circle cx={oeilG.x} cy={oeilG.y} r="3.6" fill="#16202a" />
      <circle cx={oeilD.x} cy={oeilD.y} r="3.6" fill="#16202a" />
      <path d={sourire ? 'M128 78 Q137 73 146 78' : 'M128 79 L146 79'} stroke={cheveux} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d={sourire ? 'M154 78 Q163 73 172 78' : 'M154 79 L172 79'} stroke={cheveux} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* Bouche : neutre, puis sourire quand la main approche */}
      <path d={sourire ? 'M132 114 Q150 132 168 114' : 'M138 118 Q150 121 162 118'} stroke="#7a3b2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Bras actif, tendu vers la main */}
      <Bras epaule={actif.epaule} angle={actif.angle} couleur={veston} secoue={poignee} />
    </svg>
  );
}

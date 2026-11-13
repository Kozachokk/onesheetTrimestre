import { useState } from 'react';
import { useProfil } from '../../etat/ProfilContext.jsx';
import { CRITERES } from '../../lib/pointage.js';
import { CATEGORIES, DEFINITIONS, DEFS } from '../../lib/ratios.js';
import { formater } from '../../lib/format.js';

function Curseur({ id, nom, aide }) {
  const { poids, total, reglerPoids } = useProfil();
  const valeur = poids[id] || 0;
  const part = total > 0 ? Math.round((valeur / total) * 100) : 0;
  return (
    <div className="curseur" title={aide}>
      <label htmlFor={`c-${id}`}>{nom}</label>
      <input id={`c-${id}`} type="range" min="0" max="100" step="1" value={valeur} style={{ '--part': `${valeur}%` }}
        onChange={(e) => reglerPoids(id, e.target.value)} />
      <output>{part} %</output>
    </div>
  );
}

/** Curseurs d'importance : les sept critères principaux, puis (mode avancé) les autres ratios et les filtres. */
export default function Curseurs() {
  const { config, filtres, basculerFiltre, seuils } = useProfil();
  const [avance, setAvance] = useState(false);
  const principaux = new Set(CRITERES.map((c) => c.id));
  const aide = (id) => `${DEFS[id].explication} Seuils : ${formater(seuils[id][0], DEFS[id].format)} (mauvais) → ${formater(seuils[id][1], DEFS[id].format)} (bon).`;

  return (
    <div>
      {CRITERES.map((c) => <Curseur key={c.id} id={c.id} nom={c.nom} aide={aide(c.id)} />)}
      <p className="discret petit" style={{ marginTop: '0.5rem' }}>
        Le pourcentage est la part de chaque critère dans le pointage. Un curseur à 0 exclut le critère.
      </p>
      <label className="case">
        <input type="checkbox" checked={avance} onChange={(e) => setAvance(e.target.checked)} />
        Mode avancé : autres ratios et filtres éliminatoires
      </label>
      {avance && (
        <div style={{ marginTop: '0.6rem' }}>
          <h3>Filtres éliminatoires</h3>
          {Object.entries(config.filtres).map(([f, cfg]) => (
            <label key={f} className="case" title={cfg.aide}>
              <input type="checkbox" checked={filtres.includes(f)} onChange={() => basculerFiltre(f)} />
              {cfg.nom}
            </label>
          ))}
          {CATEGORIES.map((cat) => {
            const autres = DEFINITIONS.filter((d) => d.categorie === cat && !principaux.has(d.id));
            if (!autres.length) return null;
            return (
              <div key={cat} style={{ marginTop: '0.8rem' }}>
                <h3>{cat}</h3>
                {autres.map((d) => <Curseur key={d.id} id={d.id} nom={d.nom} aide={aide(d.id)} />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

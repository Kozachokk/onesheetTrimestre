import { useEffect, useRef } from 'react';
import { fr } from '../../lib/format.js';

/* global Chart */ // Chart.js est chargé dans index.html

const COULEURS = ['#69db7c', '#c9f26c', '#7fb8b8'];

/**
 * Graphique financier : un seul axe vertical, une légende dès qu'il y a deux séries, la valeur exacte au survol,
 * puis l'analyse et le tableau des chiffres.
 */
export default function Graphique({ graphique }) {
  const toile = useRef(null);
  const { titre, type, unite, etiquettes, series, seuil, analyse, source } = graphique;

  useEffect(() => {
    if (!toile.current || typeof Chart === 'undefined') return undefined;
    const jeux = series.map((s, i) => ({
      label: s.nom, data: s.valeurs, type,
      backgroundColor: s.accent ? s.accent.map((a) => (a ? '#69db7c' : '#3f5959')) : COULEURS[i % 3],
      borderColor: COULEURS[i % 3], borderWidth: type === 'line' ? 2.5 : 0, borderRadius: 5, tension: 0.3, pointRadius: 4, spanGaps: true,
    }));
    if (seuil) {
      jeux.push({ label: seuil.nom, data: etiquettes.map(() => seuil.valeur), type: 'line', borderColor: '#c9f26c', borderDash: [6, 5], borderWidth: 2, pointRadius: 0, fill: false });
    }
    const instance = new Chart(toile.current.getContext('2d'), {
      type,
      data: { labels: etiquettes, datasets: jeux },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 700 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: jeux.length > 1, labels: { color: '#ffffff', usePointStyle: true, font: { family: 'Inter', weight: '600' } } },
          tooltip: { backgroundColor: '#0f1818', borderColor: '#3f5959', borderWidth: 1, titleColor: '#fff', bodyColor: '#fff',
            callbacks: { label: (c) => ` ${c.dataset.label} : ${c.parsed.y === null ? 'n. d.' : `${fr(c.parsed.y, 2)} ${unite}`}` } },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9fb3b3' } },
          y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#9fb3b3', callback: (v) => fr(v, 0) }, title: { display: true, text: unite, color: '#9fb3b3' } },
        },
      },
    });
    return () => instance.destroy();
  }, [type, unite, etiquettes, series, seuil]);

  return (
    <div className="carte" style={{ marginTop: '0.9rem' }}>
      <h3>{titre}</h3>
      <div className="toile"><canvas ref={toile} /></div>
      <p className="analyse">{analyse}</p>
      <div className="defilement">
        <table className="donnees">
          <thead><tr><th>{unite}</th>{etiquettes.map((e) => <th key={e}>{e}</th>)}</tr></thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.nom}><td><b>{s.nom}</b></td>{s.valeurs.map((v, i) => <td key={etiquettes[i]} className={v === null ? 'nd' : ''}>{fr(v, 2)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="discret petit" style={{ margin: '0.5rem 0 0' }}>Source : {source}</p>
    </div>
  );
}

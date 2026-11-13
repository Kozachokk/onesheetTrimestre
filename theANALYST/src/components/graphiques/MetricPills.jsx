const METRICS = [
  { id: 'all', label: '📊 Vue d\'ensemble (CA, Marge, EBITDA, Net)' },
  { id: 'revenue', label: '💰 Chiffre d\'affaires' },
  { id: 'gross_margin', label: '🛡️ Marge Brute' },
  { id: 'adjusted_ebitda', label: '⚡ EBITDA Ajusté' },
  { id: 'net_income', label: '🎯 Résultat Net' },
  { id: 'eps', label: '💵 BPA (EPS)' },
  { id: 'capex', label: '🏗️ Capex' }
];

export default function MetricPills({ activeMetric, onMetricSelect }) {
  return (
    <div className="metric-pills">
      {METRICS.map((m) => (
        <button
          key={m.id}
          className={`pill ${activeMetric === m.id ? 'active' : ''}`}
          onClick={() => onMetricSelect(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

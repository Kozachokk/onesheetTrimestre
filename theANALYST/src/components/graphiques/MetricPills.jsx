const METRICS = [
  { id: 'all', label: 'Vue d\'ensemble (CA, marge, EBITDA, net)' },
  { id: 'revenue', label: 'Chiffre d\'affaires' },
  { id: 'gross_margin', label: 'Marge brute' },
  { id: 'adjusted_ebitda', label: 'EBITDA ajusté' },
  { id: 'net_income', label: 'Résultat net' },
  { id: 'eps', label: 'BPA' },
  { id: 'capex', label: 'Capex' }
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

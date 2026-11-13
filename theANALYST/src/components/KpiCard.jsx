import { formatMoney } from '../utils/formatters';

export default function KpiCard({
  label,
  rawVal,
  formattedVal,
  period,
  accentClass = 'accent-blue',
  isPerShare = false,
  highlightSign = false
}) {
  const displayVal = formattedVal ?? formatMoney(rawVal, isPerShare);

  let signClass = '';
  if (highlightSign && rawVal !== null && rawVal !== undefined) {
    signClass = rawVal < 0 ? 'text-danger' : 'text-success';
  }

  return (
    <div className={`kpi-card ${accentClass}`}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${signClass}`}>{displayVal}</div>
      <div className="kpi-sub">Période : {period || '—'}</div>
    </div>
  );
}

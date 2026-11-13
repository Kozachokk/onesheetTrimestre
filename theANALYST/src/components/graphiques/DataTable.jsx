import { formatMoney } from '../../lib/formatters.js';

export default function DataTable({ periods = [], periodType = 'Quarterly' }) {
  const sortedPeriods = [...periods].reverse();

  return (
    <div className="table-card">
      <div className="table-top">
        <h3>Historique Complet des Données</h3>
        <span className="badge">{periods.length} périodes disponibles</span>
      </div>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Période</th>
              <th>Date Clôture</th>
              <th>Chiffre d'Affaires</th>
              <th>Marge Brute</th>
              <th>EBITDA Ajusté</th>
              <th>Résultat Net</th>
              <th>BPA (EPS)</th>
              <th>Capex</th>
            </tr>
          </thead>
          <tbody>
            {sortedPeriods.map((p) => {
              const mv = p.metricValues || {};
              const rev = mv.revenue?.value;
              const gm = mv.gross_margin?.value;
              const ebitda = mv.adjusted_ebitda?.value;
              const ni = mv.net_income?.value;
              const eps = mv.eps?.value;
              const capex = mv.capex?.value;
              const label =
                periodType === 'Quarterly'
                  ? `${p.calendarYear} Q${p.calendarQuarter}`
                  : `${p.fiscalYear || p.calendarYear} FY`;

              return (
                <tr key={p.periodId || p.reportDate}>
                  <td>
                    <strong>{label}</strong>
                  </td>
                  <td className="text-muted">{p.reportDate || 'n. d.'}</td>
                  <td>{formatMoney(rev)}</td>
                  <td>{formatMoney(gm)}</td>
                  <td>{formatMoney(ebitda)}</td>
                  <td
                    className={
                      ni !== null && ni !== undefined
                        ? ni >= 0
                          ? 'text-success'
                          : 'text-danger'
                        : ''
                    }
                  >
                    {formatMoney(ni)}
                  </td>
                  <td
                    className={
                      eps !== null && eps !== undefined
                        ? eps >= 0
                          ? 'text-success'
                          : 'text-danger'
                        : ''
                    }
                  >
                    {formatMoney(eps, true)}
                  </td>
                  <td>{formatMoney(capex)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

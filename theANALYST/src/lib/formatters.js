/**
 * Utilitaires de formatage monétaire et de manipulation des périodes financières.
 */

export function formatMoney(val, isPerShare = false) {
  if (val === null || val === undefined || isNaN(val)) return 'n. d.';
  
  if (isPerShare) {
    return (val >= 0 ? '+' : '') + Number(val).toFixed(2).replace('.', ',') + ' $';
  }
  
  const absVal = Math.abs(val);
  if (absVal >= 1e9) {
    return (val / 1e9).toFixed(2).replace('.', ',') + ' G$';
  }
  if (absVal >= 1e6) {
    return (val / 1e6).toFixed(1).replace('.', ',') + ' M$';
  }
  if (absVal >= 1e3) {
    return (val / 1e3).toFixed(0) + ' k$';
  }
  return Number(val).toLocaleString('fr-CA') + ' $';
}

export function formatPeriodLabel(period, periodType) {
  if (periodType === 'Quarterly') {
    return `${period.calendarYear} Q${period.calendarQuarter}`;
  }
  return `${period.fiscalYear || period.calendarYear} FY`;
}

export function getLatestQuarterMetric(dataList, metricKey) {
  const quarters = (dataList || [])
    .filter((p) => p.periodType === 'Quarterly')
    .sort((a, b) => (a.reportDate > b.reportDate ? 1 : -1));

  for (let i = quarters.length - 1; i >= 0; i--) {
    const mv = quarters[i].metricValues || {};
    if (mv[metricKey] && mv[metricKey].value !== null && mv[metricKey].value !== undefined) {
      return {
        value: mv[metricKey].value,
        period: `${quarters[i].calendarYear} Q${quarters[i].calendarQuarter}`
      };
    }
  }
  return { value: null, period: 'n. d.' };
}

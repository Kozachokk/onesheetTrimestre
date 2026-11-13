import { useState, useMemo } from 'react';
import areData from './data/are.json';
import CompanyHeader from './components/CompanyHeader';
import KpiGrid from './components/KpiGrid';
import FinancialChart from './components/FinancialChart';
import DataTable from './components/DataTable';
import { getLatestQuarterMetric } from './utils/formatters';
import './App.css';

// Constantes statiques issues de are.json
const PROFILE = areData.document?.profile || {};
const IDENTITY = PROFILE.identity || {};
const OVERVIEW = PROFILE.overview || {};
const DATA_LIST = areData.document?.data || [];

export default function App() {
  const [periodType, setPeriodType] = useState('Quarterly'); // 'Quarterly' | 'Annual'
  const [chartType, setChartType] = useState('bar');          // 'bar' | 'line'
  const [metricMode, setMetricMode] = useState('all');        // 'all' | metricId

  // Périodes filtrées et ordonnées chronologiquement
  const filteredPeriods = useMemo(() => {
    return DATA_LIST
      .filter((p) => p.periodType === periodType)
      .sort((a, b) => (a.reportDate > b.reportDate ? 1 : -1));
  }, [periodType]);

  // Indicateurs clés récents
  const kpis = useMemo(() => {
    return {
      revenue: getLatestQuarterMetric(DATA_LIST, 'revenue'),
      netIncome: getLatestQuarterMetric(DATA_LIST, 'net_income'),
      ebitda: getLatestQuarterMetric(DATA_LIST, 'adjusted_ebitda'),
      eps: getLatestQuarterMetric(DATA_LIST, 'eps')
    };
  }, []);

  return (
    <div className="app-container">
      {/* En-tête réutilisable */}
      <CompanyHeader
        companyName={IDENTITY.name || 'Aecon Group Inc.'}
        companySymbol={IDENTITY.listings?.[0]?.symbol || 'ARE'}
        currency={IDENTITY.reportingCurrency || 'CAD'}
        exchange={IDENTITY.listings?.[0]?.exchange || 'TSX'}
        sector="Construction & Infrastructure"
        source="data-pack/are.json"
        description={OVERVIEW.description}
      />

      {/* Grille de KPIs réutilisable */}
      <KpiGrid kpis={kpis} />

      {/* Graphique interactif Chart.js réutilisable */}
      <FinancialChart
        periods={filteredPeriods}
        periodType={periodType}
        chartType={chartType}
        metricMode={metricMode}
        onPeriodChange={setPeriodType}
        onChartTypeChange={setChartType}
        onMetricSelect={setMetricMode}
      />

      {/* Tableau de données réutilisable */}
      <DataTable
        periods={filteredPeriods}
        periodType={periodType}
      />
    </div>
  );
}

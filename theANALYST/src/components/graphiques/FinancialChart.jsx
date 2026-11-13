import { useEffect, useRef } from 'react';
import ChartControls from './ChartControls';
import MetricPills from './MetricPills';
import { formatMoney } from '../../lib/formatters.js';

// Chart.js loaded via CDN in index.html
/* global Chart */

const PALETTE = {
  revenue: { bg: 'rgba(105, 219, 124, 0.8)', border: '#69db7c' },
  gross_margin: { bg: 'rgba(201, 242, 108, 0.8)', border: '#c9f26c' },
  adjusted_ebitda: { bg: 'rgba(127, 184, 184, 0.8)', border: '#7fb8b8' },
  net_income: { bg: 'rgba(255, 255, 255, 0.8)', border: '#ffffff' },
  eps: { bg: 'rgba(236, 72, 153, 0.75)', border: '#ec4899' },
  capex: { bg: 'rgba(239, 68, 68, 0.75)', border: '#ef4444' }
};

export default function FinancialChart({
  periods = [],
  periodType = 'Quarterly',
  chartType = 'bar',
  metricMode = 'all',
  source = 'fichier JSON OneSheet',
  onPeriodChange,
  onChartTypeChange,
  onMetricSelect
}) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || typeof Chart === 'undefined') return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = periods.map((p) => {
      if (periodType === 'Quarterly') {
        return `${p.calendarYear} Q${p.calendarQuarter}`;
      }
      return `${p.fiscalYear || p.calendarYear} Annual`;
    });

    const datasets = [];

    const addDataset = (key, label, color) => {
      const data = periods.map((p) => {
        const val = p.metricValues?.[key]?.value;
        return val !== null && val !== undefined ? val : null;
      });

      if (data.some((v) => v !== null)) {
        datasets.push({
          label,
          data,
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 2,
          borderRadius: chartType === 'bar' ? 6 : 0,
          fill: chartType === 'line',
          tension: 0.3,
          yAxisID: 'y'
        });
      }
    };

    if (metricMode === 'all') {
      addDataset('revenue', 'Chiffre d\'affaires', PALETTE.revenue);
      addDataset('gross_margin', 'Marge brute', PALETTE.gross_margin);
      addDataset('adjusted_ebitda', 'EBITDA ajusté', PALETTE.adjusted_ebitda);
      addDataset('net_income', 'Résultat net', PALETTE.net_income);
    } else if (metricMode === 'revenue') {
      addDataset('revenue', 'Chiffre d\'affaires', PALETTE.revenue);
    } else if (metricMode === 'gross_margin') {
      addDataset('gross_margin', 'Marge brute', PALETTE.gross_margin);
    } else if (metricMode === 'adjusted_ebitda') {
      addDataset('adjusted_ebitda', 'EBITDA ajusté', PALETTE.adjusted_ebitda);
    } else if (metricMode === 'net_income') {
      addDataset('net_income', 'Résultat net', PALETTE.net_income);
    } else if (metricMode === 'eps') {
      addDataset('eps', 'BPA (EPS)', PALETTE.eps);
    } else if (metricMode === 'capex') {
      addDataset('capex', 'Capex', PALETTE.capex);
    }
    const ctx = canvasRef.current.getContext('2d');

    chartInstanceRef.current = new Chart(ctx, {
      type: chartType,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#e5e7eb',
              font: { size: 12, weight: '600' },
              usePointStyle: true,
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: '#0b1111',
            titleColor: '#f3f4f6',
            bodyColor: '#e5e7eb',
            borderColor: '#3f5959',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = context.parsed.y;
                const isEps = context.dataset.label.includes('BPA') || context.dataset.label.includes('EPS');
                return ` ${context.dataset.label}: ${formatMoney(val, isEps)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9ca3af', font: { size: 11 } }
          },
          y: {
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: {
              color: '#9ca3af',
              callback: (value) => formatMoney(value)
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [periods, periodType, chartType, metricMode]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h2>
            Évolution des Résultats {periodType === 'Quarterly' ? 'Trimestriels' : 'Annuels'}
          </h2>
          <p className="chart-subtitle">Source : {source}</p>
        </div>
        <ChartControls
          periodType={periodType}
          onPeriodChange={onPeriodChange}
          chartType={chartType}
          onChartTypeChange={onChartTypeChange}
        />
      </div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>

      <MetricPills
        activeMetric={metricMode}
        onMetricSelect={onMetricSelect}
      />
    </div>
  );
}

export default function ChartControls({
  periodType,
  onPeriodChange,
  chartType,
  onChartTypeChange
}) {
  return (
    <div className="controls-group">
      <div className="segmented-btn">
        <button
          className={periodType === 'Quarterly' ? 'active' : ''}
          onClick={() => onPeriodChange('Quarterly')}
        >
          Trimestriel
        </button>
        <button
          className={periodType === 'Annual' ? 'active' : ''}
          onClick={() => onPeriodChange('Annual')}
        >
          Annuel
        </button>
      </div>

      <div className="segmented-btn">
        <button
          className={chartType === 'bar' ? 'active' : ''}
          onClick={() => onChartTypeChange('bar')}
        >
          Barres
        </button>
        <button
          className={chartType === 'line' ? 'active' : ''}
          onClick={() => onChartTypeChange('line')}
        >
          Lignes
        </button>
      </div>
    </div>
  );
}

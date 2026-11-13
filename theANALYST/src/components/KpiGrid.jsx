import KpiCard from './KpiCard';

export default function KpiGrid({ kpis }) {
  if (!kpis) return null;

  return (
    <div className="kpi-grid">
      <KpiCard
        label="Dernier Chiffre d'Affaires"
        rawVal={kpis.revenue?.value}
        period={kpis.revenue?.period}
        accentClass="accent-blue"
      />
      <KpiCard
        label="Dernier Résultat Net"
        rawVal={kpis.netIncome?.value}
        period={kpis.netIncome?.period}
        accentClass="accent-green"
        highlightSign={true}
      />
      <KpiCard
        label="EBITDA Ajusté"
        rawVal={kpis.ebitda?.value}
        period={kpis.ebitda?.period}
        accentClass="accent-purple"
      />
      <KpiCard
        label="Bénéfice par Action (EPS)"
        rawVal={kpis.eps?.value}
        period={kpis.eps?.period}
        accentClass="accent-amber"
        isPerShare={true}
        highlightSign={true}
      />
    </div>
  );
}

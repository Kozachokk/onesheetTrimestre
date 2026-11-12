/**
 * OneSheet Trimestre — Chart.js Executive Analytics Dashboard
 */

// --- Global Chart Configuration & Font Defaults ---
Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.color = '#94a3b8'; // slate-400
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

// --- Quarterly Dataset Store ---
const quarterlyData = {
  Q1: {
    label: "Q1 2026 (Jan - Mar)",
    kpis: {
      revenue: "$682,400",
      revenueBadge: "+9.2%",
      revenueSub: "vs. previous period ($624,900)",
      margin: "24.8%",
      marginBadge: "+1.2%",
      accounts: "1,120",
      accountsBadge: "+8.4%",
      csat: "93.8%",
      csatBadge: "+0.5%",
      topSegment: "Enterprise SaaS"
    },
    trend: {
      labels: ["January", "February", "March"],
      revenue: [210000, 228000, 244400],
      target: [205000, 220000, 235000]
    },
    segments: {
      labels: ["Enterprise SaaS", "Mobile Subscriptions", "API Services", "Advisory"],
      data: [42, 28, 18, 12]
    },
    expenses: {
      labels: ["January", "February", "March"],
      sales: [210000, 228000, 244400],
      opex: [155000, 168000, 179000]
    },
    scorecard: [82, 88, 79, 85, 91, 84],
    initiatives: [
      { name: "Global Cloud Migration", lead: "Sarah Jenkins", progress: "100%", impact: "+$120K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "Self-Service Billing Portal", lead: "Alex Rivera", progress: "90%", impact: "+$65K", status: "On Track", statusClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" },
      { name: "EMEA Regional Expansion", lead: "Elena Rostova", progress: "75%", impact: "+$180K", status: "In Review", statusClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400" },
      { name: "Security SOC-2 Compliance", lead: "David Kim", progress: "100%", impact: "Cost Savings", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" }
    ]
  },
  Q2: {
    label: "Q2 2026 (Apr - Jun)",
    kpis: {
      revenue: "$745,800",
      revenueBadge: "+9.3%",
      revenueSub: "vs. previous period ($682,400)",
      margin: "26.1%",
      marginBadge: "+1.3%",
      accounts: "1,290",
      accountsBadge: "+15.2%",
      csat: "94.6%",
      csatBadge: "+0.8%",
      topSegment: "Enterprise SaaS"
    },
    trend: {
      labels: ["April", "May", "June"],
      revenue: [238000, 249000, 258800],
      target: [230000, 245000, 255000]
    },
    segments: {
      labels: ["Enterprise SaaS", "Mobile Subscriptions", "API Services", "Advisory"],
      data: [45, 26, 17, 12]
    },
    expenses: {
      labels: ["April", "May", "June"],
      sales: [238000, 249000, 258800],
      opex: [172000, 181000, 189000]
    },
    scorecard: [86, 90, 84, 88, 93, 87],
    initiatives: [
      { name: "Enterprise SSO Launch", lead: "David Kim", progress: "100%", impact: "+$140K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "Mobile App 3.0 Redesign", lead: "Alex Rivera", progress: "95%", impact: "+$95K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "Automated Lead Funnel", lead: "Sarah Jenkins", progress: "80%", impact: "+$75K", status: "On Track", statusClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" },
      { name: "Partner Affiliate Hub", lead: "Marcus Wong", progress: "60%", impact: "+$40K", status: "In Review", statusClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400" }
    ]
  },
  Q3: {
    label: "Q3 2026 (Jul - Sep)",
    kpis: {
      revenue: "$791,200",
      revenueBadge: "+6.1%",
      revenueSub: "vs. previous period ($745,800)",
      margin: "27.3%",
      marginBadge: "+1.2%",
      accounts: "1,375",
      accountsBadge: "+6.6%",
      csat: "95.4%",
      csatBadge: "+0.8%",
      topSegment: "Enterprise SaaS"
    },
    trend: {
      labels: ["July", "August", "September"],
      revenue: [256000, 264000, 271200],
      target: [250000, 260000, 270000]
    },
    segments: {
      labels: ["Enterprise SaaS", "Mobile Subscriptions", "API Services", "Advisory"],
      data: [47, 24, 19, 10]
    },
    expenses: {
      labels: ["July", "August", "September"],
      sales: [256000, 264000, 271200],
      opex: [183000, 190000, 195000]
    },
    scorecard: [89, 92, 87, 89, 95, 89],
    initiatives: [
      { name: "AI Copilot Integration", lead: "Alex Rivera", progress: "100%", impact: "+$210K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "Customer Retention Squad", lead: "Elena Rostova", progress: "90%", impact: "+$115K", status: "On Track", statusClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" },
      { name: "Latency Optimization Engine", lead: "David Kim", progress: "100%", impact: "+$50K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "Enterprise Tier Custom SLA", lead: "Marcus Wong", progress: "85%", impact: "+$130K", status: "On Track", statusClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" }
    ]
  },
  Q4: {
    label: "Q4 2026 (Oct - Dec)",
    kpis: {
      revenue: "$842,500",
      revenueBadge: "+18.4%",
      revenueSub: "vs. previous period ($711,300)",
      margin: "28.4%",
      marginBadge: "+2.8%",
      accounts: "1,480",
      accountsBadge: "+12.6%",
      csat: "96.2%",
      csatBadge: "+1.4%",
      topSegment: "Enterprise SaaS"
    },
    trend: {
      labels: ["October", "November", "December"],
      revenue: [268000, 281500, 293000],
      target: [260000, 275000, 285000]
    },
    segments: {
      labels: ["Enterprise SaaS", "Mobile Subscriptions", "API Services", "Advisory"],
      data: [51, 23, 16, 10]
    },
    expenses: {
      labels: ["October", "November", "December"],
      sales: [268000, 281500, 293000],
      opex: [188000, 196000, 204000]
    },
    scorecard: [92, 94, 91, 93, 97, 92],
    initiatives: [
      { name: "Multi-Region Multi-Tenant Cluster", lead: "David Kim", progress: "100%", impact: "+$240K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "Next-Gen Analytics Engine", lead: "Alex Rivera", progress: "100%", impact: "+$185K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "Global Enterprise Partner Program", lead: "Elena Rostova", progress: "92%", impact: "+$160K", status: "On Track", statusClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" },
      { name: "Automated Incident Self-Healing", lead: "Marcus Wong", progress: "88%", impact: "Cost Savings", status: "On Track", statusClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" }
    ]
  },
  ALL: {
    label: "FY 2026 (Full Year)",
    kpis: {
      revenue: "$3,061,900",
      revenueBadge: "+43.6% YoY",
      revenueSub: "Annualized Total Gross Revenue",
      margin: "27.2%",
      marginBadge: "+3.9%",
      accounts: "5,265",
      accountsBadge: "+24.8%",
      csat: "95.5%",
      csatBadge: "+2.1%",
      topSegment: "Enterprise SaaS (49%)"
    },
    trend: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      revenue: [210000, 228000, 244400, 238000, 249000, 258800, 256000, 264000, 271200, 268000, 281500, 293000],
      target: [205000, 220000, 235000, 230000, 245000, 255000, 250000, 260000, 270000, 260000, 275000, 285000]
    },
    segments: {
      labels: ["Enterprise SaaS", "Mobile Subscriptions", "API Services", "Advisory"],
      data: [49, 25, 16, 10]
    },
    expenses: {
      labels: ["Q1", "Q2", "Q3", "Q4"],
      sales: [682400, 745800, 791200, 842500],
      opex: [502000, 542000, 568000, 588000]
    },
    scorecard: [90, 93, 89, 91, 95, 91],
    initiatives: [
      { name: "Full-Year Enterprise Expansion", lead: "Executive Staff", progress: "100%", impact: "+$620K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "AI Copilot & Workflow Automation", lead: "Engineering & Product", progress: "100%", impact: "+$410K", status: "Completed", statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
      { name: "Cloud Infrastructure Re-architecture", lead: "DevOps & Core Infra", progress: "95%", impact: "Cost Savings ($180K)", status: "On Track", statusClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" },
      { name: "Partner Channel Acceleration", lead: "Global Sales Team", progress: "90%", impact: "+$340K", status: "On Track", statusClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" }
    ]
  }
};

// --- State Variables ---
let currentQuarter = 'Q4';
let smoothTrend = true;
let revenueChartInstance = null;
let categoryChartInstance = null;
let salesExpensesChartInstance = null;
let scorecardChartInstance = null;

// --- Helper: Format Currency ---
function formatCurrency(val) {
  return '$' + Number(val).toLocaleString();
}

// --- Helper: Check Dark Mode ---
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// --- Theme Aware Grid & Text Colors ---
function getThemeColors() {
  const dark = isDarkMode();
  return {
    gridColor: dark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)',
    tickColor: dark ? '#94a3b8' : '#64748b',
    tooltipBg: dark ? '#0f172a' : '#ffffff',
    tooltipTitle: dark ? '#f8fafc' : '#0f172a',
    tooltipBody: dark ? '#cbd5e1' : '#334155',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    radarGrid: dark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.8)',
    radarAngle: dark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.9)'
  };
}

// --- Chart 1: Revenue Growth vs Target (Line & Area) ---
function initRevenueTrendChart() {
  const ctx = document.getElementById('revenueTrendChart').getContext('2d');
  const colors = getThemeColors();
  const qData = quarterlyData[currentQuarter];

  // Create gradient for fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)'); // Indigo
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

  revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: qData.trend.labels,
      datasets: [
        {
          label: 'Realized Revenue',
          data: qData.trend.revenue,
          borderColor: '#6366f1', // Indigo-500
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: smoothTrend ? 0.4 : 0.0,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#6366f1',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#6366f1',
          pointHoverBorderColor: '#ffffff'
        },
        {
          label: 'Forecast Target',
          data: qData.trend.target,
          borderColor: '#94a3b8',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: smoothTrend ? 0.4 : 0.0,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#94a3b8'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            color: colors.tickColor,
            font: { size: 12, weight: 500 }
          }
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.tickColor, font: { size: 11 } }
        },
        y: {
          grid: { color: colors.gridColor },
          ticks: {
            color: colors.tickColor,
            font: { size: 11 },
            callback: function(value) {
              return '$' + (value / 1000) + 'k';
            }
          }
        }
      }
    }
  });
}

// --- Chart 2: Revenue by Segment (Doughnut) ---
function initCategoryDonutChart() {
  const ctx = document.getElementById('categoryDonutChart').getContext('2d');
  const colors = getThemeColors();
  const qData = quarterlyData[currentQuarter];

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: qData.segments.labels,
      datasets: [{
        data: qData.segments.data,
        backgroundColor: [
          '#6366f1', // Indigo
          '#06b6d4', // Cyan
          '#10b981', // Emerald
          '#f59e0b'  // Amber
        ],
        borderWidth: 2,
        borderColor: isDarkMode() ? '#0f172a' : '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            padding: 14,
            color: colors.tickColor,
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.parsed}%`;
            }
          }
        }
      }
    }
  });
}

// --- Chart 3: Sales vs Operating Expenses (Bar) ---
function initSalesExpensesBarChart() {
  const ctx = document.getElementById('salesExpensesBarChart').getContext('2d');
  const colors = getThemeColors();
  const qData = quarterlyData[currentQuarter];

  salesExpensesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: qData.expenses.labels,
      datasets: [
        {
          label: 'Gross Sales',
          data: qData.expenses.sales,
          backgroundColor: '#6366f1',
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.7
        },
        {
          label: 'Operating Expenses',
          data: qData.expenses.opex,
          backgroundColor: '#fb7185', // Rose-400
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false // We show a custom mini-legend in the card header
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.tickColor, font: { size: 11 } }
        },
        y: {
          grid: { color: colors.gridColor },
          ticks: {
            color: colors.tickColor,
            font: { size: 11 },
            callback: function(value) {
              return '$' + (value / 1000) + 'k';
            }
          }
        }
      }
    }
  });
}

// --- Chart 4: Operational Scorecard (Radar) ---
function initScorecardRadarChart() {
  const ctx = document.getElementById('scorecardRadarChart').getContext('2d');
  const colors = getThemeColors();
  const qData = quarterlyData[currentQuarter];

  scorecardChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: [
        'Sales Velocity',
        'Customer Retention',
        'Product Delivery',
        'Margin Health',
        'SLA Uptime',
        'Team Velocity'
      ],
      datasets: [{
        label: 'Current Maturity Index',
        data: qData.scorecard,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#6366f1',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return `Score: ${context.parsed.r} / 100`;
            }
          }
        }
      },
      scales: {
        r: {
          angleLines: { color: colors.radarAngle },
          grid: { color: colors.radarGrid },
          pointLabels: {
            color: colors.tickColor,
            font: { size: 10, weight: 600 }
          },
          ticks: {
            display: false,
            stepSize: 20
          },
          suggestedMin: 50,
          suggestedMax: 100
        }
      }
    }
  });
}

// --- Render Table Rows ---
function renderInitiativesTable() {
  const tbody = document.getElementById('initiativesTableBody');
  const list = quarterlyData[currentQuarter].initiatives;
  
  tbody.innerHTML = list.map(item => `
    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
      <td class="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
        ${item.name}
      </td>
      <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${item.lead}</td>
      <td class="px-6 py-4">
        <div class="flex items-center gap-2">
          <div class="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div class="bg-indigo-600 h-full rounded-full" style="width: ${item.progress}"></div>
          </div>
          <span class="text-xs font-semibold">${item.progress}</span>
        </div>
      </td>
      <td class="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">${item.impact}</td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.statusClass}">
          ${item.status}
        </span>
      </td>
    </tr>
  `).join('');
}

// --- Update All Charts & KPIs on Quarter Switch ---
function switchQuarter(quarterKey) {
  if (!quarterlyData[quarterKey]) return;
  currentQuarter = quarterKey;

  // 1. Update Tabs Active Styling
  document.querySelectorAll('.quarter-tab').forEach(btn => {
    if (btn.getAttribute('data-quarter') === quarterKey) {
      btn.className = "quarter-tab active px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm";
    } else {
      btn.className = "quarter-tab px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 text-slate-600 dark:text-slate-300 hover:text-slate-900";
    }
  });

  const data = quarterlyData[quarterKey];

  // 2. Update KPI Labels
  document.getElementById('currentQuarterLabel').textContent = data.label;
  document.getElementById('kpiRevenue').textContent = data.kpis.revenue;
  document.getElementById('kpiRevenueBadge').textContent = data.kpis.revenueBadge;
  document.getElementById('kpiMargin').textContent = data.kpis.margin;
  document.getElementById('kpiMarginBadge').textContent = data.kpis.marginBadge;
  document.getElementById('kpiAccounts').textContent = data.kpis.accounts;
  document.getElementById('kpiAccountsBadge').textContent = data.kpis.accountsBadge;
  document.getElementById('kpiCsat').textContent = data.kpis.csat;
  document.getElementById('kpiCsatBadge').textContent = data.kpis.csatBadge;
  document.getElementById('topSegmentName').textContent = data.kpis.topSegment;

  // 3. Update Line Chart
  if (revenueChartInstance) {
    revenueChartInstance.data.labels = data.trend.labels;
    revenueChartInstance.data.datasets[0].data = [...data.trend.revenue];
    revenueChartInstance.data.datasets[1].data = [...data.trend.target];
    revenueChartInstance.update();
  }

  // 4. Update Doughnut Chart
  if (categoryChartInstance) {
    categoryChartInstance.data.labels = data.segments.labels;
    categoryChartInstance.data.datasets[0].data = [...data.segments.data];
    categoryChartInstance.update();
  }

  // 5. Update Bar Chart
  if (salesExpensesChartInstance) {
    salesExpensesChartInstance.data.labels = data.expenses.labels;
    salesExpensesChartInstance.data.datasets[0].data = [...data.expenses.sales];
    salesExpensesChartInstance.data.datasets[1].data = [...data.expenses.opex];
    salesExpensesChartInstance.update();
  }

  // 6. Update Radar Chart
  if (scorecardChartInstance) {
    scorecardChartInstance.data.datasets[0].data = [...data.scorecard];
    scorecardChartInstance.update();
  }

  // 7. Update Table
  renderInitiativesTable();
}

// --- Randomize Data simulation ---
function randomizeData() {
  const current = quarterlyData[currentQuarter];
  
  // Apply a slight variance (+/- 12%)
  const vary = (val) => Math.round(val * (0.88 + Math.random() * 0.24));

  if (revenueChartInstance) {
    revenueChartInstance.data.datasets[0].data = current.trend.revenue.map(vary);
    revenueChartInstance.update();
  }

  if (salesExpensesChartInstance) {
    salesExpensesChartInstance.data.datasets[0].data = current.expenses.sales.map(vary);
    salesExpensesChartInstance.data.datasets[1].data = current.expenses.opex.map(vary);
    salesExpensesChartInstance.update();
  }

  if (scorecardChartInstance) {
    scorecardChartInstance.data.datasets[0].data = current.scorecard.map(val => Math.min(100, Math.max(60, vary(val))));
    scorecardChartInstance.update();
  }
}

// --- Update Themes & Chart Colors ---
function updateThemeColors() {
  const colors = getThemeColors();

  const charts = [
    { instance: revenueChartInstance, hasCartesian: true },
    { instance: salesExpensesChartInstance, hasCartesian: true },
    { instance: categoryChartInstance, hasCartesian: false },
    { instance: scorecardChartInstance, isRadar: true }
  ];

  charts.forEach(item => {
    if (!item.instance) return;
    const chart = item.instance;

    // Tooltip colors
    chart.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
    chart.options.plugins.tooltip.titleColor = colors.tooltipTitle;
    chart.options.plugins.tooltip.bodyColor = colors.tooltipBody;
    chart.options.plugins.tooltip.borderColor = colors.tooltipBorder;

    // Cartesian scales
    if (item.hasCartesian && chart.options.scales) {
      if (chart.options.scales.x) {
        chart.options.scales.x.ticks.color = colors.tickColor;
      }
      if (chart.options.scales.y) {
        chart.options.scales.y.ticks.color = colors.tickColor;
        chart.options.scales.y.grid.color = colors.gridColor;
      }
    }

    // Radar scale
    if (item.isRadar && chart.options.scales.r) {
      chart.options.scales.r.angleLines.color = colors.radarAngle;
      chart.options.scales.r.grid.color = colors.radarGrid;
      chart.options.scales.r.pointLabels.color = colors.tickColor;
    }

    // Doughnut segment border color
    if (chart.config.type === 'doughnut') {
      chart.data.datasets[0].borderColor = isDarkMode() ? '#0f172a' : '#ffffff';
    }

    chart.update();
  });
}

// --- Theme Toggle Handler ---
function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');

  function updateIcons() {
    if (isDarkMode()) {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }

  // Initial check based on saved preference or system theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateIcons();

  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = isDarkMode();
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateIcons();
    updateThemeColors();
  });
}

// --- Wire Event Listeners & Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  // Setup theme
  setupThemeToggle();

  // Initialize charts
  initRevenueTrendChart();
  initCategoryDonutChart();
  initSalesExpensesBarChart();
  initScorecardRadarChart();
  renderInitiativesTable();

  // Quarter selector click events
  document.getElementById('quarterSelector').addEventListener('click', (e) => {
    const tab = e.target.closest('.quarter-tab');
    if (tab) {
      const q = tab.getAttribute('data-quarter');
      switchQuarter(q);
    }
  });

  // Randomize button
  document.getElementById('randomizeBtn').addEventListener('click', randomizeData);

  // Toggle smooth vs linear tension on trend line
  document.getElementById('toggleTrendType').addEventListener('click', () => {
    smoothTrend = !smoothTrend;
    if (revenueChartInstance) {
      revenueChartInstance.data.datasets[0].tension = smoothTrend ? 0.4 : 0.0;
      revenueChartInstance.data.datasets[1].tension = smoothTrend ? 0.4 : 0.0;
      revenueChartInstance.update();
    }
  });
});

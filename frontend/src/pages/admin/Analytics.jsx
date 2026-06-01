/**
 * Analytics.jsx
 * -------------
 * Admin analytics dashboard with multiple chart types and filters.
 */

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { GlassCard, EmptyState, StatCard } from '../../components/ui';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import { Line, Scatter } from 'react-chartjs-2';
import { useTheme } from '../../hooks/useTheme';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import {
  getAvailableYears, getExpenditureDates,
  getMonthlyBreakdown, getSummary, getComparison,
  getUsageTrends, getCostVsUsage,
} from '../../services/analyticsService';
import { formatCurrency, formatDate } from '../../utils/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Analytics() {
  const { isDark } = useTheme();
  
  // Filters
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [dates, setDates] = useState([]);
  const [selectedExpId, setSelectedExpId] = useState('');
  const [trendCategory, setTrendCategory] = useState('electricity');

  // Data
  const [summary, setSummary] = useState(null);
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [scatterData, setScatterData] = useState([]);

  // Load available years
  useEffect(() => {
    (async () => {
      const { ok, data } = await getAvailableYears();
      if (ok && data.length > 0) {
        setYears(data);
      }
    })();
  }, []);

  // Load expenditure dates when year changes
  useEffect(() => {
    (async () => {
      const { ok, data } = await getExpenditureDates(selectedYear || undefined);
      if (ok) {
        setDates(data);
        setSelectedExpId('');
      }
    })();
  }, [selectedYear]);

  // Fetch analytics data when filters change
  const fetchAnalytics = useCallback(async () => {
    const params = {};
    if (selectedExpId) params.expenditure_id = selectedExpId;
    else if (selectedYear) params.year = selectedYear;

    const [summaryRes, pieRes, barRes, trendRes, scatterRes] = await Promise.all([
      getSummary(params),
      getMonthlyBreakdown(params),
      getComparison(),
      getUsageTrends(trendCategory),
      getCostVsUsage(),
    ]);

    if (summaryRes.ok) setSummary(summaryRes.data);
    if (pieRes.ok) setPieData(pieRes.data);
    if (barRes.ok) setBarData(barRes.data);
    if (trendRes.ok) setTrendData(trendRes.data);
    if (scatterRes.ok) setScatterData(scatterRes.data);
  }, [selectedYear, selectedExpId, trendCategory]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Line chart config
  const lineChartData = {
    labels: trendData.map(d => d.label),
    datasets: [
      {
        label: 'Units',
        data: trendData.map(d => d.units),
        borderColor: isDark ? '#818cf8' : '#4f46e5',
        backgroundColor: isDark ? 'rgba(129, 140, 248, 0.1)' : 'rgba(79, 70, 229, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Cost (₹)',
        data: trendData.map(d => d.cost),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,0.1)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y1',
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'top', 
        labels: { 
          font: { family: 'Inter', size: 12 },
          color: isDark ? '#cbd5e1' : '#475569'
        } 
      } 
    },
    scales: {
      x: { ticks: { font: { family: 'Inter', size: 11 }, color: isDark ? '#cbd5e1' : '#94a3b8' }, grid: { display: false } },
      y: { ticks: { font: { family: 'Inter', size: 11 }, color: isDark ? '#cbd5e1' : '#94a3b8' }, grid: { color: isDark ? '#334155' : '#e2e8f0' } },
      y1: { position: 'right', ticks: { font: { family: 'Inter', size: 11 }, color: isDark ? '#cbd5e1' : '#94a3b8', callback: v => '₹' + v }, grid: { display: false } },
    },
  };

  // Scatter chart config
  const scatterChartData = {
    datasets: [{
      label: 'Cost vs Usage',
      data: scatterData.map(d => ({ x: d.units, y: d.amount })),
      backgroundColor: scatterData.map(d => {
        const colors = { electricity: '#4f46e5', water: '#0284c7', maintenance: '#d97706' };
        return colors[d.category] || '#94a3b8';
      }),
      pointRadius: 6,
    }],
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 6,
      }
    },
    scales: {
      x: { 
        title: { display: true, text: 'Units Used', font: { family: 'Inter' }, color: isDark ? '#cbd5e1' : '#475569' }, 
        ticks: { color: isDark ? '#cbd5e1' : '#94a3b8' },
        grid: { color: isDark ? '#334155' : '#e2e8f0' } 
      },
      y: { 
        title: { display: true, text: 'Amount (₹)', font: { family: 'Inter' }, color: isDark ? '#cbd5e1' : '#475569' }, 
        ticks: { color: isDark ? '#cbd5e1' : '#94a3b8' },
        grid: { color: isDark ? '#334155' : '#e2e8f0' } 
      },
    },
  };

  const handleClearFilters = () => {
    setSelectedYear('');
    setSelectedExpId('');
  };

  // Filter bar chart monthly data based on selectedYear
  const filteredBarData = selectedYear
    ? barData.filter(d => d.year === parseInt(selectedYear))
    : barData;

  return (
    <DashboardLayout title="Analytics Dashboard" showBackLink={true} backPath="/admin/dashboard">
      {/* Filters */}
      <div className="filter-bar mb-4 d-flex align-items-end" style={{ gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <i className="bi bi-calendar3" style={{ marginRight: 4 }}></i>Year
          </label>
          <select className="form-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <i className="bi bi-funnel" style={{ marginRight: 4 }}></i>Expenditure Period
          </label>
          <select className="form-select" value={selectedExpId} onChange={(e) => setSelectedExpId(e.target.value)}>
            <option value="">All periods</option>
            {dates.map(d => (
              <option key={d.id} value={d.id}>{formatDate(d.from_date)} — {formatDate(d.to_date)} ({formatCurrency(d.total_amount)})</option>
            ))}
          </select>
        </div>
        <div>
          <button className="btn btn-outline-accent" onClick={handleClearFilters} style={{ padding: '8px 16px', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="bi bi-x-circle"></i> Clear Filter
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="stats-grid mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatCard icon="bi-cash-stack" iconColor="green" value={formatCurrency(summary.total)} label="Total Expenses" />
          <StatCard icon="bi-arrow-up-circle" iconColor="orange"
            value={summary.highest ? summary.highest.category : '—'} label="Highest Category" />
          <StatCard icon="bi-arrow-down-circle" iconColor="cyan"
            value={summary.lowest ? summary.lowest.category : '—'} label="Lowest Category" />
          <StatCard icon="bi-hash" iconColor="purple" value={summary.count} label="Expense Items" />
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .analytics-chart-row {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 24px;
          align-items: stretch;
        }
        .analytics-bar-col {
          flex: 0 0 calc(70% - 12px);
          width: calc(70% - 12px);
          display: flex;
        }
        .analytics-pie-col {
          flex: 0 0 calc(30% - 12px);
          width: calc(30% - 12px);
          display: flex;
        }
        body.sidebar-collapsed .analytics-bar-col {
          flex: 0 0 calc(60% - 12px);
          width: calc(60% - 12px);
        }
        body.sidebar-collapsed .analytics-pie-col {
          flex: 0 0 calc(40% - 12px);
          width: calc(40% - 12px);
        }
        @media (max-width: 991px) {
          .analytics-bar-col, .analytics-pie-col,
          body.sidebar-collapsed .analytics-bar-col,
          body.sidebar-collapsed .analytics-pie-col {
            flex: 0 0 100% !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-bottom: 16px;
          }
        }
      `}} />

      {/* Charts Grid */}
      <div className="analytics-chart-row">
        <div className="analytics-bar-col">
          <GlassCard style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 24, margin: 0 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '15px' }}>
              <i className="bi bi-bar-chart" style={{ marginRight: 8, color: 'var(--success)' }}></i>Monthly Comparison
            </h5>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '340px', width: '100%' }}>
              {barData.length > 0 ? (
                <BarChart labels={filteredBarData.map(d => d.label)} data={filteredBarData.map(d => d.total)} />
              ) : (
                <EmptyState icon="bi-bar-chart" message="No data available" />
              )}
            </div>
          </GlassCard>
        </div>
        <div className="analytics-pie-col">
          <GlassCard style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 24, margin: 0 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '15px' }}>
              <i className="bi bi-pie-chart" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Category Breakdown
            </h5>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '340px', width: '100%' }}>
              {pieData.length > 0 ? (
                <PieChart labels={pieData.map(d => d.category)} data={pieData.map(d => d.amount)} />
              ) : (
                <EmptyState icon="bi-pie-chart" message="No data available" />
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Usage Trends Graph */}
      <div className="row mb-4">
        <div className="col-12">
          <GlassCard style={{ padding: 28 }}>
            <div className="d-flex justify-between align-items-center mb-4" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <h5 style={{ fontWeight: 700, margin: 0, fontSize: '15px' }}>
                <i className="bi bi-graph-up" style={{ marginRight: 8, color: 'var(--info)' }}></i>Usage Trends
              </h5>
              <select className="form-select" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                value={trendCategory} onChange={(e) => setTrendCategory(e.target.value)}>
                <option value="electricity">⚡ Electricity</option>
                <option value="water">💧 Water</option>
              </select>
            </div>
            {trendData.length > 0 ? (
              <div className="chart-container" style={{ height: 350, position: 'relative' }}>
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            ) : (
              <EmptyState icon="bi-graph-up" message="No usage data available" />
            )}
          </GlassCard>
        </div>
      </div>

      {/* Cost vs Usage Graph */}
      <div className="row">
        <div className="col-12">
          <GlassCard style={{ padding: 28 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 20, fontSize: '15px' }}>
              <i className="bi bi-scatter" style={{ marginRight: 8, color: 'var(--warning)' }}></i>Cost vs Usage
            </h5>
            {scatterData.length > 0 ? (
              <div className="chart-container" style={{ height: 350, position: 'relative' }}>
                <Scatter data={scatterChartData} options={scatterOptions} />
              </div>
            ) : (
              <EmptyState icon="bi-scatter" message="No scatter data available" />
            )}
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

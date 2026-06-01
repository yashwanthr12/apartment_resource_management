/**
 * ResidentDashboard.jsx
 * ----------------------
 * Resident dashboard: View bills, filter by year/date range, upload receipts.
 * Polls every 15s for new bills from admin.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppNavbar from '../../components/layout/AppNavbar';
import { GlassCard, Alert, EmptyState, StatusBadge, Modal, InlineSpinner, StatCard } from '../../components/ui';
import { getBills, getFilterYears, getFilterRanges, getFilteredBills } from '../../services/billService';
import { getResidentPaymentInfo, uploadReceipt, downloadReceipt } from '../../services/paymentService';
import { usePolling } from '../../hooks/usePolling';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import { Line, Scatter } from 'react-chartjs-2';
import { useTheme } from '../../hooks/useTheme';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ResidentDashboard() {
  const { isDark } = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  
  const [bills, setBills] = useState([]);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [alert, setAlert] = useState(null);
  const [previewBill, setPreviewBill] = useState(null);

  // Filters for Dashboard/Bills
  const [filterYears, setFilterYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [ranges, setRanges] = useState([]);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState('');
  const [isFiltered, setIsFiltered] = useState(false);

  // View state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'analytics') {
      setPreviousTab(activeTab);
    }
  }, [activeTab]);
  
  // Clipboard copied state
  const [copied, setCopied] = useState(false);

  // Filters for Analytics
  const [analyticsYear, setAnalyticsYear] = useState('');
  const [analyticsPeriodId, setAnalyticsPeriodId] = useState('');
  const [trendCategory, setTrendCategory] = useState('electricity');

  // Modals / Uploads
  const [uploadBillId, setUploadBillId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Handle location state for deep-linking/tab navigation (e.g. from navbar dropdown)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      document.title = 'Dashboard | ApartEase';
    } else if (activeTab === 'analytics') {
      document.title = 'Analytics | ApartEase';
    } else if (activeTab === 'payment-details') {
      document.title = 'Payment Details | ApartEase';
    } else {
      document.title = 'ApartEase';
    }
  }, [activeTab]);


  useEffect(() => {
    setPreviewBill(null);
  }, [activeTab]);

  // Polling data every 15s
  usePolling(useCallback(async () => {
    const [billsRes, paymentRes, yearsRes] = await Promise.all([
      getBills(),
      getResidentPaymentInfo(),
      getFilterYears()
    ]);
    if (billsRes.ok) setBills(billsRes.data);
    if (paymentRes.ok) setPaymentInfo(paymentRes.data);
    if (yearsRes.ok) setFilterYears(yearsRes.data);
  }, []), 15000);

  // Dashboard Filters handling
  const handleYearChange = async (year) => {
    setSelectedYear(year);
    setSelectedRangeIndex('');
    setIsFiltered(false);
    if (!year) {
      setRanges([]);
      const res = await getBills();
      if (res.ok) setBills(res.data);
      return;
    }
    const res = await getFilterRanges(parseInt(year));
    if (res.ok) setRanges(res.data);
  };

  const handleRangeChange = async (index) => {
    setSelectedRangeIndex(index);
    if (index === '') {
      setIsFiltered(false);
      const res = await getBills();
      if (res.ok) setBills(res.data);
      return;
    }
    const selectedRange = ranges[parseInt(index)];
    if (!selectedRange) return;
    setIsFiltered(true);
    const res = await getFilteredBills(parseInt(selectedYear), selectedRange.from_date, selectedRange.to_date);
    if (res.ok) setBills(res.data);
  };

  const handleClearFilter = async () => {
    setSelectedYear('');
    setSelectedRangeIndex('');
    setRanges([]);
    setIsFiltered(false);
    const res = await getBills();
    if (res.ok) setBills(res.data);
  };

  // Upload receipt handling
  const handleUpload = async () => {
    const file = fileRef.current?.files[0];
    if (!file) {
      setAlert({ message: 'Please select a receipt file', type: 'warning' });
      return;
    }
    setUploading(true);
    const res = await uploadReceipt(uploadBillId, file);
    if (res.ok) {
      setAlert({ message: 'Receipt uploaded successfully!', type: 'success' });
      setUploadBillId(null);
      const billsRes = await getBills();
      if (billsRes.ok) setBills(billsRes.data);
    } else {
      setAlert({ message: res.data?.error || 'Upload failed', type: 'danger' });
    }
    setUploading(false);
  };

  // Clipboard copy handler
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Analytics tab computations
  // 1. Periods dropdown: all unique expenditures from bills matching selected analytics year
  const analyticsPeriods = [];
  const seenExpIds = new Set();
  bills.forEach((bill) => {
    const dateStr = bill.expense_from_date || bill.from_date || bill.created_at;
    if (!dateStr) return;
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj) && (!analyticsYear || dateObj.getFullYear() === parseInt(analyticsYear))) {
      const expId = bill.expenditure_id || bill.id;
      if (!seenExpIds.has(expId)) {
        seenExpIds.add(expId);
        analyticsPeriods.push({
          id: expId,
          from_date: bill.expense_from_date || bill.from_date,
          to_date: bill.expense_to_date || bill.to_date,
          total_amount: bill.expenditure_total || bill.split_amount
        });
      }
    }
  });
  analyticsPeriods.sort((a, b) => new Date(b.from_date) - new Date(a.from_date));

  // 2. Filter bills for analytics stats/charts
  const filteredAnalyticsBills = bills.filter((bill) => {
    if (analyticsPeriodId) {
      const expId = bill.expenditure_id || bill.id;
      return String(expId) === String(analyticsPeriodId);
    }
    if (!analyticsYear) return true;
    const dateStr = bill.expense_from_date || bill.from_date || bill.created_at;
    if (!dateStr) return true;
    const dateObj = new Date(dateStr);
    return !isNaN(dateObj) && dateObj.getFullYear() === parseInt(analyticsYear);
  });

  // Calculate total costs & categories breakdown
  const totalExpenses = filteredAnalyticsBills.reduce((sum, bill) => sum + bill.split_amount, 0);
  const billedPeriodsCount = filteredAnalyticsBills.length;
  const categoryBreakdown = {};

  filteredAnalyticsBills.forEach((bill) => {
    if (bill.expenditure_categories && bill.expenditure_categories.length > 0) {
      const totalAmt = bill.expenditure_total || bill.expenditure_categories.reduce((sum, c) => sum + c.amount, 0);
      bill.expenditure_categories.forEach((cat) => {
        const catName = cat.category === 'other' && cat.custom_category ? cat.custom_category : cat.category;
        const residentShare = totalAmt > 0 ? (cat.amount / totalAmt) * bill.split_amount : 0;
        categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + residentShare;
      });
    } else {
      const catName = bill.category === 'other' && bill.custom_category ? bill.custom_category : (bill.category || 'Other');
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + bill.split_amount;
    }
  });

  // Find highest / lowest category
  let highestCategory = '—';
  let highestAmount = 0;
  let lowestCategory = '—';
  let lowestAmount = Infinity;
  Object.entries(categoryBreakdown).forEach(([cat, amt]) => {
    if (amt > highestAmount) {
      highestAmount = amt;
      highestCategory = cat;
    }
    if (amt < lowestAmount) {
      lowestAmount = amt;
      lowestCategory = cat;
    }
  });

  const getCategoryLabel = (cat) => {
    if (!cat || cat === '—') return '—';
    const mapping = {
      electricity: '⚡ Electricity',
      water: '💧 Water',
      maintenance: '🔧 Maintenance',
      security: '🛡️ Security',
      elevator: '🛗 Elevator Service',
      other: '📦 Other'
    };
    return mapping[cat.toLowerCase()] || cat;
  };

  const pieLabels = Object.keys(categoryBreakdown).map(getCategoryLabel);
  const pieValues = Object.values(categoryBreakdown);

  // Comparison Chart: monthly breakdown
  const monthlyData = {};
  filteredAnalyticsBills.forEach((bill) => {
    const dateStr = bill.expense_from_date || bill.from_date || bill.created_at;
    if (dateStr) {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj)) {
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = (monthlyData[key] || 0) + bill.split_amount;
      }
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const barLabels = [];
  const barValues = [];
  sortedMonths.forEach((monthKey) => {
    if (!analyticsYear || monthKey.startsWith(analyticsYear)) {
      barLabels.push(monthKey);
      barValues.push(monthlyData[monthKey]);
    }
  });

  // Usage trends (Electricity / Water)
  const trendData = {};
  filteredAnalyticsBills.forEach((bill) => {
    const dateStr = bill.expense_from_date || bill.from_date || bill.created_at;
    if (dateStr && bill.expenditure_categories) {
      const totalAmt = bill.expenditure_total || bill.expenditure_categories.reduce((sum, c) => sum + c.amount, 0);
      const catObj = bill.expenditure_categories.find((c) => c.category === trendCategory);
      if (catObj) {
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj)) {
          const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          const perPerson = bill.expenditure_per_person > 0 ? (bill.expenditure_total / bill.expenditure_per_person) : 1;
          const residentUnitsShare = catObj.units_used ? (catObj.units_used / perPerson) : 0;
          const residentCostShare = totalAmt > 0 ? (catObj.amount / totalAmt) * bill.split_amount : 0;

          if (!trendData[monthKey]) {
            trendData[monthKey] = { units: 0, cost: 0 };
          }
          trendData[monthKey].units += residentUnitsShare;
          trendData[monthKey].cost += residentCostShare;
        }
      }
    }
  });

  const sortedTrendMonths = Object.keys(trendData).sort();
  const trendUnits = sortedTrendMonths.map((m) => trendData[m].units);
  const trendCosts = sortedTrendMonths.map((m) => trendData[m].cost);

  const trendChartData = {
    labels: sortedTrendMonths,
    datasets: [
      {
        label: 'My Units Share',
        data: trendUnits,
        borderColor: isDark ? '#818cf8' : '#4f46e5',
        backgroundColor: isDark ? 'rgba(129, 140, 248, 0.1)' : 'rgba(79, 70, 229, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'My Cost Share (₹)',
        data: trendCosts,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y1'
      }
    ]
  };

  const trendChartOptions = {
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
      x: {
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: isDark ? '#cbd5e1' : '#94a3b8'
        },
        grid: { display: false }
      },
      y: {
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: isDark ? '#cbd5e1' : '#94a3b8'
        },
        grid: { color: isDark ? '#334155' : '#e2e8f0' }
      },
      y1: {
        position: 'right',
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: isDark ? '#cbd5e1' : '#94a3b8',
          callback: (value) => '₹' + value
        },
        grid: { display: false }
      }
    }
  };

  // Cost vs Usage Scatter Chart
  const scatterData = [];
  filteredAnalyticsBills.forEach((bill) => {
    if (bill.expenditure_categories && bill.expenditure_categories.length > 0) {
      const totalAmt = bill.expenditure_total || bill.expenditure_categories.reduce((sum, c) => sum + c.amount, 0);
      const perPerson = bill.expenditure_per_person > 0 ? (bill.expenditure_total / bill.expenditure_per_person) : 1;
      bill.expenditure_categories.forEach((catObj) => {
        if (catObj.units_used) {
          const catName = catObj.category === 'other' && catObj.custom_category ? catObj.custom_category : catObj.category;
          const unitsShare = catObj.units_used / perPerson;
          const costShare = totalAmt > 0 ? (catObj.amount / totalAmt) * bill.split_amount : 0;
          scatterData.push({
            category: catName,
            units: unitsShare,
            amount: costShare
          });
        }
      });
    }
  });

  const scatterChartData = {
    datasets: [
      {
        label: 'Cost vs Usage',
        data: scatterData.map((d) => ({ x: d.units, y: d.amount })),
        backgroundColor: scatterData.map((d) => {
          const colors = {
            electricity: '#4f46e5',
            water: '#0284c7',
            maintenance: '#d97706'
          };
          return colors[d.category] || '#94a3b8';
        }),
        pointRadius: 6
      }
    ]
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
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'My Share of Units Used',
          font: { family: 'Inter' },
          color: isDark ? '#cbd5e1' : '#475569'
        },
        ticks: { color: isDark ? '#cbd5e1' : '#94a3b8' },
        grid: { color: isDark ? '#334155' : '#e2e8f0' }
      },
      y: {
        title: {
          display: true,
          text: 'My Share of Cost (₹)',
          font: { family: 'Inter' },
          color: isDark ? '#cbd5e1' : '#475569'
        },
        ticks: { color: isDark ? '#cbd5e1' : '#94a3b8' },
        grid: { color: isDark ? '#334155' : '#e2e8f0' }
      }
    }
  };

  // Calculate dashboard summary metrics
  const pendingBills = bills.filter((b) => !b.payment_verified && (b.payment_status === 'pending' || b.payment_status === 'no_payment' || b.payment_status === 'rejected'));
  const totalPendingAmount = pendingBills.reduce((sum, b) => sum + b.split_amount, 0);

  const verifiedBills = bills.filter((b) => b.payment_verified);
  const totalVerifiedAmount = verifiedBills.reduce((sum, b) => sum + b.split_amount, 0);

  const totalBillsCount = bills.length;

  return (
    <>
      <AppNavbar onNavigate={(tab) => setActiveTab(tab)} />
      
      <div style={{ maxWidth: 1200, margin: '28px auto', padding: '0 20px', paddingTop: '92px' }} className="fade-in">
        
        {/* Header Section */}
        {activeTab !== 'payment-details' && (
          <div className="d-flex justify-content-between align-items-center mb-4" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: 6, fontSize: 22 }}>
                {activeTab === 'dashboard' ? 'My Dashboard' : 'My Analytics'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                {activeTab === 'dashboard'
                  ? 'View your bills and manage payments'
                  : 'Personalized insights & expenditure analysis'}
              </p>
            </div>
            
            {/* Spacing & FlexWrap nowrap fixed between My Dashboard & Analytics tab buttons */}
            <div className="d-flex gap-3" style={{
              background: 'var(--bg-muted, rgba(255,255,255,0.05))',
              padding: '4px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              flexWrap: 'nowrap'
            }}>
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  backgroundColor: activeTab === 'dashboard' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <i className="bi bi-house-door" style={{ marginRight: 6 }}></i>My Dashboard
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  backgroundColor: activeTab === 'analytics' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'analytics' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <i className="bi bi-bar-chart-line" style={{ marginRight: 6 }}></i>Analytics
              </button>
            </div>
          </div>
        )}

        <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

        {/* Preview Screen or Tab Content */}
        {previewBill ? (
          <div className="d-flex justify-content-center fade-in" style={{ width: '100%', marginBottom: '40px' }}>
            <GlassCard style={{ width: '100%', maxWidth: '680px', padding: '32px', position: 'relative' }}>
              
              {/* Back Arrow button */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <button 
                  className="btn btn-link text-decoration-none p-0 me-3" 
                  onClick={() => setPreviewBill(null)}
                  style={{ color: 'var(--text-primary)', fontSize: '22px', display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer' }}
                  aria-label="Back to dashboard"
                >
                  <i className="bi bi-arrow-left"></i>
                </button>
                <h5 style={{ fontWeight: 700, margin: 0, fontSize: 18 }}>
                  <i className="bi bi-file-earmark-text" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                  Bill Details Preview
                </h5>
              </div>

              <div className="section-divider" style={{ margin: '0 0 24px 0' }}></div>

              {/* 🧾 HEADER */}
              <div className="text-center mb-4">
                <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {user?.apartment_name || 'Apartment Community'}
                </h3>
                <span className="badge badge-verified" style={{ fontSize: 13, padding: '6px 16px', fontWeight: 600 }}>
                  {previewBill.expenditure_id 
                    ? 'Grouped Monthly Bill' 
                    : `${(previewBill.custom_category || previewBill.category || 'Expense').toUpperCase()} BILL`}
                </span>
              </div>

              {/* 📅 PERIOD */}
              <div className="d-flex justify-content-center mb-4">
                <div className="preview-date-badge">
                  <i className="bi bi-calendar3" style={{ marginRight: 8 }}></i>
                  {previewBill.expense_from_date && previewBill.expense_to_date
                    ? `${formatDate(previewBill.expense_from_date)} — ${formatDate(previewBill.expense_to_date)}`
                    : previewBill.from_date && previewBill.to_date
                    ? `${formatDate(previewBill.from_date)} — ${formatDate(previewBill.to_date)}`
                    : '--'}
                </div>
              </div>

              {/* 📊 EXPENDITURE TABLE */}
              <h6 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                Expenditure Breakdown
              </h6>
              
              <div style={{ overflowX: 'auto', marginBottom: 28 }}>
                <table className="table-custom" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="text-right">Total Category Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewBill.expenditure_categories && previewBill.expenditure_categories.length > 0 ? (
                      previewBill.expenditure_categories.map((c, idx) => {
                        const label = getCategoryLabel(c.category === 'other' && c.custom_category ? c.custom_category : c.category);
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</td>
                            <td className="text-right" style={{ fontWeight: 700 }}>{formatCurrency(c.amount)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {getCategoryLabel(previewBill.custom_category || previewBill.category)}
                        </td>
                        <td className="text-right" style={{ fontWeight: 700 }}>
                          {formatCurrency(previewBill.expenditure_total || previewBill.split_amount)}
                        </td>
                      </tr>
                    )}
                    
                    {/* Total Amount Row */}
                    <tr style={{ background: 'var(--bg-muted)', borderTop: '2px solid var(--border)' }}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Grouped Amount</td>
                      <td className="text-right" style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '15px' }}>
                        {formatCurrency(previewBill.expenditure_total || previewBill.split_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 🏠 SPLIT DETAILS */}
              <h6 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                Billing Split Details
              </h6>
              
              <div className="split-result-card">
                <div className="split-result-row">
                  <span>Total Billed Households</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {previewBill.expenditure_total && previewBill.expenditure_per_person
                      ? Math.round(previewBill.expenditure_total / previewBill.expenditure_per_person)
                      : (previewBill.total_houses || 1)} Houses
                  </strong>
                </div>
                <div className="split-result-divider"></div>
                <div className="split-result-row split-result-highlight" style={{ fontSize: 15 }}>
                  <span>Your Share (Amount Per Person)</span>
                  <strong style={{ color: 'var(--success)', fontSize: 16 }}>
                    {formatCurrency(previewBill.split_amount)}
                  </strong>
                </div>
              </div>

            </GlassCard>
          </div>
        ) : (
          <>
            {/* Tab content rendering */}
            {activeTab === 'dashboard' && (
              <div className="row">
                <div className="col-12">
                  {/* Summary Cards */}
                  <div className="stats-grid mb-4">
                    <StatCard 
                      icon="bi-hourglass-split" 
                      iconColor="orange" 
                      value={formatCurrency(totalPendingAmount)} 
                      label="Pending Payments" 
                    />
                    <StatCard 
                      icon="bi-check-circle" 
                      iconColor="green" 
                      value={formatCurrency(totalVerifiedAmount)} 
                      label="Verified Payments" 
                    />
                    <StatCard 
                      icon="bi-file-earmark-text" 
                      iconColor="purple" 
                      value={totalBillsCount} 
                      label="Total Bills" 
                    />
                  </div>

                  <GlassCard style={{ padding: 24 }}>
                    <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: 16 }}>
                      <i className="bi bi-file-earmark-text" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                      My Bills
                    </h5>
                    
                    <div className="filter-bar mb-3 d-flex align-items-end" style={{ gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <i className="bi bi-calendar3" style={{ marginRight: 4 }}></i>Select Year
                        </label>
                        <select className="form-select" value={selectedYear} onChange={(e) => handleYearChange(e.target.value)}>
                          <option value="">All Years</option>
                          {filterYears.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <i className="bi bi-funnel" style={{ marginRight: 4 }}></i>Date Range
                        </label>
                        <select className="form-select" value={selectedRangeIndex} disabled={!selectedYear} onChange={(e) => handleRangeChange(e.target.value)}>
                          <option value="">{selectedYear ? 'All ranges' : 'Select year first'}</option>
                          {ranges.map((r, idx) => (
                            <option key={idx} value={idx}>
                              {formatDate(r.from_date)} — {formatDate(r.to_date)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {isFiltered && (
                        <div style={{ alignSelf: 'flex-end' }}>
                          <button className="btn btn-danger btn-sm" onClick={handleClearFilter}>
                            <i className="bi bi-x-circle"></i> Show All
                          </button>
                        </div>
                      )}
                    </div>

                    {bills.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table-custom">
                          <thead>
                            <tr>
                              <th>Period</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Action</th>
                              <th>Preview</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bills.map((bill) => {
                              const periodStr = bill.expense_from_date && bill.expense_to_date
                                ? `${formatDate(bill.expense_from_date)} — ${formatDate(bill.expense_to_date)}`
                                : bill.from_date && bill.to_date
                                ? `${formatDate(bill.from_date)} — ${formatDate(bill.to_date)}`
                                : '--';
                                
                              const isPending = bill.payment_status === 'pending' || bill.payment_status === 'no_payment';
                              const isRejected = bill.payment_status === 'rejected';
                              
                              return (
                                <tr key={bill.id}>
                                  <td style={{ fontSize: 12 }}>{periodStr}</td>
                                  <td style={{ fontWeight: 700 }}>{formatCurrency(bill.split_amount)}</td>
                                  <td>
                                    <StatusBadge status={bill.payment_verified ? 'verified' : bill.payment_status} />
                                  </td>
                                  <td>
                                    {(isPending || isRejected) && (
                                      <button className="btn btn-accent btn-sm" onClick={() => setUploadBillId(bill.id)}>
                                        <i className="bi bi-upload"></i> {isRejected ? 'Re-upload' : 'Upload'}
                                      </button>
                                    )}
                                    {bill.payment_status === 'paid' && !bill.payment_verified && (
                                      <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                                        <i className="bi bi-hourglass-split"></i> Under Review
                                      </span>
                                    )}
                                    {bill.payment_verified && (
                                      <button 
                                        className="btn btn-outline-success btn-sm" 
                                        onClick={async () => {
                                          const res = await downloadReceipt(bill.payment_id);
                                          if (!res.ok) setAlert({ message: res.error || 'Download failed', type: 'danger' });
                                        }}
                                        style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <i className="bi bi-download"></i> Receipt
                                      </button>
                                    )}
                                  </td>
                                  <td>
                                    <button 
                                      className="btn btn-outline-accent btn-sm"
                                      onClick={() => setPreviewBill(bill)}
                                      style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <i className="bi bi-eye"></i> Preview
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState icon="bi-inbox" message="No bills yet. Your admin will send bills when expenditures are recorded." />
                    )}
                  </GlassCard>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="fade-in">
                {/* Analytics Filters */}
                <div className="filter-bar mb-4 d-flex align-items-end" style={{ gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <i className="bi bi-calendar3" style={{ marginRight: 4 }}></i>Year
                    </label>
                    <select className="form-select" value={analyticsYear} onChange={(e) => { setAnalyticsYear(e.target.value); setAnalyticsPeriodId(''); }}>
                      <option value="">All Years</option>
                      {filterYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <i className="bi bi-funnel" style={{ marginRight: 4 }}></i>Expenditure Period
                    </label>
                    <select className="form-select" value={analyticsPeriodId} onChange={(e) => setAnalyticsPeriodId(e.target.value)}>
                      <option value="">All periods</option>
                      {analyticsPeriods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatDate(p.from_date)} — {formatDate(p.to_date)} ({formatCurrency(p.total_amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <button className="btn btn-outline-accent" onClick={() => { setAnalyticsYear(''); setAnalyticsPeriodId(''); }} style={{ padding: '8px 16px', height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-x-circle"></i> Clear Filter
                    </button>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="stats-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                  <StatCard icon="bi-cash-stack" iconColor="green" value={formatCurrency(totalExpenses)} label="My Total Expenses" />
                  <StatCard icon="bi-arrow-up-circle" iconColor="orange" value={getCategoryLabel(highestCategory)} label="Highest Category" />
                  <StatCard icon="bi-arrow-down-circle" iconColor="cyan" value={lowestAmount === Infinity ? '—' : getCategoryLabel(lowestCategory)} label="Lowest Category" />
                  <StatCard icon="bi-hash" iconColor="purple" value={billedPeriodsCount} label="Billed Periods" />
                </div>

                {/* Row for Charts */}
                <div className="row mb-4">
                  <div className="col-lg-7 mb-4 mb-lg-0">
                    <GlassCard style={{ padding: 24 }}>
                      <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '15px' }}>
                        <i className="bi bi-bar-chart" style={{ marginRight: 8, color: 'var(--success)' }}></i>Monthly Expense Comparison
                      </h5>
                      {barValues.length > 0 ? (
                        <BarChart labels={barLabels} data={barValues} label="My Share (₹)" />
                      ) : (
                        <EmptyState icon="bi-bar-chart" message="No data available for comparison" />
                      )}
                    </GlassCard>
                  </div>
                  
                  <div className="col-lg-5">
                    <GlassCard style={{ padding: 24 }}>
                      <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '15px' }}>
                        <i className="bi bi-pie-chart" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Category Breakdown
                      </h5>
                      {pieValues.length > 0 ? (
                        <PieChart labels={pieLabels} data={pieValues} />
                      ) : (
                        <EmptyState icon="bi-pie-chart" message="No category breakdown available" />
                      )}
                    </GlassCard>
                  </div>
                </div>

                {/* Usage Trends */}
                <div className="row mb-4">
                  <div className="col-12">
                    <GlassCard style={{ padding: 28 }}>
                      <div className="d-flex justify-content-between align-items-center mb-4" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <h5 style={{ fontWeight: 700, margin: 0, fontSize: '15px' }}>
                          <i className="bi bi-graph-up" style={{ marginRight: 8, color: 'var(--info)' }}></i>Usage Trends
                        </h5>
                        <select className="form-select" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} value={trendCategory} onChange={(e) => setTrendCategory(e.target.value)}>
                          <option value="electricity">⚡ Electricity</option>
                          <option value="water">💧 Water</option>
                        </select>
                      </div>
                      {sortedTrendMonths.length > 0 ? (
                        <div className="chart-container" style={{ height: 350, position: 'relative' }}>
                          <Line data={trendChartData} options={trendChartOptions} />
                        </div>
                      ) : (
                        <EmptyState icon="bi-graph-up" message={`No usage data found for ${trendCategory} in grouped bills`} />
                      )}
                    </GlassCard>
                  </div>
                </div>

                {/* Cost vs Usage Scatter Graph */}
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
              </div>
            )}

            {/* Beautiful Centered Payment Details Card View */}
            {activeTab === 'payment-details' && (
              <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }} className="fade-in">
                
                {/* Page-level Back Link */}
                <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={() => {
                      try {
                        sessionStorage.setItem('profile-dropdown-open', 'true');
                      } catch { /* noop */ }
                      setActiveTab(previousTab);
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      textDecoration: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'color 0.2s ease-in-out',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.target.style.color = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.target.style.color = 'var(--text-muted)'; }}
                  >
                    ← Back
                  </button>
                </div>

                {/* Main Page Heading */}
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontWeight: 700, marginBottom: 6, fontSize: 22, margin: 0 }}>
                    Payment Details
                  </h2>
                  <p style={{ color: 'var(--text-muted)', margin: '6px 0 0 0', fontSize: '14px' }}>
                    View bank account details and scan QR code for payments
                  </p>
                </div>

                <GlassCard style={{ padding: '28px', position: 'relative' }}>
                  
                  {/* Card Heading - Changed to match "Resident Payment Information" */}
                  <h5 style={{ fontWeight: 700, margin: '0 0 24px 0', fontSize: 18, display: 'flex', alignItems: 'center' }}>
                    <i className="bi bi-credit-card-2-front" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                    Resident Payment Information
                  </h5>

                  {paymentInfo ? (
                    <div>
                      {/* UPI ID block with copy capability */}
                      {paymentInfo.upi_id && (
                        <div className="payment-info-block upi mb-4" style={{
                          background: 'var(--bg-muted, rgba(255,255,255,0.03))',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                              <i className="bi bi-phone" style={{ marginRight: 4 }}></i>UPI ID
                            </div>
                            <code style={{ color: 'var(--primary)', fontSize: 16, wordBreak: 'break-all' }}>{paymentInfo.upi_id}</code>
                          </div>
                          <button 
                            className="btn btn-sm btn-outline-secondary" 
                            onClick={() => handleCopy(paymentInfo.upi_id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
                          >
                            <i className={`bi ${copied ? 'bi-check2-circle text-success' : 'bi-clipboard'}`}></i>
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {/* Bank details block */}
                      {(paymentInfo.bank_name || paymentInfo.account_number) && (
                        <div className="payment-info-block bank mb-4" style={{
                          background: 'var(--bg-muted, rgba(255,255,255,0.03))',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                            <i className="bi bi-bank" style={{ marginRight: 4 }}></i>Bank Details
                          </div>
                          <div style={{ lineHeight: 2, color: 'var(--text-secondary)', fontSize: 14 }}>
                            {paymentInfo.bank_name && (
                              <div className="d-flex justify-content-between border-bottom py-2" style={{ borderColor: 'var(--border)' }}>
                                <strong>Bank Name:</strong> <span>{paymentInfo.bank_name}</span>
                              </div>
                            )}
                            {paymentInfo.account_holder_name && (
                              <div className="d-flex justify-content-between border-bottom py-2" style={{ borderColor: 'var(--border)' }}>
                                <strong>Account Holder:</strong> <span>{paymentInfo.account_holder_name}</span>
                              </div>
                            )}
                            {paymentInfo.account_number && (
                              <div className="d-flex justify-content-between border-bottom py-2" style={{ borderColor: 'var(--border)' }}>
                                <strong>Account Number:</strong> <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{paymentInfo.account_number}</span>
                              </div>
                            )}
                            {paymentInfo.ifsc_code && (
                              <div className="d-flex justify-content-between border-bottom py-2" style={{ borderColor: 'var(--border)' }}>
                                <strong>IFSC Code:</strong> <span style={{ fontFamily: 'monospace' }}>{paymentInfo.ifsc_code}</span>
                              </div>
                            )}
                            {paymentInfo.branch_name && (
                              <div className="d-flex justify-content-between py-2">
                                <strong>Branch Name:</strong> <span>{paymentInfo.branch_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* QR Code block */}
                      {paymentInfo.qr_code && (
                        <div className="text-center p-4" style={{
                          background: 'var(--bg-muted, rgba(255,255,255,0.03))',
                          borderRadius: '8px',
                          border: '1px solid var(--border)'
                        }}>
                          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16 }}>
                            Scan QR Code to Pay
                          </div>
                          <img 
                            src={`/${paymentInfo.qr_code}`} 
                            alt="QR Code" 
                            style={{ 
                              width: '100%', 
                              maxWidth: 220, 
                              height: 'auto', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border)', 
                              background: '#ffffff', 
                              padding: '12px',
                              boxShadow: 'var(--shadow-sm)'
                            }} 
                          />
                        </div>
                      )}

                      {!paymentInfo.upi_id && !paymentInfo.bank_name && !paymentInfo.qr_code && (
                        <p className="text-center py-4 m-0" style={{ color: 'var(--text-muted)' }}>
                          Payment details not configured yet. Contact your admin.
                        </p>
                      )}
                    </div>
                  ) : (
                    <EmptyState icon="bi-credit-card" message="Loading payment info..." />
                  )}
                </GlassCard>
              </div>
            )}
          </>
        )}

      </div>

      {/* Upload Receipt Modal */}
      <Modal isOpen={!!uploadBillId} onClose={() => setUploadBillId(null)}
        title={<><i className="bi bi-upload" style={{ marginRight: 8 }}></i>Upload Payment Receipt</>}
        footer={
          <button className="btn btn-accent" onClick={handleUpload} disabled={uploading}>
            {uploading ? <><InlineSpinner /> Uploading...</> : <><i className="bi bi-send"></i> Submit Receipt</>}
          </button>
        }>
        <div className="mb-3">
          <label className="form-label">Payment Receipt Screenshot</label>
          <input type="file" className="form-control" ref={fileRef} accept="image/*,.pdf" />
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Upload a screenshot of your payment (UPI/bank transfer). The admin will verify it.
        </p>
      </Modal>
    </>
  );
}

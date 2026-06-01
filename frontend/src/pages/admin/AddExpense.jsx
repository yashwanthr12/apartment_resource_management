/**
 * AddExpense.jsx
 * ---------------
 * Admin page for adding grouped expenditures with multiple categories.
 * Features: category builder, live preview, automatic utility unit handling,
 * contribution calculation preview, and save.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { GlassCard, Alert, EmptyState, Modal, InlineSpinner } from '../../components/ui';
import { saveExpenditure, getExpenditures, updateExpenditure } from '../../services/expenseService';
import { getVerifiedResidents } from '../../services/adminService';
import { usePolling } from '../../hooks/usePolling';
import { formatCurrency, formatDate } from '../../utils/format';

const CATEGORIES = [
  { value: 'electricity', label: '⚡ Electricity' },
  { value: 'water', label: '💧 Water' },
  { value: 'maintenance', label: '🔧 Maintenance' },
  { value: 'security', label: '🛡️ Security' },
  { value: 'elevator', label: '🛗 Elevator Service' },
  { value: 'other', label: '📦 Other' },
];

const getCategoryLabel = (category, customCategory) => {
  if (category === 'other') return customCategory || 'Other';
  const found = CATEGORIES.find(c => c.value === category);
  return found ? found.label : category;
};

export default function AddExpense() {
  const location = useLocation();
  const navigate = useNavigate();
  const editExpenditure = location.state?.editExpenditure;

  // Date range
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Edit identifier
  const [editingId, setEditingId] = useState(null);

  // Categories list (preview)
  const [categories, setCategories] = useState([]);

  // Dynamic lock logic: lock only after first category is added, or if editing
  const dateLocked = categories.length > 0 || !!editingId;
  const todayStr = new Date().toLocaleDateString('en-CA');

  // Category form
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [unitsUsed, setUnitsUsed] = useState('');
  const [unitType, setUnitType] = useState('');

  // Verified residents
  const [residents, setResidents] = useState([]);
  const [showContributionPreview, setShowContributionPreview] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  // Save state
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Expenditure history
  const [history, setHistory] = useState([]);

  // Ref for auto-scroll
  const contributionRef = useRef(null);

  // Load verified residents on mount
  useEffect(() => {
    const loadResidents = async () => {
      const { ok, data } = await getVerifiedResidents();
      if (ok) {
        setResidents(data);
      }
    };
    loadResidents();
  }, []);

  // Pre-fill data if editing from Send Bills page
  useEffect(() => {
    if (editExpenditure) {
      setEditingId(editExpenditure.id);
      setFromDate(editExpenditure.from_date || '');
      setToDate(editExpenditure.to_date || '');
      
      const mappedCats = (editExpenditure.categories || []).map(c => ({
        category: c.category,
        custom_category: c.custom_category,
        amount: c.amount,
        units_used: c.units_used,
        unit_type: c.unit_type,
        label: c.category === 'other' && c.custom_category ? c.custom_category : c.category,
      }));
      setCategories(mappedCats);
      setShowContributionPreview(false);
    }
  }, [editExpenditure]);

  // Fetch expenditure history with polling
  const fetchHistory = useCallback(async () => {
    const { ok, data } = await getExpenditures();
    if (ok) setHistory(data);
  }, []);
  usePolling(fetchHistory, 30000);

  // Show units fields for electricity/water
  const showUnits = category === 'electricity' || category === 'water';

  // Automatically set unit labels for utility categories
  const handleCategoryChange = (val) => {
    setCategory(val);
    if (val === 'water') {
      setUnitType('Liters (L)');
      setUnitsUsed('');
    } else if (val === 'electricity') {
      setUnitType('kWh (Kilowatt-hour)');
      setUnitsUsed('');
    } else {
      setUnitType('');
      setUnitsUsed('');
    }
  };

  // Add a category to the list
  const addCategory = () => {
    if (!category || !amount) {
      setAlert({ message: 'Please select a category and enter an amount', type: 'warning' });
      return;
    }
    if (parseFloat(amount) <= 0) {
      setAlert({ message: 'Amount must be a positive number', type: 'warning' });
      return;
    }
    const newCat = {
      category,
      custom_category: category === 'other' ? customCategory : undefined,
      amount: parseFloat(amount),
      units_used: unitsUsed ? parseFloat(unitsUsed) : undefined,
      unit_type: unitType || undefined,
      label: category === 'other' && customCategory ? customCategory : category,
    };
    setCategories([...categories, newCat]);
    // Reset form
    setCategory('');
    setCustomCategory('');
    setAmount('');
    setUnitsUsed('');
    setUnitType('');
    setShowContributionPreview(false); // Reset preview
  };

  // Remove a category
  const removeCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
    setShowContributionPreview(false); // Reset preview
  };

  // Calculate totals
  const totalAmount = categories.reduce((sum, c) => sum + c.amount, 0);
  const totalHousesVal = residents.length || 1;
  const perPersonAmount = totalAmount / totalHousesVal;

  const handleGeneratePreview = () => {
    if (categories.length === 0) {
      setAlert({ message: 'Please add at least one category first', type: 'warning' });
      return;
    }
    if (!fromDate || !toDate) {
      setAlert({ message: 'Please specify the billing period dates', type: 'warning' });
      return;
    }
    setShowContributionPreview(true);
    setTimeout(() => {
      contributionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Save expenditure
  const handleSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setAlert(null);

    const body = {
      from_date: fromDate,
      to_date: toDate,
      total_houses: residents.length, // Automatically set to number of verified residents
      categories: categories.map(c => ({
        category: c.category,
        custom_category: c.custom_category,
        amount: c.amount,
        units_used: c.units_used,
        unit_type: c.unit_type,
      })),
    };

    let res;
    if (editingId) {
      res = await updateExpenditure(editingId, body);
    } else {
      res = await saveExpenditure(body);
    }

    const { ok, data } = res;

    if (ok) {
      setAlert({
        message: editingId
          ? 'Expenditure updated successfully! Redirecting...'
          : 'Expenditure and contribution allocations saved successfully!',
        type: 'success'
      });
      // Reset form
      setCategories([]);
      setFromDate('');
      setToDate('');
      setShowContributionPreview(false);
      
      // Re-fetch history immediately
      fetchHistory();

      if (editingId) {
        setEditingId(null);
        setTimeout(() => {
          navigate('/admin/residents');
        }, 1500);
      }
    } else {
      setAlert({ message: data.error || 'Failed to save expenditure', type: 'danger' });
    }
    setSaving(false);
  };

  return (
    <DashboardLayout title="Expense Management" showBackLink={true} backPath="/admin/dashboard">
      <div className="row d-flex align-items-stretch g-4">
        {/* ── Left: Form ── */}
        <div className="col-lg-7" style={{ display: 'flex', flexDirection: 'column' }}>
          <GlassCard style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h5 style={{ fontWeight: 700, marginBottom: 24, fontSize: '16px' }}>Expenditure Details</h5>
            <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

            {/* Date Range */}
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">From Date</label>
                <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={dateLocked} max={todayStr} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">To Date</label>
                <input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={dateLocked} max={todayStr} required />
              </div>
              {dateLocked && (
                <div className="col-12 mt-2">
                  <small style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500, fontSize: '12px' }}>
                    <i className="bi bi-lock-fill"></i> Date range locked after first entry to maintain billing consistency
                  </small>
                </div>
              )}
            </div>

            <div className="section-divider"></div>

            {/* Category Form */}
            <h6 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', fontSize: '14px' }}>
              <i className="bi bi-tag" style={{ marginRight: 4 }}></i>Add Category
            </h6>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              {category === 'other' && (
                <div className="col-md-6">
                  <label className="form-label">Custom Category</label>
                  <input type="text" className="form-control" placeholder="e.g. Parking"
                    value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
                </div>
              )}
            </div>

            <div className="row mb-3">
              <div className="col-md-4">
                <label className="form-label">Amount (₹)</label>
                <input type="number" className="form-control" step="0.01" min="0" placeholder="0.00"
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              {showUnits && (
                <>
                  <div className="col-md-4">
                    <label className="form-label">Units Used</label>
                    <input type="number" className="form-control" step="0.01" min="0" placeholder="0"
                      value={unitsUsed} onChange={(e) => setUnitsUsed(e.target.value)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Unit Type</label>
                    <input type="text" className="form-control" value={unitType} readOnly disabled />
                  </div>
                </>
              )}
            </div>

            <button type="button" className="btn btn-outline-accent" onClick={addCategory}>
              <i className="bi bi-plus-lg"></i> Add Category
            </button>
          </GlassCard>
        </div>

        {/* ── Right: Preview ── */}
        <div className="col-lg-5" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GlassCard style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '16px' }}>
                <i className="bi bi-eye" style={{ marginRight: 8, color: 'var(--info)' }}></i>Expenditure Preview
              </h5>

              {fromDate && toDate && (
                <div className="mb-3">
                  <div className="preview-date-badge">
                    <i className="bi bi-calendar-range" style={{ marginRight: 8 }}></i>
                    {formatDate(fromDate)} — {formatDate(toDate)}
                  </div>
                </div>
              )}

              {categories.length > 0 ? (
                <>
                  <table className="table-custom" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Amount</th>
                        <th style={{ width: 80, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c, i) => {
                        const displayLabel = getCategoryLabel(c.category, c.custom_category);
                        return (
                          <tr key={i}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{displayLabel}</div>
                              {c.units_used && (
                                <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                  {c.units_used} {c.unit_type}
                                </small>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(c.amount)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-link text-danger"
                                onClick={() => removeCategory(i)}
                                style={{ padding: 0, border: 'none', background: 'none' }}
                                title="Remove"
                              >
                                <i className="bi bi-trash-fill" style={{ fontSize: '16px' }}></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="preview-total-row" style={{ marginTop: 20, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Expenditure Amount</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState icon="bi-collection" message="Add categories to see preview" />
              )}
            </div>

            {categories.length > 0 && fromDate && toDate && (
              <div className="mt-3">
                <button
                  type="button"
                  className="btn btn-accent btn-w-full"
                  onClick={handleGeneratePreview}
                  style={{ padding: '12px 20px', fontWeight: 600 }}
                >
                  <i className="bi bi-calculator" style={{ marginRight: 8 }}></i>
                  Generate Resident Contribution Preview
                </button>
              </div>
            )}
          </GlassCard>

          {/* Expenditure History (Hidden when preview is active) */}
          {!showContributionPreview && (
            <GlassCard style={{ padding: 28 }}>
              <div
                onClick={() => setHistoryCollapsed(!historyCollapsed)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h5 style={{ fontWeight: 700, margin: 0, fontSize: '16px' }}>
                  <i className="bi bi-clock-history" style={{ marginRight: 8, color: 'var(--warning)' }}></i>
                  Recent Expenditures
                </h5>
                <i className={`bi bi-chevron-${historyCollapsed ? 'down' : 'up'}`} style={{ fontSize: '16px', color: 'var(--text-secondary)' }}></i>
              </div>

              <div style={{
                maxHeight: historyCollapsed ? '0px' : '500px',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-top 0.3s ease-in-out',
                opacity: historyCollapsed ? 0 : 1,
                marginTop: historyCollapsed ? '0px' : '16px'
              }}>
                {history.length > 0 ? (
                  <div className="row g-3">
                    {history.slice(0, 5).map((exp) => (
                      <div key={exp.id} className="col-12">
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'transform 0.2s, background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                              {formatDate(exp.from_date)} → {formatDate(exp.to_date)}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                              <span>
                                <i className="bi bi-tags" style={{ marginRight: '4px' }}></i>
                                {exp.categories?.length || 0} {exp.categories?.length === 1 ? 'Category' : 'Categories'}
                              </span>
                              <span>
                                <i className="bi bi-house" style={{ marginRight: '4px' }}></i>
                                {exp.total_houses} {exp.total_houses === 1 ? 'House' : 'Houses'}
                              </span>
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--primary)' }}>
                            {formatCurrency(exp.total_amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="bi-inbox" message="No expenditures yet" />
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* ── Section 2: Contribution Breakdown ── */}
      {showContributionPreview && (
        <div ref={contributionRef} className="row mt-4">
          <div className="col-12">
            <GlassCard style={{ padding: 28 }}>
              <div className="d-flex justify-between items-center mb-3">
                <h5 style={{ fontWeight: 700, margin: 0, fontSize: '16px' }}>
                  <i className="bi bi-people" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                  Resident Contribution Breakdown
                </h5>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-accent"
                    onClick={() => setShowContributionPreview(false)}
                  >
                    <i className="bi bi-x-lg" style={{ marginRight: 6 }}></i>
                    Cancel Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-accent"
                    onClick={() => setShowConfirmModal(true)}
                  >
                    <i className="bi bi-save" style={{ marginRight: 6 }}></i>
                    Save Expenditure
                  </button>
                </div>
              </div>

              {residents.length > 0 ? (
                <div className="table-responsive">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>Resident Name</th>
                        <th>Flat Number</th>
                        <th>Contribution Factor</th>
                        <th style={{ textAlign: 'right' }}>Amount Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {residents.map((r) => {
                        const payable = perPersonAmount * (parseFloat(r.split_number) || 1.0);
                        return (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 600 }}>{r.name}</td>
                            <td>{r.house_number}</td>
                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {(parseFloat(r.split_number) || 1.0).toFixed(1)}
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                              {formatCurrency(payable)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon="bi-people" message="No verified residents found to allocate contributions." />
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {/* ── Confirm Save Modal ── */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}
        title={<><i className="bi bi-exclamation-circle" style={{ marginRight: 8, color: 'var(--warning)' }}></i>Confirm Save</>}
        footer={
          <>
            <button className="btn btn-outline-accent" onClick={() => setShowConfirmModal(false)}>
              <i className="bi bi-x-lg"></i> Cancel
            </button>
            <button className="btn btn-accent" onClick={handleSave}>
              <i className="bi bi-check-lg"></i> Confirm
            </button>
          </>
        }>
        <p style={{ fontSize: 15, marginBottom: 16, fontWeight: 500 }}>
          Are you sure you want to save this expenditure and contribution allocation?
        </p>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 6 }}>📅 <strong>Period:</strong> {formatDate(fromDate)} — {formatDate(toDate)}</div>
          <div style={{ marginBottom: 6 }}>📦 <strong>Categories:</strong> {categories.length}</div>
          <div style={{ marginBottom: 6 }}>💰 <strong>Total Amount:</strong> {formatCurrency(totalAmount)}</div>
          <div>🏠 <strong>Houses Included:</strong> {residents.length} houses</div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

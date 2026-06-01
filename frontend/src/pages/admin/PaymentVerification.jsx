/**
 * PaymentVerification.jsx
 * -----------------------
 * Admin page: View billing periods, view detailed category breakdowns,
 * filter resident payment statuses, review receipt attachments, and verify payments.
 * Polls every 15s to catch newly uploaded receipts or updated billing periods.
 */

import { useState, useCallback, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { GlassCard, Alert, EmptyState, StatusBadge, Modal } from '../../components/ui';
import { getPayments, verifyPayment } from '../../services/paymentService';
import { getExpenditures } from '../../services/expenseService';
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

export default function PaymentVerification() {
  const [payments, setPayments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [residents, setResidents] = useState([]);
  const [alert, setAlert] = useState(null);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [processing, setProcessing] = useState(null); // payment id being processed

  // Navigation State
  const [activeExp, setActiveExp] = useState(null);

  // Filters State (Landing Overview Page)
  const [availableYears, setAvailableYears] = useState([]);
  const [availableRanges, setAvailableRanges] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedRange, setSelectedRange] = useState('');

  // Details Page Filter State
  const [detailStatus, setDetailStatus] = useState('All');

  // Confirmation Modal Target
  const [confirmAction, setConfirmAction] = useState(null); // { paymentId, action, residentName, amount }

  const fetchPayments = useCallback(async () => {
    const { ok, data } = await getPayments();
    if (ok) setPayments(data);
  }, []);

  const fetchExpenditures = useCallback(async () => {
    const { ok, data } = await getExpenditures();
    if (ok) setExpenditures(data);
  }, []);

  const fetchResidents = useCallback(async () => {
    const { ok, data } = await getVerifiedResidents();
    if (ok) setResidents(data);
  }, []);

  const fetchAllData = useCallback(() => {
    fetchPayments();
    fetchExpenditures();
    fetchResidents();
  }, [fetchPayments, fetchExpenditures, fetchResidents]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Poll for receipts and billing updates
  usePolling(() => {
    fetchPayments();
    fetchExpenditures();
  }, 15000);

  // Extract unique years from fetched expenditure records (only verified/sent ones)
  useEffect(() => {
    const yrs = new Set();
    expenditures.forEach(exp => {
      if (exp.from_date && exp.bill_sent) {
        yrs.add(exp.from_date.split('-')[0]);
      }
    });
    setAvailableYears(Array.from(yrs).sort((a, b) => b - a));
  }, [expenditures]);

  // Extract unique date ranges for the selected year
  useEffect(() => {
    if (!selectedYear) {
      setAvailableRanges([]);
      return;
    }
    const rngMap = new Map();
    expenditures.forEach(exp => {
      if (exp.from_date && exp.to_date && exp.bill_sent) {
        const yr = exp.from_date.split('-')[0];
        if (yr === selectedYear) {
          const key = `${exp.from_date}_${exp.to_date}`;
          if (!rngMap.has(key)) {
            rngMap.set(key, { from_date: exp.from_date, to_date: exp.to_date });
          }
        }
      }
    });
    setAvailableRanges(Array.from(rngMap.values()));
  }, [selectedYear, expenditures]);

  // Sync details page active expenditure references if it updates in background
  useEffect(() => {
    if (activeExp) {
      const updated = expenditures.find(x => x.id === activeExp.id);
      if (updated) setActiveExp(updated);
    }
  }, [expenditures, activeExp]);

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedRange('');
  };

  const resetFilters = () => {
    setSelectedYear('');
    setSelectedRange('');
  };

  const handleVerify = async (paymentId, action) => {
    setProcessing(paymentId);
    const { ok, data } = await verifyPayment(paymentId, action);
    if (ok) {
      setAlert({ message: data.message || `Payment ${action}d`, type: 'success' });
      // Immediately re-fetch
      fetchAllData();
    } else {
      setAlert({ message: data.error || 'Action failed', type: 'danger' });
    }
    setProcessing(null);
  };

  // Dynamically filter expenditures on the landing page (only verified/sent ones)
  const filteredExpenditures = expenditures.filter(exp => {
    if (!exp.bill_sent) return false;
    if (selectedYear && exp.from_date) {
      const yr = exp.from_date.split('-')[0];
      if (yr !== selectedYear) return false;
    }
    if (selectedRange && exp.from_date && exp.to_date) {
      const [from, to] = selectedRange.split('_');
      if (exp.from_date !== from || exp.to_date !== to) return false;
    }
    return true;
  });

  // Filter payments associated with active detailed expenditure
  const activeExpPayments = activeExp
    ? payments.filter(p => p.expenditure_id === activeExp.id)
    : [];

  // Filter payments by detail tab status
  const filteredExpPayments = activeExpPayments.filter(p => {
    if (detailStatus === 'All') return true;
    if (detailStatus === 'Pending') {
      return !p.verified && p.status !== 'rejected';
    }
    if (detailStatus === 'Verified') {
      return p.verified;
    }
    if (detailStatus === 'Rejected') {
      return p.status === 'rejected';
    }
    return true;
  });

  return (
    <DashboardLayout title="Payment Verification" showBackLink={true} backPath="/admin/dashboard">
      <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

      {activeExp === null ? (
        /* ─── STAGE 1: OVERVIEW PAGE ─── */
        <>
          {/* Filter Bar */}
          {expenditures.length > 0 && (
            <div className="filter-bar mb-4" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.03)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  <i className="bi bi-calendar3" style={{ marginRight: 4 }}></i>Filter by Year
                </label>
                <select className="form-select" value={selectedYear} onChange={(e) => handleYearChange(e.target.value)} style={{ fontSize: '13px' }}>
                  <option value="">All Years</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  <i className="bi bi-funnel" style={{ marginRight: 4 }}></i>Date Range
                </label>
                <select className="form-select" value={selectedRange} disabled={!selectedYear} onChange={(e) => setSelectedRange(e.target.value)} style={{ fontSize: '13px' }}>
                  <option value="">{selectedYear ? 'All Ranges' : 'Select year first'}</option>
                  {availableRanges.map((r, idx) => (
                    <option key={idx} value={`${r.from_date}_${r.to_date}`}>
                      {formatDate(r.from_date)} — {formatDate(r.to_date)}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedYear || selectedRange) && (
                <div style={{ alignSelf: 'flex-end' }}>
                  <button className="btn btn-outline-accent btn-sm" onClick={resetFilters} style={{ padding: '8px 14px' }}>
                    <i className="bi bi-x-circle"></i> Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}

          <GlassCard style={{ padding: 24 }}>
            {expenditures.filter(exp => exp.bill_sent).length === 0 ? (
              <EmptyState icon="bi-receipt" message="No expenditures to verify yet" />
            ) : filteredExpenditures.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="table-custom">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Total Amount</th>
                      <th>Bill Created Date</th>
                      <th style={{ width: 140, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenditures.map(exp => (
                      <tr key={exp.id}>
                        <td style={{ fontWeight: 600 }}>
                          {formatDate(exp.from_date)} — {formatDate(exp.to_date)}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {formatCurrency(exp.total_amount)}
                        </td>
                        <td>{formatDate(exp.created_at || exp.from_date)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-accent btn-sm"
                            onClick={() => { setActiveExp(exp); setDetailStatus('All'); }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="bi-funnel" message="No matching billing periods found for the selected filters." />
            )}
          </GlassCard>
        </>
      ) : (
        /* ─── STAGE 2: DETAILED VERIFICATION PAGE ─── */
        <>
          {/* Back Header */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => { setActiveExp(null); setDetailStatus('All'); }}
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
              ← Back to Overview
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '22px', margin: 0 }}>
              Payment Verification Details
            </h2>
          </div>

          {/* Section 3: Summary Card */}
          <GlassCard className="mb-4" style={{ padding: 24 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 20, fontSize: '15px' }}>
              <i className="bi bi-info-circle" style={{ marginRight: 8, color: 'var(--info)' }}></i>
              Billing Period Summary
            </h5>
            <div className="row g-4">
              <div className="col-md-6">
                <div style={{ padding: 16, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', height: '100%' }}>
                  <div style={{ marginBottom: 12 }}>
                    <small style={{ color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600 }}>Billing Period</small>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>{formatDate(activeExp.from_date)} — {formatDate(activeExp.to_date)}</span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <small style={{ color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600 }}>Total Houses Included</small>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>{activeExp.total_houses} Houses</span>
                  </div>
                  <div>
                    <small style={{ color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600 }}>Total Amount</small>
                    <span style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary)' }}>{formatCurrency(activeExp.total_amount)}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div style={{ padding: 16, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', height: '100%' }}>
                  <small style={{ color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600, marginBottom: 12 }}>Category Breakdown</small>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeExp.categories && activeExp.categories.map((c, i) => {
                      const displayLabel = getCategoryLabel(c.category, c.custom_category);
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{displayLabel}</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(c.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Section 4: Resident Verification Table */}
          <GlassCard style={{ padding: 24 }}>
            <div className="d-flex justify-between items-center mb-4 flex-wrap gap-3">
              <h5 style={{ fontWeight: 700, margin: 0, fontSize: '15px' }}>
                <i className="bi bi-people" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                Resident Payments
              </h5>
              {/* Status Filter Tab Group */}
              <div className="btn-group" role="group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                {['All', 'Pending', 'Verified', 'Rejected'].map(status => (
                  <button
                    key={status}
                    type="button"
                    className={`btn btn-sm ${detailStatus === status ? 'btn-accent' : 'btn-link text-secondary'}`}
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 14px',
                      fontWeight: 600,
                      border: 'none',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s',
                    }}
                    onClick={() => setDetailStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {filteredExpPayments.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="table-custom">
                  <thead>
                    <tr>
                      <th>Resident Name</th>
                      <th>Flat Number</th>
                      <th>Amount Payable</th>
                      <th>Status</th>
                      <th>Receipt</th>
                      <th style={{ width: 180, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpPayments.map(p => {
                      const resident = residents.find(r => r.id === p.resident_id);
                      const contributionFactor = resident ? parseFloat(resident.split_number) || 1.0 : 1.0;
                      const payable = p.split_amount * contributionFactor;
                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.resident_name || `#${p.resident_id}`}</td>
                          <td>{p.house_number || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(payable)}</td>
                          <td>
                            <StatusBadge status={p.verified ? 'verified' : p.status} />
                          </td>
                          <td>
                            {p.receipt_image ? (
                              <button
                                className="btn btn-outline-accent btn-sm"
                                onClick={() => setViewReceipt(p.receipt_image)}
                                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600 }}
                              >
                                <i className="bi bi-eye" style={{ marginRight: 4 }}></i>
                                View Receipt
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No receipt</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!p.verified && p.status === 'paid' && (
                              <div className="d-flex gap-2 justify-content-center">
                                <button
                                  className="btn btn-success btn-sm"
                                  disabled={processing === p.id}
                                  onClick={() => setConfirmAction({
                                    paymentId: p.id,
                                    action: 'approve',
                                    residentName: p.resident_name || `#${p.resident_id}`,
                                    amount: payable
                                  })}
                                >
                                  <i className="bi bi-check-lg"></i> Approve
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  disabled={processing === p.id}
                                  onClick={() => setConfirmAction({
                                    paymentId: p.id,
                                    action: 'reject',
                                    residentName: p.resident_name || `#${p.resident_id}`,
                                    amount: payable
                                  })}
                                >
                                  <i className="bi bi-x-lg"></i> Reject
                                </button>
                              </div>
                            )}
                            {p.verified && (
                              <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>
                                <i className="bi bi-patch-check"></i> Verified
                              </span>
                            )}
                            {p.status === 'rejected' && (
                              <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>
                                <i className="bi bi-x-circle"></i> Rejected
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="bi-funnel" message="No matching payments found for this status filter." />
            )}
          </GlassCard>
        </>
      )}

      {/* Receipt Viewer Modal */}
      <Modal isOpen={!!viewReceipt} onClose={() => setViewReceipt(null)} title="Payment Receipt">
        {viewReceipt && (
          <div className="text-center">
            <img src={`/${viewReceipt}`} alt="Receipt" style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)' }} />
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal 
        isOpen={!!confirmAction} 
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.action === 'approve'
            ? <><i className="bi bi-check-circle" style={{ marginRight: 8, color: 'var(--success)' }}></i>Approve Payment</>
            : <><i className="bi bi-x-circle" style={{ marginRight: 8, color: 'var(--danger)' }}></i>Reject Payment</>
        }
        footer={
          <>
            <button className="btn btn-outline-accent" onClick={() => setConfirmAction(null)} disabled={processing === confirmAction?.paymentId}>Cancel</button>
            <button 
              className={`btn ${confirmAction?.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
              onClick={() => {
                handleVerify(confirmAction.paymentId, confirmAction.action);
                setConfirmAction(null);
              }}
              disabled={processing === confirmAction?.paymentId}>
              {processing === confirmAction?.paymentId ? <InlineSpinner /> : null}
              Confirm
            </button>
          </>
        }>
        <p style={{ fontSize: '15px' }}>
          Are you sure you want to <strong>{confirmAction?.action}</strong> this payment of <strong>{formatCurrency(confirmAction?.amount || 0)}</strong> from <strong>{confirmAction?.residentName}</strong>?
        </p>
      </Modal>
    </DashboardLayout>
  );
}

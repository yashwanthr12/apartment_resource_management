/**
 * ResidentList.jsx (Send Bills)
 * -----------------------------
 * Admin page: Select expenditure → preview resident contributions → generate bills.
 * Features automated split calculations based on stored resident factors,
 * internal table pagination, and confirmed batch billing workflows.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { GlassCard, Alert, EmptyState, Modal, InlineSpinner } from '../../components/ui';
import { getVerifiedResidents } from '../../services/adminService';
import { getExpenditures } from '../../services/expenseService';
import { generateBillsFromExpenditure } from '../../services/billService';
import { usePolling } from '../../hooks/usePolling';
import { formatCurrency, formatDate } from '../../utils/format';

export default function ResidentList() {
  const navigate = useNavigate();
  const [residents, setResidents] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [selectedExp, setSelectedExp] = useState(null);
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState(null);
  
  // Modal & Pagination States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    const [resRes, expRes] = await Promise.all([
      getVerifiedResidents(),
      getExpenditures(),
    ]);
    if (resRes.ok) setResidents(resRes.data);
    if (expRes.ok) {
      // Filter out already billed expenditures to prevent accidental duplicates
      const unbilled = expRes.data.filter(x => !x.bill_sent);
      setExpenditures(unbilled);
      // Keep selected expenditure reference in sync if it updates
      if (selectedExp) {
        const updated = unbilled.find(x => x.id === selectedExp.id);
        setSelectedExp(updated || null);
      }
    }
  }, [selectedExp]);

  usePolling(fetchData, 15000);

  // Reset page number on expenditure change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedExp]);

  // Send bills to all listed residents after modal confirmation
  const handleConfirmSendBills = async () => {
    if (!selectedExp) {
      setAlert({ message: 'Please select an expenditure', type: 'warning' });
      return;
    }
    if (residents.length === 0) {
      setAlert({ message: 'No verified residents found to bill', type: 'warning' });
      return;
    }

    setShowConfirmModal(false);
    setSending(true);
    setAlert(null);

    const residentIds = residents.map(r => r.id);
    const { ok, data } = await generateBillsFromExpenditure(selectedExp.id, residentIds);

    if (ok) {
      setAlert({ message: data.message || 'Bills generated successfully!', type: 'success' });
      // Reset selected expenditure since it is now billed!
      setSelectedExp(null);
      // Refresh expenditures immediately to pull the new unbilled list!
      fetchData();
    } else {
      setAlert({ message: data.error || 'Failed to generate bills', type: 'danger' });
    }
    setSending(false);
  };

  // Navigate to edit expenditure
  const handleEditExpenditure = (exp) => {
    navigate('/admin/add-expense', { state: { editExpenditure: exp } });
  };

  // Pagination Math
  const itemsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(residents.length / itemsPerPage));
  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentResidents = residents.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <DashboardLayout title="Bill Distribution" showBackLink={true} backPath="/admin/dashboard">
      <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

      <div className="row d-flex align-items-stretch g-4">
        {/* Expenditure Selection */}
        <div className="col-lg-4">
          <GlassCard style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h5 style={{ fontWeight: 700, marginBottom: 16, fontSize: '15px' }}>
              <i className="bi bi-receipt" style={{ marginRight: 8, color: 'var(--info)' }}></i>Select Expenditure
            </h5>
            {expenditures.length > 0 ? (
              <div className="mb-3">
                <select
                  className="form-select"
                  value={selectedExp ? selectedExp.id : ''}
                  onChange={(e) => {
                    const expId = parseInt(e.target.value);
                    const found = expenditures.find(x => x.id === expId);
                    setSelectedExp(found || null);
                  }}
                  style={{ fontSize: '13px', padding: '10px 14px' }}>
                  <option value="">-- Choose Expenditure --</option>
                  {expenditures.map(exp => (
                    <option key={exp.id} value={exp.id}>
                      {formatDate(exp.from_date)} — {formatDate(exp.to_date)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <EmptyState icon="bi-inbox" message="No expenditures yet. Add one first." />
            )}

            {selectedExp && (
              <div className="preview-details-card mt-3" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h6 style={{ fontWeight: 700, marginBottom: 12, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <i className="bi bi-eye" style={{ marginRight: 6 }}></i>Expenditure Preview
                </h6>
                
                {/* Categories with amount */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {selectedExp.categories && selectedExp.categories.map((c, i) => {
                    const catName = c.category === 'other' && c.custom_category ? c.custom_category : c.category;
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ opacity: 0.8, textTransform: 'capitalize' }}>
                          {catName}
                          {c.units_used ? ` (${c.units_used} ${c.unit_type || ''})` : ''}
                        </span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(c.amount)}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="split-result-divider" style={{ margin: '10px 0' }}></div>
                
                {/* Total Expenditure */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <span>Total Expenditure Amount</span>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>{formatCurrency(selectedExp.total_amount)}</span>
                </div>

                {/* Edit Button */}
                <div className="mt-3">
                  <button 
                    className="btn btn-outline-accent btn-sm btn-w-full" 
                    onClick={() => handleEditExpenditure(selectedExp)}>
                    <i className="bi bi-pencil-square"></i> Edit Expenditure
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Resident Payment Preview */}
        <div className="col-lg-8">
          <GlassCard style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 style={{ fontWeight: 700, margin: 0, fontSize: '15px' }}>
                  <i className="bi bi-people" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                  Resident Payment Preview
                </h5>
                <button 
                  className="btn btn-accent btn-sm" 
                  onClick={() => setShowConfirmModal(true)}
                  disabled={sending || !selectedExp || residents.length === 0}>
                  {sending ? <><InlineSpinner /> Sending...</> : <><i className="bi bi-send" style={{ marginRight: 6 }}></i>Send Bills</>}
                </button>
              </div>

              {selectedExp ? (
                residents.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table-custom">
                      <thead>
                        <tr>
                          <th>Resident Name</th>
                          <th>Flat Number</th>
                          <th>Contribution Factor</th>
                          <th style={{ textAlign: 'right' }}>Amount To Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentResidents.map(r => {
                          const amountToPay = selectedExp.per_person_amount * (parseFloat(r.split_number) || 1.0);
                          return (
                            <tr key={r.id}>
                              <td style={{ fontWeight: 600 }}>{r.name}</td>
                              <td>{r.house_number}</td>
                              <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                {(parseFloat(r.split_number) || 1.0).toFixed(1)}
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                                {formatCurrency(amountToPay)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon="bi-people" message="No verified residents yet" />
                )
              ) : (
                <EmptyState icon="bi-receipt" message="Please select an expenditure to preview contributions" />
              )}
            </div>

            {/* Pagination Controls */}
            {selectedExp && residents.length > itemsPerPage && (
              <div className="d-flex justify-content-center align-items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)', width: '100%' }}>
                <button
                  className="btn btn-outline-accent btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="bi bi-chevron-left"></i> Previous
                </button>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-outline-accent btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Next <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* ── Confirm Send Bills Modal ── */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}
        title={<><i className="bi bi-exclamation-circle" style={{ marginRight: 8, color: 'var(--warning)' }}></i>Confirm Send Bills</>}
        footer={
          <>
            <button className="btn btn-outline-accent" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </button>
            <button className="btn btn-accent" onClick={handleConfirmSendBills}>
              Send Bills
            </button>
          </>
        }>
        <p style={{ fontSize: 15, marginBottom: 0, fontWeight: 500 }}>
          Are you sure you want to send bills to all listed residents?
        </p>
      </Modal>
    </DashboardLayout>
  );
}

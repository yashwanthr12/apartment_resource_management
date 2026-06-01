/**
 * ResidentDetails.jsx
 * -------------------
 * Admin page displaying details for a single verified resident, 
 * including Contribution Factor Configuration and access deactivation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { GlassCard, Alert, Modal, InlineSpinner } from '../../components/ui';
import { getResidentDetails, updateResidentSplit, deactivateResidentAccess } from '../../services/adminService';

export default function ResidentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Contribution Factor State (text input for manual entry)
  const [splitNumberText, setSplitNumberText] = useState('1.0');
  const [savingSplit, setSavingSplit] = useState(false);

  // Deactivation States
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const fetchResident = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await getResidentDetails(id);
    if (ok) {
      setResident(data);
      setSplitNumberText(data.split_number !== undefined ? String(data.split_number) : '1.0');
    } else {
      setAlert({ message: data.error || 'Failed to load resident details', type: 'danger' });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchResident();
  }, [fetchResident]);

  const handleSaveSplit = async () => {
    // Client-side validations: positive numeric values only
    const parsed = parseFloat(splitNumberText);
    if (isNaN(parsed) || parsed <= 0) {
      setAlert({ message: 'Please enter a valid positive contribution factor.', type: 'danger' });
      return;
    }

    setSavingSplit(true);
    setAlert(null);
    const { ok, data } = await updateResidentSplit(id, parsed);
    if (ok) {
      setAlert({ message: 'Contribution factor saved successfully.', type: 'success' });
      setResident(data.resident);
      setSplitNumberText(String(data.resident.split_number));
    } else {
      setAlert({ message: data.error || 'Failed to save contribution factor.', type: 'danger' });
    }
    setSavingSplit(false);
  };

  const handleDeactivateAccess = async () => {
    if (confirmText !== 'DEACTIVATE') return;
    setDeactivating(true);
    setAlert(null);
    const { ok, data } = await deactivateResidentAccess(id);
    if (ok) {
      // Show success on the parent view, navigate back
      navigate('/admin/residents-mgmt', { 
        state: { alertMessage: 'Resident access deactivated successfully. All historical records remain preserved.', alertType: 'success' } 
      });
    } else {
      setAlert({ message: data.error || 'Failed to deactivate resident access.', type: 'danger' });
      setDeactivateModalOpen(false);
      setConfirmText('');
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Resident Details"
        showBackLink={true}
        backPath="/admin/residents-mgmt"
        backText="← Back to Residents"
      >
        <div className="d-flex justify-center items-center" style={{ minHeight: '300px' }}>
          <InlineSpinner /> Loading resident details...
        </div>
      </DashboardLayout>
    );
  }

  if (!resident) {
    return (
      <DashboardLayout
        title="Resident Details"
        showBackLink={true}
        backPath="/admin/residents-mgmt"
        backText="← Back to Residents"
      >
        <Alert message={alert?.message || 'Resident not found'} type="danger" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={`Resident Profile: ${resident.name}`}
      showBackLink={true}
      backPath="/admin/residents-mgmt"
      backText="← Back to Residents"
    >
      <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

      <div className="row">
        {/* Profile / Resident Information Card */}
        <div className="col-lg-6 mb-4">
          <GlassCard style={{ padding: 28, height: '100%' }}>
            <div className="mb-4">
              <h4 style={{ fontWeight: 800, margin: 0, fontSize: '18px' }}>Verified Resident Profile</h4>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: 4 }}>{resident.name}</div>
            </div>

            <div className="split-result-divider" style={{ margin: '20px 0' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Name</span>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{resident.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Email Address</span>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{resident.email}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Apartment Name</span>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{resident.apartment_name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Flat Number</span>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{resident.house_number}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>Account Status</span>
                <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bi bi-check-circle-fill"></i> ✓ Verified
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Contribution Factor Configuration */}
        <div className="col-lg-6 mb-4">
          <GlassCard style={{ padding: 28, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h5 style={{ fontWeight: 700, marginBottom: 6, fontSize: '15px' }}>
                <i className="bi bi-calculator" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
                Contribution Factor Configuration
              </h5>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 20 }}>
                Configure the resident's contribution factor used for future bill calculations.
              </p>

              <div className="mb-4">
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 12 }}>
                  Contribution Factor
                </label>
                <input 
                  type="number" 
                  step="any"
                  className="form-control" 
                  placeholder="e.g. 1.0, 1.5, 0.75" 
                  value={splitNumberText} 
                  onChange={(e) => setSplitNumberText(e.target.value)}
                  style={{ fontSize: '13.5px', padding: '10px 14px' }}
                />
              </div>
            </div>

            <div>
              <div className="split-result-divider" style={{ margin: '20px 0' }}></div>
              <div className="d-flex gap-3 justify-end">
                <button 
                  className="btn btn-accent" 
                  onClick={handleSaveSplit}
                  disabled={savingSplit}
                >
                  {savingSplit ? <><InlineSpinner /> Saving...</> : <><i className="bi bi-save" style={{ marginRight: 6 }}></i> Save Contribution Factor</>}
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Access Deactivation Card */}
      <div className="row mt-2">
        <div className="col-12">
          <GlassCard 
            style={{ 
              padding: 28, 
              border: '1px solid var(--warning-border)', 
              background: 'rgba(217, 119, 6, 0.02)',
              borderRadius: 'var(--radius-lg)' 
            }}
          >
            <div className="d-flex flex-column flex-md-row justify-between items-md-center gap-4">
              <div>
                <h5 style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 6, fontSize: '15px' }}>
                  <i className="bi bi-shield-lock" style={{ marginRight: 8 }}></i>
                  Access Management: Deactivate Resident Access
                </h5>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Temporarily remove this resident's login access. Historical billing, payments, verified bills, receipts, and analytics records remain fully preserved in the database.
                </p>
              </div>
              <button 
                className="btn btn-outline-accent d-flex items-center gap-2" 
                onClick={() => setDeactivateModalOpen(true)}
                style={{ 
                  alignSelf: 'flex-start',
                  borderColor: 'var(--warning)',
                  color: 'var(--warning)',
                  background: 'none'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(217, 119, 6, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'none';
                }}
              >
                <i className="bi bi-shield-slash"></i> Deactivate Resident Access
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Access Deactivation Confirmation Modal */}
      <Modal 
        isOpen={deactivateModalOpen} 
        onClose={() => { setDeactivateModalOpen(false); setConfirmText(''); }}
        title={
          <div className="d-flex items-center gap-2 text-warning">
            <i className="bi bi-exclamation-triangle"></i>
            <span>Confirm Access Deactivation</span>
          </div>
        }
        footer={
          <>
            <button 
              className="btn btn-outline-accent" 
              onClick={() => { setDeactivateModalOpen(false); setConfirmText(''); }} 
              disabled={deactivating}
            >
              Cancel
            </button>
            <button 
              className="btn btn-warning" 
              onClick={handleDeactivateAccess} 
              disabled={deactivating || confirmText !== 'DEACTIVATE'}
              style={{ color: '#fff' }}
            >
              {deactivating ? <InlineSpinner /> : null}
              Confirm Deactivation
            </button>
          </>
        }
      >
        <p style={{ fontSize: '14px', marginBottom: 12, fontWeight: 600 }}>
          This action will deactivate the resident's login access.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 16 }}>
          All historical billing, payment, and resident records will remain preserved. The resident will no longer be able to access the system until approved again.
        </p>
        
        <div className="mb-3" style={{ background: 'var(--bg-muted)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
            Type <span className="text-warning" style={{ fontWeight: 700 }}>DEACTIVATE</span> to confirm:
          </label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="DEACTIVATE" 
            value={confirmText} 
            onChange={(e) => setConfirmText(e.target.value)}
            style={{ fontSize: '13px', padding: '8px 12px' }}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}

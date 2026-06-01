/**
 * ResidentsMgmt.jsx
 * -----------------
 * Admin page to manage all apartment residents (Pending and Verified).
 * Moved from sidebar to profile dropdown, featuring clean tables, 
 * details triggers, and verification workflows.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { GlassCard, Alert, EmptyState, Modal, InlineSpinner, StatusBadge } from '../../components/ui';
import { getPendingResidents, verifyResident, rejectResident, getVerifiedResidents } from '../../services/adminService';
import { usePolling } from '../../hooks/usePolling';
import { formatDate } from '../../utils/format';

export default function ResidentsMgmt() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState([]);
  const [verified, setVerified] = useState([]);
  const [alert, setAlert] = useState(null);

  // Handle alerts passed via route navigation state
  useEffect(() => {
    if (location.state?.alertMessage) {
      setAlert({
        message: location.state.alertMessage,
        type: location.state.alertType || 'success'
      });
      // Clear alert from history state
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);
  
  // Pending actions Target (Verify / Reject)
  const [actionTarget, setActionTarget] = useState(null); // { resident, action }
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    const [pendingRes, verifiedRes] = await Promise.all([
      getPendingResidents(),
      getVerifiedResidents(),
    ]);
    if (pendingRes.ok) setPending(pendingRes.data);
    if (verifiedRes.ok) setVerified(verifiedRes.data);
  }, []);

  // Poll for new registrations and changes every 15s
  usePolling(fetchData, 15000);

  const handleAction = async () => {
    if (!actionTarget) return;
    setProcessing(true);
    const { resident, action } = actionTarget;

    let result;
    if (action === 'verify') {
      result = await verifyResident(resident.id);
    } else {
      result = await rejectResident(resident.id);
    }

    if (result.ok) {
      setAlert({
        message: result.data.message || `Resident ${action === 'verify' ? 'verified' : 'rejected'}`,
        type: 'success',
      });
      // Immediately re-fetch to update lists
      fetchData();
    } else {
      setAlert({ message: result.data.error || 'Action failed', type: 'danger' });
    }
    setActionTarget(null);
    setProcessing(false);
  };

  return (
    <DashboardLayout title="Resident Management" showBackLink={true}>
      <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

      {/* Verified Residents Section */}
      <GlassCard style={{ padding: 28 }}>
        <div className="d-flex justify-between items-center mb-3">
          <h5 style={{ fontWeight: 700, margin: 0, fontSize: '15px' }}>
            Verified Residents
            {verified.length > 0 && (
              <span className="badge badge-verified" style={{ marginLeft: 10, fontSize: 11 }}>
                {verified.length}
              </span>
            )}
          </h5>
        </div>

        {verified.length > 0 ? (
          <table className="table-custom">
            <thead>
              <tr>
                <th>Resident Name</th>
                <th>Email Address</th>
                <th>Flat Number</th>
                <th>Contribution Factor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {verified.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.house_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.split_number}</td>
                  <td>
                    <StatusBadge status="verified" />
                  </td>
                  <td>
                    <button className="btn btn-outline-accent btn-sm" onClick={() => navigate(`/admin/residents-mgmt/${r.id}`)}>
                      <i className="bi bi-eye" style={{ marginRight: 4 }}></i> View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon="bi-people" message="No verified residents yet." />
        )}
      </GlassCard>

      {/* Pending Residents Section */}
      <GlassCard style={{ padding: 28, marginTop: 24 }}>
        <div className="d-flex justify-between items-center mb-3">
          <h5 style={{ fontWeight: 700, margin: 0, fontSize: '15px' }}>
            Pending Residents
            {pending.length > 0 && (
              <span className="badge badge-pending" style={{ marginLeft: 10, fontSize: 11 }}>
                {pending.length}
              </span>
            )}
          </h5>
        </div>

        {pending.length > 0 ? (
          <table className="table-custom">
            <thead>
              <tr>
                <th>Resident Name</th>
                <th>Email Address</th>
                <th>Flat Number</th>
                <th>Registration Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.house_number}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</td>
                  <td>
                    <span className="badge badge-pending" style={{ fontSize: 11 }}>
                      <i className="bi bi-hourglass-split" style={{ marginRight: 4 }}></i>
                      Pending Verification
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-success btn-sm"
                        onClick={() => setActionTarget({ resident: r, action: 'verify' })}>
                        <i className="bi bi-check-lg"></i> Verify
                      </button>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => setActionTarget({ resident: r, action: 'reject' })}>
                        <i className="bi bi-x-lg"></i> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon="bi-person-check" message="No pending registrations. All residents have been verified." />
        )}
      </GlassCard>

      {/* Confirm Modal for Verify/Reject */}
      <Modal isOpen={!!actionTarget} onClose={() => setActionTarget(null)}
        title={
          actionTarget?.action === 'verify'
            ? <><i className="bi bi-check-circle" style={{ marginRight: 8, color: 'var(--success)' }}></i>Verify Resident</>
            : <><i className="bi bi-x-circle" style={{ marginRight: 8, color: 'var(--danger)' }}></i>Reject Resident</>
        }
        footer={
          <>
            <button className="btn btn-outline-accent" onClick={() => setActionTarget(null)} disabled={processing}>Cancel</button>
            <button
              className={`btn ${actionTarget?.action === 'verify' ? 'btn-success' : 'btn-danger'}`}
              onClick={handleAction} disabled={processing}>
              {processing ? <InlineSpinner /> : null}
              {actionTarget?.action === 'verify' ? 'Verify' : 'Reject'}
            </button>
          </>
        }>
        <p>
          {actionTarget?.action === 'verify'
            ? <>Are you sure you want to verify <strong>{actionTarget?.resident?.name}</strong>? They will be able to log in.</>
            : <>Are you sure you want to reject <strong>{actionTarget?.resident?.name}</strong>? Their registration will be deleted.</>
          }
        </p>
      </Modal>
    </DashboardLayout>
  );
}

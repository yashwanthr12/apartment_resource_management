/**
 * VerifyResidents.jsx
 * --------------------
 * Admin page to verify or reject pending resident registrations.
 * Polls every 15s for new registrations.
 */

import { useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { GlassCard, Alert, EmptyState, Modal, InlineSpinner } from '../../components/ui';
import { getPendingResidents, verifyResident, rejectResident, getVerifiedResidents, softDeleteResident } from '../../services/adminService';
import { usePolling } from '../../hooks/usePolling';
import { formatDate } from '../../utils/format';

export default function VerifyResidents() {
  const [pending, setPending] = useState([]);
  const [verified, setVerified] = useState([]);
  const [alert, setAlert] = useState(null);
  
  // Pending actions Target (Verify / Reject)
  const [actionTarget, setActionTarget] = useState(null); // { resident, action }
  const [processing, setProcessing] = useState(false);

  // Soft Delete Target
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

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
      // Immediately re-fetch to update the list
      fetchData();
    } else {
      setAlert({ message: result.data.error || 'Action failed', type: 'danger' });
    }
    setActionTarget(null);
    setProcessing(false);
  };

  const handleDeleteResident = async () => {
    if (!deleteTarget || deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    const { ok, data } = await softDeleteResident(deleteTarget.id);
    if (ok) {
      setAlert({ message: data.message || 'Resident access removed successfully', type: 'success' });
      fetchData();
    } else {
      setAlert({ message: data.error || 'Failed to remove resident access', type: 'danger' });
    }
    setDeleteTarget(null);
    setDeleteConfirmText('');
    setDeleting(false);
  };

  return (
    <DashboardLayout title={<><i className="bi bi-person-check" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Verify Residents</>}>
      <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

      <GlassCard style={{ padding: 28 }}>
        <div className="d-flex justify-between items-center mb-3">
          <h5 style={{ fontWeight: 700, margin: 0, fontSize: '15px' }}>
            Pending Registrations
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
                <th>Name</th>
                <th>Email</th>
                <th>House No.</th>
                <th>Registered</th>
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

      {/* Verified Residents Card */}
      <GlassCard style={{ padding: 28, marginTop: 24 }}>
        <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '15px' }}>
          <i className="bi bi-people" style={{ marginRight: 8, color: 'var(--success)' }}></i>
          Verified Residents
          {verified.length > 0 && (
            <span className="badge badge-verified" style={{ marginLeft: 10, fontSize: 11 }}>
              {verified.length}
            </span>
          )}
        </h5>

        {verified.length > 0 ? (
          <table className="table-custom">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>House No.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {verified.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.house_number}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(r)}>
                      <i className="bi bi-trash"></i> Delete
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

      {/* Confirm Modal */}
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

      {/* Delete Resident Custom Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
        title={<><i className="bi bi-exclamation-triangle" style={{ marginRight: 8, color: 'var(--danger)' }}></i>Delete Resident Access</>}
        footer={
          <>
            <button className="btn btn-outline-accent" onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }} disabled={deleting}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleDeleteResident} disabled={deleting || deleteConfirmText !== 'DELETE'}>
              {deleting ? <InlineSpinner /> : null}
              Confirm Delete
            </button>
          </>
        }>
        <p>Are you sure you want to delete access for <strong>{deleteTarget?.name}</strong> (House {deleteTarget?.house_number})?</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          This is a soft delete. Their payment and billing records will be preserved in the database, but they will no longer be able to log in unless re-verified by the admin.
        </p>
        <div className="mb-3">
          <label className="form-label" style={{ fontWeight: 600 }}>Type <span style={{ color: 'var(--danger)' }}>DELETE</span> to confirm:</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="DELETE" 
            value={deleteConfirmText} 
            onChange={(e) => setDeleteConfirmText(e.target.value)} 
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}

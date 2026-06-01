/**
 * PaymentSettings.jsx
 * --------------------
 * Admin page to manage UPI, bank details, and QR code.
 * Rebranded as Billing Information with live preview for residents.
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { GlassCard, Alert, InlineSpinner } from '../../components/ui';
import { getPaymentSettings, updatePaymentSettings } from '../../services/adminService';

const FIELDS = ['upi_id','bank_name','account_holder_name','account_number','ifsc_code','branch_name'];

export default function PaymentSettings() {
  const [form, setForm] = useState({
    upi_id: '', bank_name: '', account_holder_name: '',
    account_number: '', ifsc_code: '', branch_name: '',
  });
  const [qrPreview, setQrPreview] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Load existing settings on mount
  useEffect(() => {
    (async () => {
      const { ok, data } = await getPaymentSettings();
      if (ok) {
        setForm({
          upi_id: data.upi_id || '',
          bank_name: data.bank_name || '',
          account_holder_name: data.account_holder_name || '',
          account_number: data.account_number || '',
          ifsc_code: data.ifsc_code || '',
          branch_name: data.branch_name || '',
        });
        if (data.qr_code) setQrPreview(`/${data.qr_code}`);

        // If no data exists, start in edit mode
        const hasData = FIELDS.some(f => data[f]);
        if (!hasData && !data.qr_code) setIsEditing(true);
      }
    })();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);

    const formData = new FormData();
    FIELDS.forEach(f => formData.append(f, f === 'ifsc_code' ? form[f].toUpperCase() : form[f]));
    if (qrFile) formData.append('qr_code', qrFile);

    const { ok, data } = await updatePaymentSettings(formData);

    if (ok) {
      setAlert({ message: 'Billing Information Updated Successfully', type: 'success' });
      if (data.settings?.qr_code) setQrPreview(`/${data.settings.qr_code}`);
      setIsEditing(false);
    } else {
      setAlert({ message: data.error || 'Failed to save Billing Information', type: 'danger' });
    }
    setSaving(false);
  };

  return (
    <DashboardLayout
      title="Billing Information"
      subtitle="Manage apartment billing details, payment collection information, and billing-related configurations."
      showBackLink={true}
      centered={true}
    >
      <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

      {/* Billing Details Card */}
      <GlassCard style={{ padding: 28 }}>
        <div className="d-flex justify-between items-center mb-4">
          <h5 style={{ fontWeight: 700, margin: 0, fontSize: '16px' }}>Billing Details</h5>
          <span className={`badge ${isEditing ? 'badge-pending' : 'badge-paid'}`}>
            <i className={`bi ${isEditing ? 'bi-unlock-fill' : 'bi-lock-fill'}`} style={{ marginRight: 4 }}></i>
            {isEditing ? 'Editing Enabled' : 'Locked'}
          </span>
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label className="form-label"><i className="bi bi-phone" style={{ marginRight: 4 }}></i>UPI ID</label>
            <input type="text" className="form-control" name="upi_id" placeholder="yourname@upi"
              disabled={!isEditing} value={form.upi_id} onChange={handleChange} />
          </div>

          <h6 style={{ fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', fontSize: '14px' }}>
            <i className="bi bi-bank" style={{ marginRight: 4 }}></i>Bank Details
          </h6>

          <div className="row mb-3">
            <div className="col-md-6 mb-3 mb-md-0">
              <label className="form-label">Bank Name</label>
              <input type="text" className="form-control" name="bank_name" placeholder="e.g. State Bank of India"
                disabled={!isEditing} value={form.bank_name} onChange={handleChange} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Account Holder Name</label>
              <input type="text" className="form-control" name="account_holder_name" placeholder="Full name as per bank"
                disabled={!isEditing} value={form.account_holder_name} onChange={handleChange} />
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6 mb-3 mb-md-0">
              <label className="form-label">Account Number</label>
              <input type="text" className="form-control" name="account_number" placeholder="e.g. 1234567890"
                disabled={!isEditing} value={form.account_number} onChange={handleChange} />
            </div>
            <div className="col-md-6">
              <label className="form-label">IFSC Code</label>
              <input type="text" className="form-control" name="ifsc_code" placeholder="e.g. SBIN0001234"
                disabled={!isEditing} value={form.ifsc_code} onChange={handleChange}
                style={{ textTransform: 'uppercase' }} />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Branch Name <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(optional)</span></label>
            <input type="text" className="form-control" name="branch_name" placeholder="e.g. MG Road Branch"
              disabled={!isEditing} value={form.branch_name} onChange={handleChange} />
          </div>

          <div className="mb-4">
            <label className="form-label"><i className="bi bi-qr-code" style={{ marginRight: 4 }}></i>QR Code Image</label>
            <input type="file" className="form-control" accept="image/*"
              disabled={!isEditing} onChange={(e) => setQrFile(e.target.files[0])} />
            {qrPreview && (
              <div className="mt-3">
                <img src={qrPreview} alt="QR Code" className="receipt-thumb" style={{ maxHeight: '120px', borderRadius: 'var(--radius-sm)' }} />
              </div>
            )}
          </div>

          <div className="d-flex gap-3">
            {!isEditing ? (
              <button type="button" className="btn btn-outline-accent" onClick={() => setIsEditing(true)}>
                <i className="bi bi-pencil-square"></i> Update Billing Information
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-outline-accent" onClick={() => setIsEditing(false)}>
                  <i className="bi bi-x-lg"></i> Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={saving}>
                  {saving ? <><InlineSpinner /> Saving...</> : <><i className="bi bi-save"></i> Save Billing Information</>}
                </button>
              </>
            )}
          </div>
        </form>
      </GlassCard>
    </DashboardLayout>
  );
}


/**
 * AdminAccount.jsx
 * ----------------
 * Admin account management page.
 * Allows viewing and editing profile details.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiPost } from '../../services/api';
import { Alert, InlineSpinner, GlassCard } from '../../components/ui';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function AdminAccount() {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    apartment_name: '',
    apartment_address: '',
    access_code: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Initialize form with current user details
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        apartment_name: user.apartment_name || '',
        apartment_address: user.apartment_address || '',
        access_code: user.access_code || ''
      });
    }
  }, [user, isEditing]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Normalization for access code (uppercase, alphanumeric only)
  const handleAccessCodeChange = (e) => {
    const rawVal = e.target.value;
    const sanitizedVal = rawVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setForm({ ...form, access_code: sanitizedVal });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAlert(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    const { ok, data } = await apiPost('/api/auth/update-profile', form);

    if (ok) {
      setAlert({ message: 'Profile details updated successfully.', type: 'success' });
      // Update session references in AuthContext
      login({ ...user, ...data.user });
      setIsEditing(false);
    } else {
      setAlert({ message: data.error || 'Failed to update profile.', type: 'danger' });
    }
    setLoading(false);
  };

  return (
    <DashboardLayout title="Account Information" subtitle="View and manage your administrator and apartment credentials" showBackLink={true} centered={true}>
      
      <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />
      
      <GlassCard style={{ padding: '32px' }}>
        <form onSubmit={handleSubmit} autoComplete="off">
          
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              name="name"
              required
              disabled={!isEditing}
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              name="email"
              required
              disabled={true}
              value={form.email}
              onChange={handleChange}
              placeholder="email@example.com"
              style={{ cursor: 'not-allowed', opacity: 0.75 }}
            />
            <div className="form-text" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Email address can only be changed from Settings.
            </div>
          </div>

          <div className="section-divider" style={{ margin: '24px 0' }}></div>

          <div className="mb-3">
            <label className="form-label">Apartment Name</label>
            <input
              type="text"
              className="form-control"
              name="apartment_name"
              required
              disabled={!isEditing}
              value={form.apartment_name}
              onChange={handleChange}
              placeholder="Sunrise Residency"
            />
            {isEditing && (
              <div className="form-text" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Updating the apartment name will cascade-update all resident dashboards, bills, and payment records automatically.
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">Apartment Address</label>
            <textarea
              className="form-control"
              name="apartment_address"
              required
              rows="3"
              disabled={!isEditing}
              value={form.apartment_address}
              onChange={handleChange}
              placeholder="123 Main Street, Bangalore"
              style={{ resize: 'none', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Admin Access Code</label>
            <input
              type="text"
              className="form-control"
              name="access_code"
              required
              disabled={true}
              value={form.access_code}
              onChange={handleAccessCodeChange}
              placeholder="e.g. APT123"
              style={{ cursor: 'not-allowed', opacity: 0.75 }}
            />
            <div className="form-text" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              This is the unique code residents enter during registration to connect with your apartment.
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-end" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            {isEditing ? (
              <>
                <button type="button" className="btn btn-outline-accent" onClick={handleCancel} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={loading}>
                  {loading ? <><InlineSpinner /> Saving...</> : <><i className="bi bi-check-circle"></i> Save</>}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-accent" onClick={() => setIsEditing(true)}>
                <i className="bi bi-pencil-square"></i> Edit Profile
              </button>
            )}
          </div>
          
        </form>
      </GlassCard>
    </DashboardLayout>
  );
}

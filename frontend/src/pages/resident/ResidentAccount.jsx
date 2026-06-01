/**
 * ResidentAccount.jsx
 * -------------------
 * Resident account management page.
 * Allows viewing and editing resident profile details.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiPost } from '../../services/api';
import { Alert, InlineSpinner, GlassCard } from '../../components/ui';
import AppNavbar from '../../components/layout/AppNavbar';

export default function ResidentAccount() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    house_number: '',
    apartment_name: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Initialize form with current resident details
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        house_number: user.house_number || '',
        apartment_name: user.apartment_name || ''
      });
    }
  }, [user, isEditing]);

  useEffect(() => {
    document.title = 'Account | ApartEase';
  }, []);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAlert(null);
  };

  const handleBack = (e) => {
    e.preventDefault();
    try {
      sessionStorage.setItem('profile-dropdown-open', 'true');
    } catch { /* noop */ }
    navigate(-1);
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
    <div className="landing-page">
      <AppNavbar />
      
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 20px', paddingTop: '92px' }} className="fade-in">
        
        {/* Page-level Back Link */}
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={handleBack}
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

        {/* Page Title & Subtitle */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontWeight: 700, marginBottom: 6, fontSize: 22, margin: 0 }}>Account Information</h2>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0 0', fontSize: '14px' }}>
            View and manage your resident profile information
          </p>
        </div>
          
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
                disabled
                value={form.apartment_name}
                placeholder="Apartment Name"
                style={{ background: 'var(--bg-muted)', cursor: 'not-allowed' }}
              />
              <div className="form-text" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Apartment connection can only be modified by registering a new resident profile.
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Flat Number</label>
              <input
                type="text"
                className="form-control"
                name="house_number"
                required
                disabled={!isEditing}
                value={form.house_number}
                onChange={handleChange}
                placeholder="e.g. A101"
              />
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
      </div>
    </div>
  );
}

/**
 * Navbar.jsx
 * ----------
 * Resident top navigation bar.
 * Shows user info (name, house number, apartment) and logout button.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const info = user
    ? `${user.name} • ${user.house_number || ''} • ${user.apartment_name}`
    : 'Loading...';

  return (
    <nav className="resident-topnav">
      <div>
        <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '17px' }}>
          🏠 ApartmentMS
        </h5>
      </div>
      <div className="d-flex items-center gap-3">
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{info}</span>
        <span className="badge badge-paid" style={{ fontSize: '12px', padding: '5px 14px' }}>
          <i className="bi bi-house-door" style={{ marginRight: 4 }}></i>Resident
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', fontSize: '13px',
            color: 'var(--danger)', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <i className="bi bi-box-arrow-left" style={{ marginRight: 4 }}></i>Logout
        </button>
      </div>
    </nav>
  );
}

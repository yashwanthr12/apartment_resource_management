/**
 * AppNavbar.jsx
 * --------------
 * Post-login top navigation bar for Admin and Resident dashboards.
 * Same visual style as the landing navbar (fixed, 64px, frosted glass).
 *
 * Props:
 *  - showSidebarToggle  (bool)  Show hamburger button (admin only)
 *  - onSidebarToggle    (fn)    Callback when hamburger is clicked
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ApartEaseLogo } from '../ui';

export default function AppNavbar({ showSidebarToggle = false, onSidebarToggle, onNavigate }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(() => {
    try {
      const saved = sessionStorage.getItem('profile-dropdown-open');
      if (saved === 'true') {
        sessionStorage.removeItem('profile-dropdown-open');
        return true;
      }
    } catch { /* noop */ }
    return false;
  });
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/');
  };

  const handleBrandClick = () => {
    try {
      sessionStorage.removeItem('profile-dropdown-open');
    } catch { /* noop */ }
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (user?.role === 'resident') {
      if (onNavigate) {
        onNavigate('dashboard');
      } else {
        navigate('/resident/dashboard', { state: { activeTab: 'dashboard' } });
      }
    } else {
      navigate('/');
    }
  };

  const displayName = user?.name || 'User';
  const displayDetail = user?.role === 'resident'
    ? `${user?.house_number || ''} ${user?.apartment_name ? '• ' + user.apartment_name : ''}`
    : user?.apartment_name || '';

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        {/* ── Left: Sidebar toggle + Brand ── */}
        <div className="app-navbar-left">
          {showSidebarToggle && (
            <button
              className="app-navbar-hamburger"
              onClick={onSidebarToggle}
              aria-label="Toggle sidebar"
            >
              <i className="bi bi-list"></i>
            </button>
          )}
          <div className="app-navbar-brand" onClick={handleBrandClick} style={{ cursor: 'pointer' }}>
            <ApartEaseLogo size="sm" />
          </div>
        </div>

        {/* ── Right: Profile ── */}
        <div className="app-navbar-right" ref={dropdownRef}>
          <button
            className="app-navbar-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Profile menu"
          >
            <i className="bi bi-person-circle"></i>
          </button>

          {/* ── Profile Dropdown ── */}
          {profileOpen && (
            <div className="app-profile-dropdown">
              {/* User info */}
              <div className="app-profile-info">
                <div className="app-profile-avatar">
                  <i className="bi bi-person-fill"></i>
                </div>
                <div>
                  <div className="app-profile-name">{displayName}</div>
                  <div className="app-profile-detail">{displayDetail}</div>
                </div>
              </div>

              <div className="app-profile-divider"></div>

              {/* Admin Profile Dropdown Items */}
              {user?.role === 'admin' && (
                <>
                  <button className="app-profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/account'); }}>
                    <i className="bi bi-person"></i> Account
                  </button>
                  <button className="app-profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/residents-mgmt'); }}>
                    <i className="bi bi-people"></i> Residents
                  </button>
                  <button className="app-profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/payment-settings'); }}>
                    <i className="bi bi-credit-card-2-front"></i> Billing Information
                  </button>
                  <button className="app-profile-item" onClick={() => { setProfileOpen(false); navigate('/admin/settings'); }}>
                    <i className="bi bi-gear"></i> Settings
                  </button>
                </>
              )}

              {/* Resident Profile Dropdown Items */}
              {user?.role === 'resident' && (
                <>
                  <button className="app-profile-item" onClick={() => { setProfileOpen(false); navigate('/resident/account'); }}>
                    <i className="bi bi-person"></i> Account
                  </button>
                  <button
                    className="app-profile-item"
                    onClick={() => {
                      setProfileOpen(false);
                      if (onNavigate) {
                        onNavigate('payment-details');
                      } else {
                        navigate('/resident/dashboard', { state: { activeTab: 'payment-details' } });
                      }
                    }}
                  >
                    <i className="bi bi-credit-card-2-front"></i> Payment Details
                  </button>
                  <button className="app-profile-item" onClick={() => { setProfileOpen(false); navigate('/resident/settings'); }}>
                    <i className="bi bi-gear"></i> Settings
                  </button>
                </>
              )}

              {/* Dark mode toggle */}
              <button className="app-profile-item" onClick={() => { toggleTheme(); }}>
                <i className={`bi ${isDark ? 'bi-sun' : 'bi-moon'}`}></i>
                Theme (Dark / Light)
              </button>

              <div className="app-profile-divider"></div>

              {/* Logout */}
              <button className="app-profile-item app-profile-logout" onClick={handleLogout}>
                <i className="bi bi-box-arrow-left"></i> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

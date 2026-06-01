/**
 * DashboardLayout.jsx
 * -------------------
 * Admin layout wrapper: AppNavbar + Sidebar + main content area.
 * Manages sidebar collapsed state with localStorage persistence.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AppNavbar from './AppNavbar';

const SIDEBAR_KEY = 'apartease-sidebar';

function getInitialSidebar() {
  try {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved === 'collapsed') return true;
    if (saved === 'open') return false;
  } catch { /* noop */ }
  // Default: open on desktop
  return false;
}

export default function DashboardLayout({
  children,
  title,
  subtitle,
  showBackLink = false,
  backPath = '/admin/dashboard',
  backText = '← Back',
  centered = false
}) {
  const [collapsed, setCollapsed] = useState(getInitialSidebar);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showBackLink) {
      try {
        sessionStorage.removeItem('profile-dropdown-open');
      } catch { /* noop */ }
    }
  }, [showBackLink]);

  useEffect(() => {
    if (title) {
      document.title = `${title} | ApartEase`;
    } else {
      document.title = 'ApartEase – Apartment Resource Management & Billing System';
    }
  }, [title]);


  useEffect(() => {
    try {
      if (collapsed) {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
    } catch { /* noop */ }
    return () => {
      try {
        document.body.classList.remove('sidebar-collapsed');
      } catch { /* noop */ }
    };
  }, [collapsed]);

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'open'); } catch { /* noop */ }
      return next;
    });
  };

  const handleBack = (e) => {
    e.preventDefault();
    if (backPath === '/admin/dashboard') {
      try {
        sessionStorage.removeItem('profile-dropdown-open');
      } catch { /* noop */ }
      navigate('/admin/dashboard');
    } else {
      try {
        sessionStorage.setItem('profile-dropdown-open', 'true');
      } catch { /* noop */ }
      navigate(-1);
    }
  };

  return (
    <>
      <AppNavbar showSidebarToggle onSidebarToggle={handleToggle} />
      <Sidebar collapsed={collapsed} />
      <div
        className="main-content fade-in"
        style={{
          marginLeft: collapsed ? 0 : undefined,
          paddingTop: 92,
        }}
      >
        <div style={centered ? { maxWidth: '640px', margin: '0 auto', padding: '0 16px' } : {}}>
          {showBackLink && (
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
                {backText}
              </button>
            </div>
          )}
          {title && (
            <div className="topbar">
              <div>
                <h2>{title}</h2>
                {subtitle && (
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
}


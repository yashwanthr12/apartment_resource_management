/**
 * Sidebar.jsx
 * -----------
 * Admin sidebar navigation with active-page highlighting.
 * Brand and logout are now in AppNavbar, so this only contains nav links.
 *
 * Props:
 *  - collapsed (bool)  Whether the sidebar is hidden
 */

import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/admin/dashboard',             icon: 'bi-grid-1x2-fill',    label: 'Dashboard' },
  { path: '/admin/add-expense',           icon: 'bi-plus-circle',      label: 'Expense Management' },
  { path: '/admin/residents',             icon: 'bi-send',             label: 'Bill Distribution' },
  { path: '/admin/payment-verification',  icon: 'bi-receipt-cutoff',   label: 'Payment Verification' },
  { path: '/admin/analytics',             icon: 'bi-bar-chart-line',   label: 'Analytics Dashboard' },
];

export default function Sidebar({ collapsed = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Spacer for top navbar (64px) */}
      <div style={{ height: 64, flexShrink: 0 }}></div>

      {/* Navigation Links */}
      <div className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => {
              try {
                sessionStorage.removeItem('profile-dropdown-open');
              } catch { /* noop */ }
              navigate(item.path);
            }}
          >
            <i className={`bi ${item.icon}`}></i>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

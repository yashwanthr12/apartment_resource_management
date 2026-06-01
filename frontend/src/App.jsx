/**
 * App.jsx
 * -------
 * Root component with React Router.
 * Defines all routes for auth, admin, and resident pages.
 * Shows loading spinner while auth state is being resolved.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui';

// Auth pages
import AdminLogin from './pages/auth/AdminLogin';
import AdminRegister from './pages/auth/AdminRegister';
import ResidentLogin from './pages/auth/ResidentLogin';
import ResidentRegister from './pages/auth/ResidentRegister';

// Landing page
import LandingPage from './pages/LandingPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AddExpense from './pages/admin/AddExpense';
import ResidentList from './pages/admin/ResidentList';
import ResidentsMgmt from './pages/admin/ResidentsMgmt';
import ResidentDetails from './pages/admin/ResidentDetails';
import PaymentVerification from './pages/admin/PaymentVerification';
import PaymentSettings from './pages/admin/PaymentSettings';
import Analytics from './pages/admin/Analytics';
import AdminAccount from './pages/admin/AdminAccount';
import AdminSettings from './pages/admin/AdminSettings';

// Resident pages
import ResidentDashboard from './pages/resident/ResidentDashboard';
import ResidentAccount from './pages/resident/ResidentAccount';
import ResidentSettings from './pages/resident/ResidentSettings';

/**
 * ProtectedRoute — wraps pages that require authentication.
 * Redirects to login if user is not authenticated.
 */
function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Role-based access control
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/resident/dashboard'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ── Public Auth Routes ── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/resident/login" element={<ResidentLogin />} />
      <Route path="/resident/register" element={<ResidentRegister />} />

      {/* ── Admin Routes (protected) ── */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/add-expense" element={
        <ProtectedRoute role="admin"><AddExpense /></ProtectedRoute>
      } />
      <Route path="/admin/residents" element={
        <ProtectedRoute role="admin"><ResidentList /></ProtectedRoute>
      } />
      <Route path="/admin/residents-mgmt" element={
        <ProtectedRoute role="admin"><ResidentsMgmt /></ProtectedRoute>
      } />
      <Route path="/admin/residents-mgmt/:id" element={
        <ProtectedRoute role="admin"><ResidentDetails /></ProtectedRoute>
      } />
      <Route path="/admin/payment-verification" element={
        <ProtectedRoute role="admin"><PaymentVerification /></ProtectedRoute>
      } />
      <Route path="/admin/payment-settings" element={
        <ProtectedRoute role="admin"><PaymentSettings /></ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute role="admin"><Analytics /></ProtectedRoute>
      } />
      <Route path="/admin/account" element={
        <ProtectedRoute role="admin"><AdminAccount /></ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>
      } />

      {/* ── Resident Routes (protected) ── */}
      <Route path="/resident/dashboard" element={
        <ProtectedRoute role="resident"><ResidentDashboard /></ProtectedRoute>
      } />
      <Route path="/resident/account" element={
        <ProtectedRoute role="resident"><ResidentAccount /></ProtectedRoute>
      } />
      <Route path="/resident/settings" element={
        <ProtectedRoute role="resident"><ResidentSettings /></ProtectedRoute>
      } />

      {/* ── Catch-all: redirect to login ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

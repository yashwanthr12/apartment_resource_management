/**
 * useAuth.js
 * ----------
 * Auth context provider + hook.
 * - Calls /api/me on mount to restore session
 * - Provides user, login, logout, isAdmin, isResident
 * - Redirects to login if unauthenticated
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as logoutApi } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Current user object
  const [loading, setLoading] = useState(true);  // Initial auth check loading

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Clear user state if any API request returns a 401 (session expired)
  useEffect(() => {
    const handle401 = () => {
      setUser(null);
    };
    window.addEventListener('auth-401', handle401);
    return () => window.removeEventListener('auth-401', handle401);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const { ok, data } = await getMe();
      if (ok) {
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login — update local state after successful API login
  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  // Logout — call API then clear state
  const handleLogout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore errors during logout
    }
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isResident = user?.role === 'resident';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout: handleLogout,
      isAdmin,
      isResident,
      checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * @returns {{ user, loading, login, logout, isAdmin, isResident, checkAuth }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

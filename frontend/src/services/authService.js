/**
 * authService.js
 * --------------
 * Auth-related API calls: login, register, logout, current user, apartment list.
 */

import { apiGet, apiPost } from './api';

/** Login as admin. Returns { ok, data } */
export const adminLogin = (email, password) =>
  apiPost('/api/admin/login', { email, password });

/** Register a new admin. */
export const adminRegister = (body) =>
  apiPost('/api/admin/register', body);

/** Login as resident. Returns { ok, data } */
export const residentLogin = (email, password) =>
  apiPost('/api/resident/login', { email, password });

/** Register a new resident. */
export const residentRegister = (body) =>
  apiPost('/api/resident/register', body);

/** Logout (both roles). */
export const logout = () =>
  apiGet('/api/logout');

/** Get current logged-in user info + role. */
export const getMe = () =>
  apiGet('/api/me');

/** Get list of apartment names for registration dropdown. */
export const getApartments = () =>
  apiGet('/api/apartments');

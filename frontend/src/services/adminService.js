/**
 * adminService.js
 * ----------------
 * Admin-only API calls: dashboard stats, residents, payment settings, verification.
 */

import { apiGet, apiPut, apiDelete, apiPutForm } from './api';

/** Get dashboard statistics. */
export const getDashboardStats = () =>
  apiGet('/api/admin/dashboard-stats');

/** Get verified + active residents for admin's apartment. */
export const getResidents = () =>
  apiGet('/api/admin/residents');

/** Get payment settings. */
export const getPaymentSettings = () =>
  apiGet('/api/admin/payment-settings');

/** Update payment settings (JSON body). */
export const updatePaymentSettings = (formData) =>
  apiPutForm('/api/admin/payment-settings', formData);

/** Get pending (unverified) residents. */
export const getPendingResidents = () =>
  apiGet('/api/admin/pending-residents');

/** Verify a resident (set is_verified = true). */
export const verifyResident = (residentId) =>
  apiPut(`/api/admin/verify-resident/${residentId}`);

/** Reject (delete) an unverified resident. */
export const rejectResident = (residentId) =>
  apiDelete(`/api/admin/reject-resident/${residentId}`);

/** Get verified + active residents. */
export const getVerifiedResidents = () =>
  apiGet('/api/admin/verified-residents');

/** Deactivate verified resident access. */
export const deactivateResidentAccess = (residentId) =>
  apiPut(`/api/admin/soft-delete-resident/${residentId}`);

/** Get resident profile details. */
export const getResidentDetails = (residentId) =>
  apiGet(`/api/admin/resident/${residentId}`);

/** Update resident contribution factor configuration. */
export const updateResidentSplit = (residentId, splitNumber) =>
  apiPut(`/api/admin/resident-split/${residentId}`, { split_number: splitNumber });


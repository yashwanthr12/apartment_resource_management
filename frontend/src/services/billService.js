/**
 * billService.js
 * ---------------
 * Bill generation and listing API calls.
 */

import { apiGet, apiPost } from './api';

/** Generate bills for selected residents from an expense. */
export const generateBills = (expenseId, residentIds) =>
  apiPost('/api/bills/generate', { expense_id: expenseId, resident_ids: residentIds });

/** Generate bills from a grouped expenditure. */
export const generateBillsFromExpenditure = (expenditureId, residentIds) =>
  apiPost('/api/bills/generate-from-expenditure', { expenditure_id: expenditureId, resident_ids: residentIds });

/** List all bills (admin sees all, resident sees own). */
export const getBills = () =>
  apiGet('/api/bills');

/** Get filter years for resident dashboard. */
export const getFilterYears = () =>
  apiGet('/api/bills/filter-years');

/** Get filter date ranges for a year. */
export const getFilterRanges = (year) =>
  apiGet(`/api/bills/filter-ranges?year=${year}`);

/** Get filtered bills by year and date range. */
export const getFilteredBills = (year, fromDate, toDate) =>
  apiGet(`/api/bills/filtered?year=${year}&from_date=${fromDate}&to_date=${toDate}`);

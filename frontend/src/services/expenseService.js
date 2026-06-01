/**
 * expenseService.js
 * -----------------
 * Expense & expenditure API calls.
 */

import { apiGet, apiPost, apiPut } from './api';

/** Add a single expense. */
export const addExpense = (body) =>
  apiPost('/api/expenses', body);

/** List all expenses for admin's apartment. */
export const getExpenses = () =>
  apiGet('/api/expenses');

/** Calculate split amount (preview, no save). */
export const calculateSplit = (amount, totalHouses) =>
  apiPost('/api/expenses/calculate-split', { amount, total_houses: totalHouses });

/** Save a grouped expenditure with multiple categories. */
export const saveExpenditure = (body) =>
  apiPost('/api/expenditures', body);

/** List all expenditures. */
export const getExpenditures = () =>
  apiGet('/api/expenditures');

/** Get a single expenditure by ID. */
export const getExpenditure = (id) =>
  apiGet(`/api/expenditures/${id}`);

/** Update an existing grouped expenditure by ID. */
export const updateExpenditure = (id, body) =>
  apiPut(`/api/expenditures/${id}`, body);

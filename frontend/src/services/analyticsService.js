/**
 * analyticsService.js
 * -------------------
 * Analytics API calls for charts and summaries.
 */

import { apiGet } from './api';

/** Monthly category breakdown (pie chart data). */
export const getMonthlyBreakdown = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiGet(`/api/analytics/monthly${q ? '?' + q : ''}`);
};

/** Summary cards (total, highest, lowest). */
export const getSummary = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiGet(`/api/analytics/summary${q ? '?' + q : ''}`);
};

/** Month-over-month comparison (bar chart data). */
export const getComparison = () =>
  apiGet('/api/analytics/comparison');

/** Resource usage trends (line chart data). */
export const getUsageTrends = (category = 'electricity') =>
  apiGet(`/api/analytics/usage-trends?category=${category}`);

/** Cost vs usage scatter data. */
export const getCostVsUsage = () =>
  apiGet('/api/analytics/cost-vs-usage');

/** Available months for dropdown. */
export const getAvailableMonths = () =>
  apiGet('/api/analytics/months');

/** Available years for dropdown. */
export const getAvailableYears = () =>
  apiGet('/api/analytics/years');

/** Expenditure dates for a year. */
export const getExpenditureDates = (year) =>
  apiGet(`/api/analytics/expenditure-dates?year=${year}`);

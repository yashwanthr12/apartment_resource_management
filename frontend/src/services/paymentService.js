/**
 * paymentService.js
 * -----------------
 * Payment-related API calls: upload receipt, list payments, verify/reject.
 */

import { apiGet, apiPut, apiPostForm, apiDownload } from './api';

/** Upload a payment receipt (resident). */
export const uploadReceipt = (billId, file) => {
  const formData = new FormData();
  formData.append('bill_id', billId);
  formData.append('receipt', file);
  return apiPostForm('/api/payments/upload', formData);
};

/** List payments for verification (admin). Optional expenditure_id filter. */
export const getPayments = (expenditureId = null) => {
  const url = expenditureId
    ? `/api/payments?expenditure_id=${expenditureId}`
    : '/api/payments';
  return apiGet(url);
};

/** Verify or reject a payment (admin). action: 'approve' | 'reject' */
export const verifyPayment = (paymentId, action) =>
  apiPut(`/api/payments/${paymentId}/verify`, { action });

export const getResidentPaymentInfo = () =>
  apiGet('/api/resident/payment-info');

/** Download verified payment receipt as PDF (resident). */
export const downloadReceipt = (paymentId) =>
  apiDownload(`/api/payments/${paymentId}/receipt`);

/**
 * format.js
 * ---------
 * Shared formatting utilities.
 */

/**
 * Format a number as Indian Rupee currency.
 * @param {number} n
 * @returns {string} e.g. "₹1,23,456.00"
 */
export function formatCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format a date string as "DD MMM YYYY" (e.g. "05 Jan 2026").
 * Accepts ISO strings like "2026-01-05" or "2026-01-05T00:00:00".
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '--';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Force midnight local time to avoid off-by-one on timezone boundaries
  const raw = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
  const d = new Date(raw);
  if (isNaN(d)) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

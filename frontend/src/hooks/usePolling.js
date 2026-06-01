/**
 * usePolling.js
 * -------------
 * Generic polling hook — calls fetchFn every intervalMs.
 * Automatically cleans up setInterval on unmount.
 *
 * Usage:
 *   usePolling(fetchDashboardStats, 15000);
 */

import { useEffect, useRef } from 'react';

/**
 * @param {Function} fetchFn  - Async function to call repeatedly
 * @param {number} intervalMs - Polling interval in milliseconds (default 15000)
 * @param {Array} deps        - Dependency array (re-creates interval when deps change)
 * @param {boolean} enabled   - Whether polling is active (default true)
 */
export function usePolling(fetchFn, intervalMs = 15000, deps = [], enabled = true) {
  const savedFn = useRef(fetchFn);

  // Keep the latest fetchFn ref updated
  useEffect(() => {
    savedFn.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;

    // Call immediately on mount
    savedFn.current();

    // Set up interval
    const id = setInterval(() => {
      savedFn.current();
    }, intervalMs);

    // Cleanup on unmount or deps change
    return () => clearInterval(id);
  }, [intervalMs, enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

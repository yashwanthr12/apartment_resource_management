/**
 * useFetch.js
 * -----------
 * Generic data-fetching hook.
 * Returns { data, loading, error, refetch }.
 * refetch() is called after mutations to trigger instant UI update.
 *
 * Usage:
 *   const { data: residents, loading, refetch } = useFetch(getResidents);
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * @param {Function} fetchFn    - Async function that returns { ok, data }
 * @param {Array} deps          - Dependency array
 * @param {boolean} immediate   - Whether to fetch on mount (default true)
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: Function }}
 */
export function useFetch(fetchFn, deps = [], immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const savedFn = useRef(fetchFn);

  // Keep the latest fetchFn ref updated
  useEffect(() => {
    savedFn.current = fetchFn;
  }, [fetchFn]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await savedFn.current();
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.data?.error || 'Request failed');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
  }, [immediate, refetch, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch, setData };
}

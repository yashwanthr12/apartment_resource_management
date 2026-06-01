/**
 * api.js
 * ------
 * Centralised fetch wrapper for all API calls.
 * Every request includes credentials: 'include' to send Flask session cookies.
 * Automatically handles JSON parsing and 401 redirects.
 */

const BASE = ''; // Same origin — Vite proxy handles /api → Flask

/**
 * Core fetch wrapper — handles response parsing and auth redirects.
 */
async function request(url, options = {}) {
  let role = '';
  if (window.location.pathname.startsWith('/admin') || url.includes('/api/admin/')) {
    role = 'admin';
  } else if (window.location.pathname.startsWith('/resident') || url.includes('/api/resident/')) {
    role = 'resident';
  }

  const headers = {
    ...(options.headers || {}),
  };

  if (role) {
    headers['X-Session-Role'] = role;
  }

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    credentials: 'include',  // Send Flask session cookie
    headers,
  });

  // If session expired, notify AuthProvider via custom event
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth-401'));
  }

  return res;
}

/**
 * GET JSON from an endpoint.
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiGet(url) {
  const res = await request(url);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/**
 * POST JSON to an endpoint.
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiPost(url, body) {
  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/**
 * PUT JSON to an endpoint.
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiPut(url, body) {
  const res = await request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/**
 * DELETE request to an endpoint.
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiDelete(url) {
  const res = await request(url, { method: 'DELETE' });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/**
 * POST FormData (multipart) to an endpoint — used for file uploads.
 * Do NOT set Content-Type header; browser sets it with boundary automatically.
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiPostForm(url, formData) {
  const res = await request(url, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/**
 * PUT FormData (multipart) to an endpoint — used for file uploads.
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiPutForm(url, formData) {
  const res = await request(url, {
    method: 'PUT',
    body: formData,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/**
 * GET a file download from an endpoint.
 * Triggers a browser download using the provided filename.
 * @returns {Promise<{ok: boolean, status: number, error?: string}>}
 */
export async function apiDownload(url, filename) {
  const res = await request(url);
  if (!res.ok) {
    let err = 'Download failed';
    try {
      const data = await res.json();
      err = data.error || err;
    } catch (e) {}
    return { ok: false, status: res.status, error: err };
  }
  
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  
  // Try to get filename from Content-Disposition if not provided
  let finalFilename = filename;
  if (!finalFilename) {
    const disposition = res.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      finalFilename = disposition.split('filename=')[1].replace(/"/g, '');
    } else {
      finalFilename = 'download.pdf';
    }
  }
  
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
  
  return { ok: true, status: res.status };
}

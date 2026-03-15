// API_BASE: no trailing slash. VITE_API_URL e.g. http://172.20.0.20/api. /api = local Vite proxy.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/**
 * crud – fetch | insert | update | delete
 * fetchDataPaginated – POST /api/data { queryName, page, limit } (automatic pagination)
 * fetchSelectOptions – POST /api/data { queryName, page: 1, limit: 25 } (for dropdowns)
 */
export async function fetchSelectOptions(queryName, limit = 25, search = '') {
  return fetch(`${API_BASE}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryName: queryName || 'accounts',
      page: 1,
      limit,
      ...(search && { search }),
    }),
  }).then((res) => {
    if (!res.ok) {
      return res.json().catch(() => ({ error: res.statusText })).then((err) => {
        throw new Error(err?.error || res.statusText || 'Failed');
      });
    }
    return res.json();
  });
}

export async function fetchDataPaginated({ queryName, page = 1, limit = 10, search = '', academicYearId = '' }) {
  const res = await fetch(`${API_BASE}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryName: queryName || 'accounts',
      page,
      limit,
      ...(search != null && String(search).trim() && { search: String(search).trim() }),
      ...(academicYearId != null && String(academicYearId).trim() && { academicYearId: String(academicYearId).trim() }),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch');
  }
  return res.json();
}

export async function crud({ operation, fn, params = {}, query }) {
  if (operation === 'fetch') {
    const res = await fetch(`${API_BASE}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryName: query || 'accounts', page: 1, limit: 100 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to fetch');
    }
    return res.json();
  }

  // Insert | Update | Delete – POST /api/all (fn + params; p_operation not sent to DB)
  const body = { fn, ...params, p_operation: operation };
  const res = await fetch(`${API_BASE}/all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let errMsg = text || 'Operation failed';
  try {
    const j = JSON.parse(text);
    if (j && typeof j.error === 'string') errMsg = j.error;
  } catch (_) {}
  if (!res.ok) throw new Error(errMsg);
  const ok = /inserted|updated|deleted|success|^ok$|^1$|row\s+(inserted|updated|deleted)/i.test(text.trim());
  if (!ok) throw new Error(errMsg);
  return { success: true, message: text };
}

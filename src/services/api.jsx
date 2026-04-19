// API_BASE: no trailing slash. VITE_API_URL e.g. http://172.20.0.20/api. /api = local Vite proxy.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/**
 * loginUser – POST /api/login
 * Returns { success, message, user? }. On network/server error returns { success:false, message }.
 */
export async function loginUser(username, password) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({
      success: false,
      message: 'Server waa ku celi khalad',
    }));
    return data;
  } catch (err) {
    return { success: false, message: 'Network khalad: ' + err.message };
  }
}

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

export async function fetchUserBranches(usr_id) {
  try {
    const res = await fetch(`${API_BASE}/user-branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usr_id }),
    });
    const data = await res.json().catch(() => ({ success: false, message: 'Server khalad' }));
    return data;
  } catch (err) {
    return { success: false, message: 'Network khalad: ' + err.message };
  }
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

  // Insert | Update | Delete – POST /api/all (fn + params + oper)
  const body = { fn, ...params, oper: operation };
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
  // Backend returns HTTP 200 for success, non-200 for errors.
  // Trust res.ok — any 200 response from /api/all is a success.
  return { success: true, message: text };
}

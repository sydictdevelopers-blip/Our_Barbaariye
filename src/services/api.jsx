// API_BASE: no trailing slash. VITE_API_URL e.g. http://172.20.0.20/api. /api = local Vite proxy.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const AUTH_STORAGE_KEY = 'brabaariye_user';
function getSessionBrId() {
  if (typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage?.getItem(AUTH_STORAGE_KEY);
    if (!stored) return '';
    const user = JSON.parse(stored);
    return user?.br_id != null ? String(user.br_id) : '';
  } catch {
    return '';
  }
}
function getSessionUBrId() {
  if (typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage?.getItem(AUTH_STORAGE_KEY);
    if (!stored) return '';
    const user = JSON.parse(stored);
    return user?.u_br_id != null ? String(user.u_br_id) : '';
  } catch {
    return '';
  }
}

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
export async function fetchSelectOptions(queryName, limit = 25, search = '', extra = {}) {
  const sessionBrId = getSessionBrId();
  const sessionUBrId = getSessionUBrId();
  return fetch(`${API_BASE}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryName: queryName || 'accounts',
      page: 1,
      limit,
      ...(sessionBrId && { br_id: sessionBrId }),
      ...(sessionUBrId && { u_br_id: sessionUBrId }),
      ...(search && { search }),
      ...extra,
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

/**
 * runBulk – POST /api/bulk { steps } in one transaction.
 * Returns { success, vars, results } from the server.
 */
export async function runBulk(steps) {
  const res = await fetch(`${API_BASE}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Bulk failed');
  return json;
}

/** Read u_br_id from session for bulk SP params. */
export function getSessionUBrIdNum() {
  const v = getSessionUBrId();
  return v ? Number(v) : 0;
}

/** Read br_id (current branch view) from session for SP params. */
export function getSessionBrIdNum() {
  const v = getSessionBrId();
  return v ? Number(v) : 0;
}

export async function fetchDataPaginated({ queryName, page = 1, limit = 10, search = '', academicYearId = '', ...extra }) {
  const sessionBrId = getSessionBrId();
  const sessionUBrId = getSessionUBrId();
  const res = await fetch(`${API_BASE}/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryName: queryName || 'accounts',
      page,
      limit,
      ...(sessionBrId && { br_id: sessionBrId }),
      ...(sessionUBrId && { u_br_id: sessionUBrId }),
      ...(search != null && String(search).trim() && { search: String(search).trim() }),
      ...(academicYearId != null && String(academicYearId).trim() && { academicYearId: String(academicYearId).trim() }),
      ...extra,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch');
  }
  return res.json();
}

/**
 * makeOptionLoader – returns an AsyncSelect `loadOptions` function for `Select2`.
 * Lazy: fetches `limit` rows from backend each time the dropdown opens / user types.
 * The first column of the result is treated as `value`, the second as `label`,
 * unless `valueKey` / `labelKey` are passed in opts.
 *
 * Usage:
 *   <Select2
 *     value={x} selectedLabel={xLabel}
 *     onChange={(e) => { setX(e.target.value); setXLabel(e.target.label); }}
 *     loadOptions={makeOptionLoader('responsible_options', () => ({ br_id: brId }))}
 *   />
 */
export function makeOptionLoader(optionsKey, getExtra, opts = {}) {
  const limit = opts.limit ?? 25;
  return async (inputValue) => {
    const search = String(inputValue ?? '').trim();
    const extra = (typeof getExtra === 'function' ? getExtra() : getExtra) || {};
    const res = await fetchSelectOptions(optionsKey, limit, search, extra).catch(() => ({}));
    const rows = res?.data || [];
    if (!rows.length) return [];
    const cols = res?.columns || Object.keys(rows[0]).map((k) => ({ key: k }));
    const valueKey = opts.valueKey || cols[0]?.key;
    const labelKey = opts.labelKey || cols[1]?.key || valueKey;
    return rows.map((r) => {
      const item = {
        value: String(r[valueKey] ?? ''),
        label: String(r[labelKey] ?? r[valueKey] ?? ''),
      };
      // Auto-passthrough of `state` column so Select2 can render an Active/Inactive badge.
      if (r.state != null) item.state = String(r.state);
      return item;
    });
  };
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

/* ─────────────── Module Help API ─────────────── */

/** Soo qaad help-ka module gaar ah (hal luuqad). Wuxuu soo celiyaa row ama null. */
export async function fetchModuleHelp(moduleKey, lang = 'so') {
  if (!moduleKey) return null;
  const res = await fetch(`${API_BASE}/module-help/${encodeURIComponent(moduleKey)}/${encodeURIComponent(lang)}`);
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return body?.data ?? null;
}

/** Soo qaad dhamaan luuqadaha module gaar ah (rows array). */
export async function fetchModuleHelpAll(moduleKey) {
  if (!moduleKey) return [];
  const res = await fetch(`${API_BASE}/module-help/${encodeURIComponent(moduleKey)}`);
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  return body?.data ?? [];
}

/** Soo qaad dhamaan records-ka help-ka (admin listing). */
export async function fetchAllModuleHelp() {
  const res = await fetch(`${API_BASE}/module-help`);
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  return body?.data ?? [];
}

/** Kaydi/Cusboonaysii help record. oper: 'insert' (upsert) ama 'update'. */
export async function saveModuleHelp({ mh_id = 0, module_key, lang = 'so', title = '', description = '', video_url = '', oper = 'insert' }) {
  const res = await fetch(`${API_BASE}/module-help`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mh_id, module_key, lang, title, description, video_url, oper }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Save failed');
  return body;
}

export async function deleteModuleHelp(mh_id) {
  const res = await fetch(`${API_BASE}/module-help/${Number(mh_id) || 0}`, { method: 'DELETE' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Delete failed');
  return body;
}

/**
 * uploadNewStudentImage – upload sawir hore-u-soo-shubid arday-cusub.
 * Wuxuu soo celiyaa { ok: true, image: '<public-url>' } S3-da. Loo isticmaalo
 * StudentRegister modal-ka, ka hor inta SP-yada aanan la wicin.
 */
export async function uploadNewStudentImage(file) {
  if (!file) throw new Error('No file');
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/student-image/upload-new`, {
    method: 'POST',
    body: fd,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Upload failed');
  return body;
}

/** Upload video file → soo celi { url, filename }. file waa File object. */
export async function uploadModuleVideo(file, onProgress) {
  if (!file) throw new Error('No file');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/module-help/upload-video`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) return resolve(body);
        reject(new Error(body?.error || 'Upload failed'));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    const fd = new FormData();
    fd.append('video', file);
    xhr.send(fd);
  });
}

/** U rog URL-ka relative (/uploads/...) mid buuxa oo la isticmaali karo <video src>. */
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url)) return url;
  if (url.startsWith('/uploads')) {
    // API_BASE dhamaad '/api' leh → ka saar /api si loo geeyo root-ka backend-ka
    const root = API_BASE.replace(/\/api$/i, '');
    return `${root}${url}`;
  }
  return url;
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

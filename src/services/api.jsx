// API_BASE: no trailing slash. VITE_API_URL e.g. http://172.20.0.20/api. /api = local Vite proxy.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const AUTH_STORAGE_KEY = 'brabaariye_user';

/**
 * handleAuthFailure — called when an authenticated request returns 401.
 * Wipes local session state and hard-redirects to /login. Guarded so a
 * burst of failing parallel requests only triggers one redirect.
 *
 * Loginka laftiisa kala soo ma baxo halkan — `loginUser` 401 wuxuu macne u
 * yahay "creds qaldan" oo aan ahayn session expiry. Sidaa darteed loginUser-ka
 * `_check401`-ka ma uusan wacin.
 */
let _authFailureFired = false;
function _check401(res) {
  if (res?.status !== 401 || _authFailureFired) return;
  _authFailureFired = true;
  if (typeof window !== 'undefined') {
    try { window.localStorage?.removeItem(AUTH_STORAGE_KEY); } catch (_) {}
    // BrowserRouter basename='/frontend' so login lives at /frontend/login.
    window.location.href = '/frontend/login';
  }
}

/**
 * Server-ku wuxuu ka soo bixinayaa br_id / u_br_id JWT-ga (req.user). Sidaa
 * darteed haddii frontend-ku diro qiime body-ga ah, server wuu iska tuurayaa.
 * Defensively-strip si payload-ka shabakadda u nadiifsanaado iyo si tampering
 * localStorage-ku uusan u soo bandhigin DevTools.
 */
function _stripSessionKeys(obj) {
  if (!obj) return {};
  const { br_id, u_br_id, ...rest } = obj;
  return rest;
}
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
      credentials: 'include',
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
 *
 * DROPDOWN CACHE: fetchSelectOptions waxay kayd-gareysaa jawaab kasta oo dropdown
 * ah (queryName + search + extras + session) — sidaas darteed marka isla raadinta
 * mar kale la diro, DB lagu wici maayo. Kayd-ka waxaa la tirtirayaa marka CRUD
 * ama bulk-update lagu fuliyo, sababtoo ah xogtu way bedeli kartaa.
 */
const _dropdownCache = new Map(); // key → { data, ts }
export function clearDropdownCache() { _dropdownCache.clear(); }
function _dropdownKey(queryName, limit, search, extra, brId, uBrId) {
  // Sort extra keys si key-gu uu xasilo (order-isbeddel ku ma faragelin doono).
  const extraKeys = Object.keys(extra || {}).sort();
  const extraStr = extraKeys.map((k) => `${k}=${extra[k] ?? ''}`).join('&');
  return `${queryName}|${limit}|${(search || '').trim().toLowerCase()}|${extraStr}|${brId}|${uBrId}`;
}

export async function fetchSelectOptions(queryName, limit = 25, search = '', extra = {}) {
  const sessionBrId = getSessionBrId();
  const sessionUBrId = getSessionUBrId();
  const cacheKey = _dropdownKey(queryName, limit, search, extra, sessionBrId, sessionUBrId);
  const cached = _dropdownCache.get(cacheKey);
  if (cached) return cached;

  const promise = fetch(`${API_BASE}/data`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryName: queryName || 'accounts',
      page: 1,
      limit,
      ...(search && { search }),
      ..._stripSessionKeys(extra),
    }),
  }).then((res) => {
    _check401(res);
    if (!res.ok) {
      return res.json().catch(() => ({ error: res.statusText })).then((err) => {
        throw new Error(err?.error || res.statusText || 'Failed');
      });
    }
    return res.json();
  }).catch((err) => {
    // Khalad → ka saar cache si retry-ga uusan u xidhmin xun
    _dropdownCache.delete(cacheKey);
    throw err;
  });

  // Kaydi promise-ka toos — taasi ka caawisa concurrent calls inay ka faa'iidaystaan
  _dropdownCache.set(cacheKey, promise);
  return promise;
}

/**
 * runBulk – POST /api/bulk { steps } in one transaction.
 * Returns { success, vars, results } from the server.
 */
export async function runBulk(steps) {
  const res = await fetch(`${API_BASE}/bulk`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  _check401(res);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Bulk failed');
  // Bulk wax bedelay → tirtir dropdown cache-ka si dropdown-yada uu xog cusub helo
  clearDropdownCache();
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

// In-flight request cache: collapses concurrent fetches that share a key into
// a single network call. Mainly defends against React StrictMode's double-mount
// in dev (which otherwise fires every initial fetch twice) and against rapid
// re-renders that re-trigger the same data load before the first finishes.
const _inFlightRequests = new Map();
export function dedupeRequest(key, fn) {
  if (!key) return fn();
  const existing = _inFlightRequests.get(key);
  if (existing) return existing;
  const promise = Promise.resolve()
    .then(fn)
    .finally(() => { _inFlightRequests.delete(key); });
  _inFlightRequests.set(key, promise);
  return promise;
}

export async function fetchDataPaginated({ queryName, page = 1, limit = 10, search = '', academicYearId = '', ...extra }) {
  const res = await fetch(`${API_BASE}/data`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryName: queryName || 'accounts',
      page,
      limit,
      ...(search != null && String(search).trim() && { search: String(search).trim() }),
      ...(academicYearId != null && String(academicYearId).trim() && { academicYearId: String(academicYearId).trim() }),
      ..._stripSessionKeys(extra),
    }),
  });
  _check401(res);
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

/** Soo celi branches-ka user-ka logged-in. usr_id-ka server-ka wuxuu ka soo
 *  qaadayaa JWT-ga (req.user) — body-ga lama dirayo, sidaa darteed user-ku
 *  ma weydiisan karo branches-ka user kale. */
export async function fetchUserBranches() {
  try {
    const res = await fetch(`${API_BASE}/user-branches`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    _check401(res);
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
  const res = await fetch(`${API_BASE}/module-help/${encodeURIComponent(moduleKey)}/${encodeURIComponent(lang)}`, { credentials: 'include' });
  _check401(res);
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return body?.data ?? null;
}

/** Soo qaad dhamaan luuqadaha module gaar ah (rows array). */
export async function fetchModuleHelpAll(moduleKey) {
  if (!moduleKey) return [];
  const res = await fetch(`${API_BASE}/module-help/${encodeURIComponent(moduleKey)}`, { credentials: 'include' });
  _check401(res);
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  return body?.data ?? [];
}

/** Soo qaad dhamaan records-ka help-ka (admin listing). */
export async function fetchAllModuleHelp() {
  const res = await fetch(`${API_BASE}/module-help`, { credentials: 'include' });
  _check401(res);
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  return body?.data ?? [];
}

/** Kaydi/Cusboonaysii help record. oper: 'insert' (upsert) ama 'update'. */
export async function saveModuleHelp({ mh_id = 0, module_key, lang = 'so', title = '', description = '', video_url = '', oper = 'insert' }) {
  const res = await fetch(`${API_BASE}/module-help`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mh_id, module_key, lang, title, description, video_url, oper }),
  });
  _check401(res);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'Save failed');
  return body;
}

export async function deleteModuleHelp(mh_id) {
  const res = await fetch(`${API_BASE}/module-help/${Number(mh_id) || 0}`, { method: 'DELETE', credentials: 'include' });
  _check401(res);
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
    credentials: 'include',
    body: fd,
  });
  _check401(res);
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
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    };
    xhr.onload = () => {
      try {
        if (xhr.status === 401) _check401({ status: 401 });
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
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryName: query || 'accounts', page: 1, limit: 100 }),
    });
    _check401(res);
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
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  _check401(res);
  const text = await res.text();
  let errMsg = text || 'Operation failed';
  try {
    const j = JSON.parse(text);
    if (j && typeof j.error === 'string') errMsg = j.error;
  } catch (_) {}
  if (!res.ok) throw new Error(errMsg);
  // Backend returns HTTP 200 for success, non-200 for errors.
  // Trust res.ok — any 200 response from /api/all is a success.
  // Insert/Update/Delete-ka wax bedelay → tirtir dropdown cache-ka.
  clearDropdownCache();
  return { success: true, message: text };
}

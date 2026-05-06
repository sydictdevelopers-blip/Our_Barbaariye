import { createSlice } from '@reduxjs/toolkit';

const AUTH_STORAGE_KEY = 'brabaariye_user';

const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('darkMode');
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getInitialUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const initialState = {
  darkMode: getInitialDarkMode(),
  sidebarCollapsed: false,
  sidebarOpen: false,
  activeTab: 'accounts',
  user: getInitialUser(),
  // Branches the logged-in user has access to. Populated once the user lands
  // on a protected route (BranchGuard fetches /user-branches). Cached here so
  // every component can read the active branch's br_name without re-fetching.
  userBranches: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', state.darkMode);
      if (state.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(action.payload));
        if (action.payload.br_id == null) {
          // eslint-disable-next-line no-console
          console.warn('[setUser] saved without br_id — queries u baahan branch ID won\'t work', action.payload);
        } else {
          // eslint-disable-next-line no-console
          console.log('[setUser] session saved with br_id =', action.payload.br_id);
        }
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    },
    setBranch: (state, action) => {
      if (state.user) {
        state.user.br_id = action.payload;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.user));
        // eslint-disable-next-line no-console
        console.log('[setBranch] session br_id updated →', action.payload);
      }
    },
    /** Replace privalage + user_type after a branch switch (privileges may
     *  differ per branch). Branch id is updated separately via setBranch. */
    setBranchContext: (state, action) => {
      if (!state.user) return;
      const { privalage, user_type, u_br_id } = action.payload || {};
      if (privalage !== undefined) state.user.privalage = privalage;
      if (user_type !== undefined) state.user.user_type = user_type;
      if (u_br_id !== undefined) state.user.u_br_id = u_br_id;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.user));
    },
    setUserBranches: (state, action) => {
      state.userBranches = Array.isArray(action.payload) ? action.payload : [];
    },
    logout: (state) => {
      state.user = null;
      state.userBranches = [];
      localStorage.removeItem(AUTH_STORAGE_KEY);
    },
  },
});

export const { toggleDarkMode, toggleSidebarCollapse, setSidebarOpen, setActiveTab, setUser, setBranch, setBranchContext, setUserBranches, logout } = uiSlice.actions;

// Read API_BASE the same way services/api.jsx does so dev/prod proxies work.
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** switchBranch — server-side branch switch. The server validates that the
 *  logged-in user owns the requested branch (via user_branch table) and
 *  re-issues the JWT cookie. Only on success do we update Redux state. */
export const switchBranch = (br_id) => async (dispatch) => {
  const res = await fetch(`${API_BASE}/switch-branch`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ br_id }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message || 'Branch switch failed');
  }
  const body = await res.json();
  dispatch(setBranch(br_id));
  dispatch(setBranchContext({
    privalage: body.privalage ?? [],
    user_type: body.user_type,
    u_br_id: body.u_br_id,
  }));
  return body;
};

/** logoutUser — clears server-side session cookie, then local state. We try
 *  the server call first so the cookie is gone before the redirect; if it
 *  fails (network), we still clear local state to avoid stuck sessions. */
export const logoutUser = () => async (dispatch) => {
  try {
    await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
  } catch (_) { /* ignore — local logout still proceeds */ }
  dispatch(logout());
};

/** True when the logged-in user has access to the special "All" branch,
 *  regardless of which branch is currently active. The whole app is held in
 *  read-only mode (no insert / update / delete) for these users because the
 *  legacy SP-set treats "All" as a global aggregate that must not be mutated. */
export const selectIsReadOnlyBranch = (state) => {
  const list = state.ui.userBranches || [];
  return list.some((b) => String(b?.br_name ?? '').trim().toLowerCase() === 'all');
};

export default uiSlice.reducer;

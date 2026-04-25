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
    logout: (state) => {
      state.user = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
    },
  },
});

export const { toggleDarkMode, toggleSidebarCollapse, setSidebarOpen, setActiveTab, setUser, setBranch, logout } = uiSlice.actions;

export default uiSlice.reducer;

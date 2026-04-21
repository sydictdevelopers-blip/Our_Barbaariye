/**
 * dataSlice – Global slice for all entities (accounts, subjects, contacts, ...)
 * State: state.data.entities[queryName] = { columns, data, searchQuery, pagination, ... }
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { crud, fetchDataPaginated } from '../services/api';

const defaultEntity = {
  columns: [],
  data: [],
  originalData: [],
  isLoading: false,
  isCreating: false,
  error: null,
  searchQuery: '',
  currentPage: 1,
  itemsPerPage: 10,
  totalRows: 0,
};

/** Stable refs for selectors so same params => same reference (avoids unnecessary rerenders) */
const STABLE_DEFAULT_ENTITY = { ...defaultEntity };
const EMPTY_ARRAY = [];

/** Auto-detect id column: 'id' | first *_id | first column */
function getIdKey(columns, firstRow) {
  const keys = columns?.map((c) => c.key) ?? (firstRow ? Object.keys(firstRow) : []);
  return keys.find((k) => k === 'id') || keys.find((k) => k.endsWith('_id')) || keys[0] || 'id';
}

/** Build columns from first row keys */
function buildColumns(rows) {
  if (!rows?.length) return [];
  return Object.keys(rows[0]).map((key) => ({
    key,
    label: key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
  }));
}

/** Normalize row: fill empty values, set id */
function normalizeRow(row, columns, idKey) {
  const normalized = {};
  columns.forEach((col) => {
    let val = row[col.key];
    if (val === null || val === undefined) val = col.key === 'balance' || col.key?.includes('balance') ? 0 : '-';
    else if (col.key === 'balance' || col.key?.includes('balance')) val = parseFloat(val) || 0;
    else val = String(val ?? '').trim() || '-';
    normalized[col.key] = val;
  });
  normalized.id = row[idKey] ?? row.id ?? row[columns[0]?.key];
  return normalized;
}

/** Fetch data – api/data (paginated + search). loadData({ queryName, page?, limit?, search?, academicYearId?, ...extra }) */
export const loadData = createAsyncThunk(
  'data/load',
  async (arg, { rejectWithValue }) => {
    const isObj = typeof arg === 'object' && arg !== null;
    const queryName = typeof arg === 'string' ? arg : (arg?.queryName || 'accounts');
    const page = isObj && arg?.page != null ? arg.page : 1;
    const limit = isObj && arg?.limit != null ? arg.limit : 10;
    const search = isObj ? arg?.search : undefined;
    const academicYearId = isObj ? arg?.academicYearId : undefined;
    // Dhammaan fields-ka intaas ka dambeeya ayaa lagu gudbinayaa backend-ka (tusaale: br_id)
    const { queryName: _q, page: _p, limit: _l, search: _s, academicYearId: _a, ...extra } = isObj ? arg : {};
    try {
      const data = await fetchDataPaginated({ queryName, page, limit, search, academicYearId, ...extra });
      return { queryName, data };
    } catch (err) {
      return rejectWithValue({ queryName, error: err.message });
    }
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState: { entities: {} },
  reducers: {
    setSearchQuery: (state, action) => {
      const { entityKey, value } = action.payload;
      if (!state.entities[entityKey]) state.entities[entityKey] = { ...defaultEntity };
      state.entities[entityKey].searchQuery = value;
      state.entities[entityKey].currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      const { entityKey, value } = action.payload;
      if (state.entities[entityKey]) state.entities[entityKey].currentPage = value;
    },
    setItemsPerPage: (state, action) => {
      const { entityKey, value } = action.payload;
      if (state.entities[entityKey]) state.entities[entityKey].itemsPerPage = Math.min(100, Math.max(5, value));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadData.pending, (state, action) => {
        const arg = action.meta.arg;
        const queryName = typeof arg === 'string' ? arg : (arg?.queryName || 'accounts');
        if (!state.entities[queryName]) state.entities[queryName] = { ...defaultEntity };
        state.entities[queryName].isLoading = true;
        state.entities[queryName].error = null;
      })
      .addCase(loadData.fulfilled, (state, action) => {
        const { queryName, data } = action.payload;
        const payload = data;
        let columns = payload?.columns || [];
        const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
        const pagination = payload?.pagination || {};
        if (columns.length === 0 && rows.length > 0) columns = buildColumns(rows);
        const idKey = getIdKey(columns, rows[0]);
        const normalized = rows.map((r) => normalizeRow(r, columns, idKey));
        if (!state.entities[queryName]) state.entities[queryName] = { ...defaultEntity };
        state.entities[queryName].columns = columns;
        state.entities[queryName].data = normalized;
        state.entities[queryName].originalData = [...normalized];
        state.entities[queryName].currentPage = pagination.page ?? state.entities[queryName].currentPage;
        state.entities[queryName].itemsPerPage = pagination.limit ?? state.entities[queryName].itemsPerPage;
        state.entities[queryName].totalRows = pagination.total ?? normalized.length;
        state.entities[queryName].isLoading = false;
        state.entities[queryName].error = null;
      })
      .addCase(loadData.rejected, (state, action) => {
        const { queryName, error } = action.payload || {};
        if (queryName && state.entities[queryName]) {
          state.entities[queryName].isLoading = false;
          state.entities[queryName].error = error || 'Failed to load';
        }
      });
  },
});

export const { setSearchQuery, setCurrentPage, setItemsPerPage } = dataSlice.actions;

/** Select full entity by key (accounts, subjects, ...). Uses stable default ref to avoid rerenders. */
export const selectEntity = (entityKey) => (state) =>
  state.data.entities[entityKey] || STABLE_DEFAULT_ENTITY;

export const selectColumns = (entityKey) => (state) =>
  (state.data.entities[entityKey] || defaultEntity).columns;

/** Server-side search: API returns filtered page. Data shown = current page from API (no client filter). */
export const selectPaginatedData = (entityKey) => (state) => {
  const e = state.data.entities[entityKey] || defaultEntity;
  return e.data?.length ? e.data : EMPTY_ARRAY;
};

export const selectTotalPages = (entityKey) => (state) => {
  const e = state.data.entities[entityKey] || defaultEntity;
  const total = e.totalRows ?? e.data?.length ?? 0;
  return Math.ceil(total / (e.itemsPerPage || 10)) || 1;
};

export const selectTotalRows = (entityKey) => (state) =>
  (state.data.entities[entityKey] || defaultEntity).totalRows ?? 0;

export default dataSlice.reducer;

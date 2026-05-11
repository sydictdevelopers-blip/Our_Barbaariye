import { useEffect, useMemo, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Database, Plus, Pencil, Trash2, Image as ImageIcon, X, RefreshCw,
  CheckCircle2, Users, ImageOff, AlertCircle,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import SearchInput from '../../../components/ui/SearchInput';
import DataTableCard from '../../../components/DataTableCard';
import {
  crud,
  deleteImageByUrl,
  fetchDataPaginated,
  makeOptionLoader,
  uploadNewStudentImage,
  getSessionUBrIdNum,
} from '../../../services/api';
import { resizeImageToBudget } from '../../../utils/resizeImage';
import { swalError, swalSuccess, swalConfirm } from '../../../utils/swal';

const compactSelectStyle = {
  control: (base) => ({ ...base, minHeight: '40px', height: '40px', fontSize: '14px', borderRadius: '12px' }),
  valueContainer: (base) => ({ ...base, padding: '0 12px' }),
  indicatorsContainer: (base) => ({ ...base, height: '40px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
};

/**
 * HoverPreview — thumbnail that pops up a screen-centered, oversized preview
 * while the pointer hovers it. Uses `position: fixed` + `pointer-events-none`
 * so the blow-up isn't clipped by table-cell overflow and never gets in the
 * way of the mouse leaving the thumbnail. No new tab, no click handler.
 */
function HoverPreview({ src, size = 'w-12 h-12' }) {
  return (
    <span className="relative group inline-block shrink-0">
      <img
        src={src}
        alt="preview"
        className={`${size} rounded-xl object-cover ring-2 ring-emerald-300 dark:ring-emerald-500/50 shadow-sm cursor-zoom-in transition-transform duration-150 group-hover:scale-105`}
      />
      <span
        className="
          pointer-events-none
          invisible group-hover:visible
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          fixed inset-0 z-[60]
          flex items-center justify-center
        "
      >
        <span className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
        {/* Fixed-size square frame so every preview reads at the same scale.
            object-contain keeps the original aspect inside the box (letter-
            boxes wide / tall photos with the white pad instead of cropping). */}
        <span className="relative w-[500px] h-[500px] max-w-[80vw] max-h-[80vh] rounded-2xl shadow-2xl ring-4 ring-white/80 bg-white dark:bg-slate-800 p-3 flex items-center justify-center">
          <img
            src={src}
            alt=""
            className="max-w-full max-h-full w-auto h-auto rounded-xl object-contain"
          />
        </span>
      </span>
    </span>
  );
}

/**
 * Inline image-upload cell. Two visual states:
 *   • value present  → 12×12 thumbnail + green "Saved" badge + "Replace" link
 *   • value missing  → muted placeholder + primary "Choose File" button
 * Upload always streams through uploadNewStudentImage which lands the file in
 * the _pending S3 folder; the surrounding Save-flow is responsible for
 * persisting the URL to the DB and (best-effort) deleting the previous one.
 */
function InlineImageCell({ value, onChange, t }) {
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const inputId = useMemo(() => `bulk-img-${Math.random().toString(36).slice(2, 9)}`, []);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png'];
    const ALLOWED_EXT = /\.(jpe?g|png)$/i;
    const MAX_BYTES = 300 * 1024;
    if (!ALLOWED_MIME.includes(String(f.type || '').toLowerCase()) || !ALLOWED_EXT.test(f.name || '')) {
      setErrMsg(t('crudModal.imageOnly', { defaultValue: 'Only JPG, JPEG, or PNG images are allowed' }));
      return;
    }
    setErrMsg('');
    setBusy(true);
    try {
      const uploadFile = f.size > MAX_BYTES ? await resizeImageToBudget(f, MAX_BYTES) : f;
      const resp = await uploadNewStudentImage(uploadFile);
      const url = resp?.image || '';
      onChange(url);
    } catch (err) {
      setErrMsg(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
      // Reset the input value so picking the SAME file again still fires onChange.
      try { e.target.value = ''; } catch (_) {}
    }
  };

  const hasImage = !!(value && String(value).trim());

  return (
    <div className="flex items-center gap-3">
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        disabled={busy}
        onChange={handleFile}
        className="hidden"
      />
      {hasImage ? (
        <>
          <HoverPreview src={value} />
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('hrm.employees.bulkImage.saved', { defaultValue: 'Saved' })}
          </span>
          <label
            htmlFor={inputId}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors
              ${busy
                ? 'bg-slate-200 text-slate-500 cursor-wait'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'}`}
          >
            {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
            {t('hrm.employees.bulkImage.replace', { defaultValue: 'Replace' })}
          </label>
        </>
      ) : (
        <>
          <span className="shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-600">
            <ImageIcon className="w-6 h-6" />
          </span>
          <label
            htmlFor={inputId}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors
              ${busy
                ? 'bg-slate-200 text-slate-500 cursor-wait'
                : 'bg-[#0f3d5e] hover:bg-[#0a2a3d] text-white'}`}
          >
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            {t('hrm.employees.bulkImage.choose', { defaultValue: 'Choose File' })}
          </label>
          <span className="text-xs text-slate-400 italic">
            {t('hrm.employees.bulkImage.noFile', { defaultValue: 'No file chosen' })}
          </span>
        </>
      )}
      {errMsg && <span className="text-xs text-rose-600">{errMsg}</span>}
    </div>
  );
}

const EmployeesTab = forwardRef(function EmployeesTab({ openModal }, ref) {
  const { t } = useTranslation();
  const sessionBrId = useSelector((s) => s?.ui?.user?.br_id ?? '');
  const sessionUBrId = getSessionUBrIdNum();

  const shiftLoader = useMemo(
    () => makeOptionLoader('shift_options', null, { valueKey: 'sh_id', labelKey: 'shift_name' }),
    []
  );

  // Shift filter (optional — empty means "all shifts").
  const [shId, setShId] = useState('');
  const [shLabel, setShLabel] = useState('');
  // 'list' = the read-only employee table; 'bulk-image' = the editable
  // per-row name + image patch panel.
  const [view, setView] = useState('list');

  // List view state.
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  // Separate loading flags so the spinner on one button doesn't tag the
  // other — Show Data should never look busy because Add Image is fetching.
  const [loadingList, setLoadingList] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);
  // Client-side pagination + search keep the table snappy even on a 500-row
  // branch — the backend hands us the slice once, the table just re-renders
  // a window onto it.
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk image view state. Each image is persisted to the DB the moment the
  // user picks it (auto-save), so there is no "Save Info" buffer or pending
  // changes map any more — only a per-row status indicator so the row tells
  // the user whether it is uploading, saved, or failed.
  const [bulkRows, setBulkRows] = useState([]);
  // emp_id → 'saving' | 'saved' | 'error' — drives the row-level pill.
  const [bulkRowStatus, setBulkRowStatus] = useState({});
  // emp_id → error message string (only set when status === 'error').
  const [bulkRowError, setBulkRowError] = useState({});
  // Free-text search lets the user find one person inside a 2k-employee shift
  // without paginating. All rows are mounted at once so the list scrolls.
  const [bulkSearch, setBulkSearch] = useState('');

  // Counts for the stats banner — recomputed from the live bulkRows so the
  // numbers tick up as the user uploads.
  const bulkStats = useMemo(() => {
    const total = bulkRows.length;
    const withImg = bulkRows.filter((r) => r.image && String(r.image).trim()).length;
    return { total, withImg, withoutImg: total - withImg };
  }, [bulkRows]);

  // Name search — matches against the row's p_name so the user can jump to a
  // specific person inside a long shift without paginating.
  const bulkFiltered = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    if (!q) return bulkRows;
    return bulkRows.filter((r) =>
      String(r?.p_name ?? '').toLowerCase().includes(q)
    );
  }, [bulkRows, bulkSearch]);

  // Show Data — fetches the full employee_show output and lets the table
  // page/filter client-side. The DB query and the visible rows match 1:1
  // with what pgAdmin returns; pagination only changes how the slice is
  // rendered, never what was sent over the wire.
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetchDataPaginated({ queryName: 'Employees' });
      const data = res?.data ?? [];
      const apiCols = Array.isArray(res?.columns) ? res.columns : [];
      const HIDE = new Set(['p_id', 'sh_id', 'j_id', 'tt_id', 'br_id', 'u_br_id', 'ad_id']);
      setColumns(apiCols.filter((c) => !HIDE.has(c.key)));
      setRows(data);
      setTableLoaded(true);
      setCurrentPage(1);
      setSearchQuery('');
      // Snap back from bulk-image so Show Data always reveals the list.
      setView('list');
      setBulkRows([]);
      setBulkRowStatus({});
      setBulkRowError({});
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    } finally {
      setLoadingList(false);
    }
  }, [t]);

  // Client-side filter + slice — instant once the data is in memory.
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r || {}).some((v) =>
        String(v ?? '').toLowerCase().includes(q)
      )
    );
  }, [rows, searchQuery]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Add Image — calls employees_by_shift_show(sh_id, br_id). Shift is REQUIRED
  // here so the bulk panel only ever surfaces the small subset the user picked,
  // never the full branch payroll.
  const loadBulk = useCallback(async () => {
    if (!shId) {
      swalError(t('swal.titles.warning'), t('hrm.employees.bulkImage.needShift'));
      return;
    }
    setLoadingBulk(true);
    try {
      // employees_by_shift_show is prePaginated server-side (returns the full
      // shift in one shot). Asking for a giant limit is harmless and guards
      // against the 1000-row cap silently truncating very large shifts.
      const res = await fetchDataPaginated({
        queryName: 'EmployeesByShift',
        page: 1,
        limit: 100000,
        sh_id: Number(shId),
      });
      const data = res?.data ?? [];
      setBulkRows(data);
      // Fresh load wipes any leftover per-row save badges from a previous
      // session so old success/error pills don't bleed into the new shift.
      setBulkRowStatus({});
      setBulkRowError({});
      setBulkSearch('');
      setView('bulk-image');
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    } finally {
      setLoadingBulk(false);
    }
  }, [shId, t]);

  // Bulk panel is shift-scoped — clear it if the user changes the dropdown
  // mid-edit. The Show-Data list is branch-scoped, so it stays untouched.
  useEffect(() => {
    if (view === 'bulk-image') setView('list');
    setBulkRows([]);
    setBulkRowStatus({});
    setBulkRowError({});
    setBulkSearch('');
  }, [shId]);

  useImperativeHandle(ref, () => ({ refresh: loadList }), [loadList]);

  const renderImage = (val) => {
    if (!val) return <span className="text-xs text-slate-400">—</span>;
    return <HoverPreview src={val} size="w-10 h-10" />;
  };

  const renderActions = (row) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => openModal('Employees')(row)}
        aria-label={t('action.edit')}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onDeleteRow(row)}
        aria-label={t('action.delete')}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const onDeleteRow = async (row) => {
    const ok = await swalConfirm({
      title: t('swal.titles.confirmDelete'),
      text: t('entity.confirmDeleteRecord'),
    });
    if (!ok) return;
    try {
      // 19 zero/empty stubs + emp_id + 'delete' — same shape as Employee Office
      // delete elsewhere; the SP only consults emp_id_sp + oper for delete path.
      const result = await crud({
        operation: 'delete',
        fn: 'employee_sp',
        params: {
          emp_id_sp: row.emp_id,
          name_sp: '', tell_sp: '', sex_sp: '', email_sp: '',
          add_id_sp: 0, sh_id_sp: 0, j_id_sp: 0, tt_id_sp: 0,
          emp_type_sp: '', salary_type_sp: '', salary_sp: 0, degree_sp: '',
          br_id_sp: 0, cv_sp: '', image_sp: '', hired_date_sp: null, u_br_id_sp: 0,
        },
      });
      const replyText = typeof result === 'string' ? result : (result?.message || '');
      const isWarning = /already\s+exists?|not\s+registered|in\s+use|cannot\s+(?:delete|change)/i.test(replyText);
      if (isWarning) {
        swalError(t('swal.titles.notSucceeded'), replyText);
      } else {
        swalSuccess(t('swal.titles.success'), replyText);
      }
      await loadList();
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    }
  };

  // ── Bulk image panel handlers ───────────────────────────────────────────
  // Auto-save: triggered by InlineImageCell as soon as the user picks a file.
  // The cell has already uploaded the file to the S3 _pending folder and
  // resolved a URL — this handler persists that URL on the employee row via
  // employee_quick_update_sp and, on success, fire-and-forgets cleanup of
  // the previous S3 object so the bucket doesn't accumulate orphans.
  const handleImageSelected = useCallback(async (empId, newUrl) => {
    const row = bulkRows.find((r) => r.emp_id === empId);
    if (!row) return;
    const oldUrl = row.image || '';
    // Optimistic UI: show the new image immediately and mark the row as
    // saving. If the SP fails we'll roll back and surface the error.
    setBulkRows((prev) => prev.map((r) => (r.emp_id === empId ? { ...r, image: newUrl } : r)));
    setBulkRowStatus((prev) => ({ ...prev, [empId]: 'saving' }));
    setBulkRowError((prev) => {
      if (!prev[empId]) return prev;
      const next = { ...prev };
      delete next[empId];
      return next;
    });

    try {
      await crud({
        operation: 'update',
        fn: 'employee_quick_update_sp',
        params: {
          emp_id_sp: Number(empId),
          p_name_sp: row.p_name ?? '',
          image_sp: newUrl,
          u_br_id_sp: sessionUBrId,
        },
      });
      setBulkRowStatus((prev) => ({ ...prev, [empId]: 'saved' }));
      // Old image is now orphaned in S3 — best-effort cleanup, failures are
      // silent so a 404 on a missing object doesn't surface to the user.
      if (oldUrl && oldUrl !== newUrl) {
        deleteImageByUrl(oldUrl).catch(() => {});
      }
    } catch (err) {
      // Roll back the optimistic update so the row reflects DB truth.
      setBulkRows((prev) => prev.map((r) => (r.emp_id === empId ? { ...r, image: oldUrl } : r)));
      setBulkRowStatus((prev) => ({ ...prev, [empId]: 'error' }));
      setBulkRowError((prev) => ({ ...prev, [empId]: err?.message || 'Save failed' }));
    }
  }, [bulkRows, sessionUBrId]);

  return (
    <div className="space-y-3">
      {/* Toolbar — always visible. Left: shift filter + Add Image. Right: Add New + Show Data. */}
      <div className="flex flex-wrap items-center gap-3 px-2">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Select2
            key={`sh-${sessionBrId}`}
            name="sh_id"
            value={shId}
            selectedLabel={shLabel}
            placeholder={t('hrm.employees.ph.shift')}
            loadOptions={shiftLoader}
            onChange={(e) => {
              setShId(e.target.value);
              setShLabel(e.target.label || '');
            }}
            styles={compactSelectStyle}
          />
        </div>
        <Button
          size="md"
          variant="primary"
          leftIcon={loadingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          onClick={loadBulk}
          disabled={loadingBulk}
        >
          {t('hrm.employees.addImage', { defaultValue: 'Add Image' })}
        </Button>
        <div className="flex flex-wrap items-center gap-2 ms-auto">
          <Button
            size="md"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => openModal('Employees')(null)}
          >
            {t('hrm.employees.addNew', { defaultValue: 'Add New Employee' })}
          </Button>
          <Button
            size="md"
            variant="primary"
            leftIcon={loadingList ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            onClick={loadList}
            disabled={loadingList}
          >
            {t('action.showData')}
          </Button>
        </div>
      </div>

      {view === 'bulk-image' && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30">
          {/* Stats banner — three soft pills surface the totals the user
              cares about while uploading. The numbers update live as files
              are picked because bulkStats reads from bulkRows. The search
              box on the right narrows the visible rows to one name. */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-r from-slate-50/70 to-white dark:from-slate-800/50 dark:to-slate-900/40 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30">
              <Users className="w-3.5 h-3.5" />
              <span>{t('hrm.employees.bulkImage.totalShift', { defaultValue: 'Total in shift' })}:</span>
              <strong className="tabular-nums">{bulkStats.total}</strong>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('hrm.employees.bulkImage.withImage', { defaultValue: 'With image' })}:</span>
              <strong className="tabular-nums">{bulkStats.withImg}</strong>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
              <ImageOff className="w-3.5 h-3.5" />
              <span>{t('hrm.employees.bulkImage.noImage', { defaultValue: 'No image' })}:</span>
              <strong className="tabular-nums">{bulkStats.withoutImg}</strong>
            </span>
            <SearchInput
              className="ms-auto"
              placeholder={t('hrm.employees.bulkImage.searchPh', { defaultValue: 'Search by name…' })}
              value={bulkSearch}
              onChange={(e) => setBulkSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-[#0B3C5D] to-[#0f4a6f] text-white">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-start font-semibold uppercase text-[11px] tracking-wider w-16">
                    {t('hrm.employees.bulkImage.cols.id', { defaultValue: 'ID' })}
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-start font-semibold uppercase text-[11px] tracking-wider">
                    {t('hrm.employees.bulkImage.cols.name', { defaultValue: 'Name' })}
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-start font-semibold uppercase text-[11px] tracking-wider">
                    {t('hrm.employees.bulkImage.cols.image', { defaultValue: 'Image' })}
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-start font-semibold uppercase text-[11px] tracking-wider w-32">
                    {t('hrm.employees.bulkImage.cols.status', { defaultValue: 'Status' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bulkFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-slate-400 italic">
                      {t('hrm.employees.bulkImage.empty', { defaultValue: 'No employees found' })}
                    </td>
                  </tr>
                ) : (
                  bulkFiltered.map((row, idx) => {
                    const status = bulkRowStatus[row.emp_id];
                    const errMsg = bulkRowError[row.emp_id];
                    return (
                      <tr
                        key={row.emp_id}
                        className={`border-b border-slate-100 dark:border-slate-700/60 transition-colors
                          ${idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900/20'}
                          ${status === 'error' ? 'ring-1 ring-inset ring-rose-200 dark:ring-rose-500/30 bg-rose-50/30 dark:bg-rose-500/5' : ''}
                          ${status === 'saving' ? 'ring-1 ring-inset ring-sky-200 dark:ring-sky-500/30 bg-sky-50/20 dark:bg-sky-500/5' : ''}
                          hover:bg-slate-50/80 dark:hover:bg-slate-800/40`}
                      >
                        <td className="px-3 sm:px-4 py-3 align-middle font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                          {idx + 1}
                        </td>
                        <td className="px-3 sm:px-4 py-3 align-middle text-sm text-slate-700 dark:text-slate-200">
                          {row.p_name || '—'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 align-middle">
                          <InlineImageCell
                            value={row.image || ''}
                            onChange={(url) => handleImageSelected(row.emp_id, url)}
                            t={t}
                          />
                        </td>
                        <td className="px-3 sm:px-4 py-3 align-middle">
                          {status === 'saving' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              {t('hrm.employees.bulkImage.saving', { defaultValue: 'Saving…' })}
                            </span>
                          )}
                          {status === 'saved' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t('hrm.employees.bulkImage.savedDb', { defaultValue: 'Saved' })}
                            </span>
                          )}
                          {status === 'error' && (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
                              title={errMsg}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {t('hrm.employees.bulkImage.errorDb', { defaultValue: 'Failed' })}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Sticky close-only action bar — auto-save means there is no Save
              Info button any more; the user closes the panel when finished. */}
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 px-4 py-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-t border-slate-200/80 dark:border-slate-700/60 shadow-[0_-4px_12px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.5)]">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<X className="w-4 h-4" />}
              onClick={() => setView('list')}
            >
              {t('action.close', { defaultValue: 'Close' })}
            </Button>
          </div>
        </div>
      )}

      {view === 'list' && tableLoaded && (
        <DataTableCard
          showDataPanel
          columns={columns.map((c) =>
            c.key === 'image'
              ? { ...c, render: (row, value) => renderImage(value) }
              : c
          )}
          data={pagedRows}
          isLoading={loadingList}
          renderActions={renderActions}
          rowKey="emp_id"
          searchValue={searchQuery}
          onSearchChange={(e) => { setSearchQuery(e?.target?.value ?? ''); setCurrentPage(1); }}
          onSearchSubmit={() => {}}
          total={totalRows}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={pageSize}
          onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          onPageClick={(p) => setCurrentPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
        />
      )}
    </div>
  );
});

export default EmployeesTab;

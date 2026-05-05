import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardEdit, Eye, RefreshCw, Save, Search, X } from 'lucide-react';
import Select2 from '../../../components/ui/Select2';
import EmptyState from '../../../components/ui/EmptyState';
import {
  dedupeRequest,
  fetchDataPaginated,
  fetchSelectOptions,
  getSessionUBrIdNum,
  makeOptionLoader,
  runBulk,
} from '../../../services/api';
import { getSessionBrId } from '../../../config/crudConfig';
import { swalError, swalSuccess } from '../../../utils/swal';

const FAILURE_PATTERN = /lock|locked|not\s+registered|not\s+found|denied|forbidden|userlock|notreg|invalid/i;

const LABEL_CLS = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5';
const INPUT_CLS = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/30 focus:border-[#0f3d5e] text-sm';
const SELECT_CLS = `${INPUT_CLS} pr-7`;

/**
 * Student Performance Edit — inline bulk editor.
 *
 * Filter Class + Batch, click Show. Each row's Performance / Rating / Reason
 * is editable inline; UPDATE DATA fans the dirty rows out through a single
 * /api/bulk transaction calling student_performance_sp.
 *
 * Source: studentperformance_edit(p_class_id, p_batch_id, p_branch_id) returns
 * st_per_id + std_cl_id + per_id + rate_id alongside human-readable labels so
 * inline edits can save without an extra lookup round-trip.
 */
export default function StudentPerformanceEditTab() {
  const { t } = useTranslation();

  const sessionBrId = Number(getSessionBrId()) || 0;
  const sessionUBrId = getSessionUBrIdNum();

  const [filterClass, setFilterClass] = useState('');
  const [filterClassLabel, setFilterClassLabel] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterBatchLabel, setFilterBatchLabel] = useState('');

  const classLoader = useMemo(() => makeOptionLoader('class_options'), []);
  const batchLoader = useMemo(
    () => makeOptionLoader('batch_options', () => ({ cl_id: filterClass })),
    [filterClass]
  );

  const [rows, setRows] = useState([]);
  const [edited, setEdited] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [search, setSearch] = useState('');

  const [perfOptions, setPerfOptions] = useState([]);
  const [rateOptions, setRateOptions] = useState([]);
  const perfOptionsRef = useRef([]);
  const rateOptionsRef = useRef([]);
  const optionsCacheRef = useRef({ loaded: false });

  const ensureOptionsLoaded = useCallback(async () => {
    if (optionsCacheRef.current.loaded) return;
    const [perfRes, rateRes] = await Promise.all([
      fetchSelectOptions('performance_options', 200, '', {}).catch(() => ({})),
      fetchSelectOptions('rate_options', 200, '', {}).catch(() => ({})),
    ]);
    const perf = (perfRes?.data ?? []).map((r) => ({ value: String(r.per_id), label: String(r.performance_name ?? '') }));
    const rate = (rateRes?.data ?? []).map((r) => ({ value: String(r.rate_id), label: String(r.rate ?? '') }));
    setPerfOptions(perf);
    setRateOptions(rate);
    perfOptionsRef.current = perf;
    rateOptionsRef.current = rate;
    optionsCacheRef.current.loaded = true;
  }, []);

  const handleShow = async () => {
    if (!filterClass || !filterBatch) {
      swalError(t('studentPerformanceEdit.errFiltersRequired'));
      return;
    }
    setLoading(true);
    try {
      await ensureOptionsLoaded();
      const key = `StudentPerformanceEdit:${filterClass}:${filterBatch}:${sessionBrId}`;
      const res = await dedupeRequest(key, () => fetchDataPaginated({
        queryName: 'StudentPerformanceEdit',
        page: 1,
        limit: 1000,
        cl_id: filterClass,
        b_id: filterBatch,
        br_id: sessionBrId,
      }));
      const raw = (res?.data ?? []).filter((r) => r.st_per_id != null);

      // Older versions of studentperformance_edit() return only labels (no IDs).
      // Resolve per_id / rate_id from the loaded option lists by matching the
      // label text so the dropdowns still preselect correctly.
      const perfByLabel = new Map(perfOptionsRef.current.map((o) => [o.label.trim().toLowerCase(), o.value]));
      const rateByLabel = new Map(rateOptionsRef.current.map((o) => [o.label.trim().toLowerCase(), o.value]));
      const list = raw.map((r) => {
        const next = { ...r };
        if (next.per_id == null && next.performance) {
          const v = perfByLabel.get(String(next.performance).trim().toLowerCase());
          if (v) next.per_id = Number(v);
        }
        if (next.rate_id == null && next.rate) {
          const v = rateByLabel.get(String(next.rate).trim().toLowerCase());
          if (v) next.rate_id = Number(v);
        }
        return next;
      });

      setRows(list);
      setEdited({});
      setLoaded(true);
    } catch (e) {
      swalError(e?.message || t('studentPerformanceEdit.errLoad'));
    } finally {
      setLoading(false);
    }
  };

  const setField = (id, key, value) => {
    setEdited((prev) => {
      const cur = prev[id] ?? {};
      return { ...prev, [id]: { ...cur, [key]: value } };
    });
  };

  const valueOf = (row, key) => {
    const e = edited[row.st_per_id];
    if (e && Object.prototype.hasOwnProperty.call(e, key)) return e[key] ?? '';
    if (key === 'per_id')  return row.per_id  != null ? String(row.per_id)  : '';
    if (key === 'rate_id') return row.rate_id != null ? String(row.rate_id) : '';
    return row[key] ?? '';
  };

  const isRowDirty = useCallback((row) => {
    const e = edited[row.st_per_id];
    if (!e) return false;
    if (e.per_id  !== undefined && String(e.per_id)  !== String(row.per_id  ?? '')) return true;
    if (e.rate_id !== undefined && String(e.rate_id) !== String(row.rate_id ?? '')) return true;
    if (e.reason  !== undefined && (e.reason ?? '')  !== (row.reason ?? ''))        return true;
    return false;
  }, [edited]);

  const dirtyRows = useMemo(() => rows.filter(isRowDirty), [rows, isRowDirty]);
  const dirtyRowSet = useMemo(() => new Set(dirtyRows.map((r) => r.st_per_id)), [dirtyRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (
      String(r.student     || '').toLowerCase().includes(q) ||
      String(r.class       || '').toLowerCase().includes(q) ||
      String(r.performance || '').toLowerCase().includes(q) ||
      String(r.rate        || '').toLowerCase().includes(q) ||
      String(r.reason      || '').toLowerCase().includes(q)
    ));
  }, [rows, search]);

  const handleUpdateAll = async () => {
    if (!sessionUBrId) {
      swalError(t('studentPerformanceEdit.errNoSession'));
      return;
    }
    if (dirtyRows.length === 0) return;

    setSavingAll(true);
    try {
      // Param order must match studentperformance_update signature:
      // (p_st_per_id, p_per_id, p_rate_id, p_reason, p_u_br_id)
      const steps = dirtyRows.map((row) => ({
        type: 'sp',
        fn: 'studentperformance_update',
        params: [
          Number(row.st_per_id),
          Number(valueOf(row, 'per_id'))  || 0,
          Number(valueOf(row, 'rate_id')) || 0,
          String(valueOf(row, 'reason') ?? '').trim(),
          sessionUBrId,
        ],
      }));

      let bulkRes;
      try {
        bulkRes = await runBulk(steps);
      } catch (err) {
        swalError(err?.message || t('studentPerformanceEdit.errSave'));
        return;
      }

      const stepResults = Array.isArray(bulkRes?.results) ? bulkRes.results : [];

      const successById = {};
      const failures = [];
      const successMsgs = [];
      let okCount = 0;

      dirtyRows.forEach((row, i) => {
        const stepRows = stepResults[i] || [];
        const text = stepRows[0] ? String(Object.values(stepRows[0])[0] ?? '').trim() : '';
        if (text && FAILURE_PATTERN.test(text)) {
          failures.push({ id: row.st_per_id, message: text });
        } else {
          okCount += 1;
          successById[row.st_per_id] = true;
          if (text) successMsgs.push(text);
        }
      });

      // Commit successful edits back into the rows array so subsequent dirty
      // checks compare against the new baseline.
      setRows((prev) => prev.map((r) => {
        if (!successById[r.st_per_id]) return r;
        const e = edited[r.st_per_id] ?? {};
        const next = { ...r };
        if (e.per_id  !== undefined) {
          next.per_id      = Number(e.per_id) || null;
          const opt = perfOptions.find((o) => o.value === String(e.per_id));
          if (opt) next.performance = opt.label;
        }
        if (e.rate_id !== undefined) {
          next.rate_id     = Number(e.rate_id) || null;
          const opt = rateOptions.find((o) => o.value === String(e.rate_id));
          if (opt) next.rate = opt.label;
        }
        if (e.reason !== undefined) next.reason = e.reason ?? '';
        return next;
      }));
      setEdited((prev) => {
        const next = { ...prev };
        Object.keys(successById).forEach((id) => { delete next[id]; });
        return next;
      });

      if (failures.length === 0) {
        const uniq = Array.from(new Set(successMsgs));
        const text = uniq.length === 1 ? uniq[0] : (uniq[0] || t('studentPerformanceEdit.msgSaved'));
        await swalSuccess('', text);
      } else if (okCount === 0) {
        const uniqFails = Array.from(new Set(failures.map((f) => f.message)));
        const msg = uniqFails.length === 1
          ? uniqFails[0]
          : failures.map((f) => `#${f.id}: ${f.message}`).join('\n');
        swalError('', msg);
      } else {
        const msg = `${t('studentPerformanceEdit.bulkPartial', { ok: okCount, fail: failures.length })}\n${failures.map((f) => `#${f.id}: ${f.message}`).join('\n')}`;
        swalError('', msg);
      }
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900/40 border-b border-slate-200/70 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('studentPerformanceEdit.filtersTitle')}
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3.5 items-end">
          <div>
            <label htmlFor="spe-filter-class" className={LABEL_CLS}>{t('studentPerformanceEdit.filters.class')}</label>
            <Select2
              inputId="spe-filter-class"
              name="spe-filter-class"
              value={filterClass}
              selectedLabel={filterClassLabel}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setFilterClassLabel(e.target.label || '');
                setFilterBatch('');
                setFilterBatchLabel('');
              }}
              loadOptions={classLoader}
              placeholder={t('select.class')}
            />
          </div>
          <div>
            <label htmlFor="spe-filter-batch" className={LABEL_CLS}>{t('studentPerformanceEdit.filters.batch')}</label>
            <Select2
              key={`spe-batch-${filterClass}`}
              inputId="spe-filter-batch"
              name="spe-filter-batch"
              value={filterBatch}
              selectedLabel={filterBatchLabel}
              onChange={(e) => { setFilterBatch(e.target.value); setFilterBatchLabel(e.target.label || ''); }}
              loadOptions={batchLoader}
              isDisabled={!filterClass}
              placeholder={filterClass ? t('select.batch') : t('select.pickClassFirst')}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleShow}
              disabled={!filterClass || !filterBatch || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#0f3d5e] to-[#1a6296] text-white text-sm font-semibold shadow-md shadow-[#0f3d5e]/20 hover:shadow-lg hover:from-[#0b3052] hover:to-[#155680] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {loading ? t('action.loading') : t('studentPerformanceEdit.editBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Empty / not loaded ── */}
      {!loaded && !loading && (
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/40 py-12">
          <EmptyState
            title={t('empty.notLoaded')}
            description={t('studentPerformanceEdit.emptyHint')}
          />
        </div>
      )}

      {/* ── Editor card ── */}
      {loaded && (
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-lg ring-1 ring-slate-200/80 dark:ring-slate-700/70 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#0f3d5e] via-[#15507a] to-[#1a6296] text-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                <ClipboardEdit className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight">{t('studentPerformanceEdit.title')}</h3>
                <p className="text-xs text-white/70 mt-0.5">{t('studentPerformanceEdit.subtitle')}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[11px] font-medium">
                <span className="opacity-80">{t('studentPerformanceEdit.statTotal')}</span>
                <span className="font-bold">{rows.length}</span>
              </span>
              {dirtyRows.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/25 ring-1 ring-amber-200/40 text-[11px] font-semibold animate-pulse">
                  <span>{t('studentPerformanceEdit.statPending')}</span>
                  <span className="font-bold">{dirtyRows.length}</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleShow}
                disabled={loading || savingAll}
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('studentPerformanceEdit.refresh')}
                title={t('studentPerformanceEdit.refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="spe-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('studentPerformanceEdit.searchPlaceholder')}
                className="w-full pl-9 pr-9 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a6296]/30 focus:border-[#1a6296]/50 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
                  aria-label="clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto max-h-[60vh]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-[#1a6296]" />
                <span className="text-sm">{t('action.loading')}</span>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                {rows.length === 0 ? t('empty.noData') : t('studentPerformanceEdit.noMatch')}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#0f3d5e] text-white sticky top-0 z-10">
                  <tr>
                    <th className="text-start px-4 py-3 font-semibold">{t('studentPerformanceEdit.cols.student')}</th>
                    <th className="text-start px-4 py-3 font-semibold w-32">{t('studentPerformanceEdit.cols.class')}</th>
                    <th className="text-start px-4 py-3 font-semibold w-56">{t('studentPerformanceEdit.cols.performance')}</th>
                    <th className="text-start px-4 py-3 font-semibold w-48">{t('studentPerformanceEdit.cols.rating')}</th>
                    <th className="text-start px-4 py-3 font-semibold">{t('studentPerformanceEdit.cols.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => {
                    const isDirty = dirtyRowSet.has(r.st_per_id);
                    const perfId = `spe-perf-${r.st_per_id}`;
                    const rateId = `spe-rate-${r.st_per_id}`;
                    const reasonId = `spe-reason-${r.st_per_id}`;
                    return (
                      <tr
                        key={r.st_per_id}
                        className={`border-t border-slate-200 dark:border-slate-700 transition ${
                          isDirty ? 'bg-amber-50/70 dark:bg-amber-900/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-100 font-medium">{r.student}</td>
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.class}</td>
                        <td className="px-4 py-2">
                          <select
                            id={perfId}
                            className={SELECT_CLS}
                            value={String(valueOf(r, 'per_id') ?? '')}
                            onChange={(e) => setField(r.st_per_id, 'per_id', e.target.value)}
                          >
                            <option value="">—</option>
                            {perfOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            id={rateId}
                            className={SELECT_CLS}
                            value={String(valueOf(r, 'rate_id') ?? '')}
                            onChange={(e) => setField(r.st_per_id, 'rate_id', e.target.value)}
                          >
                            <option value="">—</option>
                            {rateOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            id={reasonId}
                            type="text"
                            className={INPUT_CLS}
                            value={String(valueOf(r, 'reason') ?? '')}
                            onChange={(e) => setField(r.st_per_id, 'reason', e.target.value)}
                            placeholder={t('studentPerformanceEdit.cols.reason')}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          {rows.length > 0 && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-slate-200/70 dark:border-slate-600/60 bg-slate-50/60 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={handleUpdateAll}
                disabled={savingAll || dirtyRows.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#0f3d5e] to-[#1a6296] text-white text-sm font-bold uppercase tracking-wide shadow-md shadow-[#0f3d5e]/20 hover:shadow-lg hover:from-[#0b3052] hover:to-[#155680] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {savingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('studentPerformanceEdit.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('studentPerformanceEdit.updateData')}
                    {dirtyRows.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-md bg-white/20 text-xs font-extrabold">
                        {dirtyRows.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

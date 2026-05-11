import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Pencil, Save, User, Calendar as CalendarIcon } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DateInput from '../../../components/ui/DateInput';
import { crud, fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalError, swalSuccess, swalConfirmAction } from '../../../utils/swal';

/**
 * AttendanceEditTab — Attendance Edit tab.
 *
 * Filters: Student + From Date + To Date (between range).
 * EDIT     → vw_student_attendance_edit(from, to, std_id) via queryName
 *            'StudentAttendanceEdit'. Returns rows (id=std_att_id, reg_date,
 *            day_name, pr_id, period_name, st_att_id, state, reason, message).
 *            Message-row pattern (id NULL + message set) → empty state.
 *
 * In-table: Date / Day / Period are read-only. State is an inline <select>
 *            loaded from state_attendance_options; Reason is a free text.
 *
 * UPDATE DATA → student_attendance_sp(p_id, p_student, p_period, p_state,
 *            p_reason, p_reg_date, u_br_id_sp, oper='update'). One call per
 *            modified row (parallel, bounded concurrency). u_br_id_sp is
 *            JWT-injected on the backend.
 */
export default function AttendanceEditTab() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);

  const [studentSel, setStudentSel] = useState({ id: '', label: '' });
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const studentLoader = useMemo(
    () => makeOptionLoader('attendance_edit_student_options', null, { valueKey: 'std_id', labelKey: 'p_name' }),
    []
  );

  // State options loaded once on tab mount. List: { st_att_id, state }.
  const [stateOptions, setStateOptions] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetchDataPaginated({ queryName: 'state_attendance_options', page: 1, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res?.rows ?? [];
        setStateOptions(data.filter((r) => r?.st_att_id != null));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Editable rows. `original` keeps a snapshot to compute the diff on Update.
  const [editRows, setEditRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });

  const handleEdit = useCallback(async () => {
    if (!studentSel.id) {
      swalError(t('attendanceEdit.selectStudentRequired', 'Please select a Student'), '');
      return;
    }
    if (!fromDate) {
      swalError(t('attendanceEdit.fromDateRequired', 'Please select From Date'), '');
      return;
    }
    if (!toDate) {
      swalError(t('attendanceEdit.toDateRequired', 'Please select To Date'), '');
      return;
    }
    if (toDate < fromDate) {
      swalError(t('attendanceEdit.invalidDateRange', 'To Date must be on or after From Date'), '');
      return;
    }
    setLoading(true);
    setEmptyMessage('');
    setEditRows([]);
    setOriginalRows([]);
    try {
      const res = await fetchDataPaginated({
        queryName: 'StudentAttendanceEdit',
        page: 1,
        limit: 1000,
        from_date: fromDate,
        to_date: toDate,
        std_id: studentSel.id,
      });
      const data = res?.data ?? res?.rows ?? [];
      const real = [];
      let msg = '';
      data.forEach((row) => {
        if (row && (row.id == null || row.id === '') && row.message) {
          if (!msg) msg = row.message;
          return;
        }
        real.push(row);
      });
      setEditRows(real.map((r) => ({ ...r })));
      setOriginalRows(real.map((r) => ({ ...r })));
      if (real.length === 0) setEmptyMessage(msg || '');
      setLoaded(true);
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed to load');
      setEditRows([]);
      setOriginalRows([]);
      setEmptyMessage('');
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [studentSel.id, fromDate, toDate, t]);

  const updateRow = (id, patch) => {
    setEditRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  // Diff vs original. A row is "changed" if st_att_id or reason differs.
  const changedRows = useMemo(() => {
    const byId = new Map(originalRows.map((r) => [r.id, r]));
    return editRows.filter((r) => {
      const o = byId.get(r.id);
      if (!o) return false;
      return (Number(r.st_att_id) !== Number(o.st_att_id))
        || (String(r.reason ?? '') !== String(o.reason ?? ''));
    });
  }, [editRows, originalRows]);

  const handleUpdate = useCallback(() => {
    if (changedRows.length === 0) {
      swalError(t('attendanceEdit.noChanges', 'No changes to update'), '');
      return;
    }
    swalConfirmAction({
      title: t('swal.titles.confirm', 'Confirm'),
      text: t('attendanceEdit.updateConfirm', 'Update the modified attendance records?'),
      confirmText: t('common.update', 'Update'),
      confirmColor: '#0B3C5D',
      onConfirm: async () => {
        setSaving(true);
        setSaveProgress({ done: 0, total: changedRows.length });
        let okCount = 0;
        let errCount = 0;
        const sampleErrors = [];

        const CONC = 6;
        let cursor = 0;
        const runOne = async () => {
          while (true) {
            const i = cursor++;
            if (i >= changedRows.length) return;
            const row = changedRows[i];
            try {
              await crud({
                operation: 'update',
                fn: 'student_attendance_sp',
                params: {
                  p_id: Number(row.id) || 0,
                  p_student: Number(studentSel.id) || 0,
                  p_period: Number(row.pr_id) || 0,
                  p_state: Number(row.st_att_id) || 0,
                  p_reason: row.reason || '',
                  p_reg_date: row.reg_date,
                  u_br_id_sp: 0, // backend overrides from JWT
                },
              });
              okCount++;
            } catch (e) {
              errCount++;
              if (sampleErrors.length < 3) sampleErrors.push(e?.message || 'Failed');
            }
            setSaveProgress((p) => ({ ...p, done: p.done + 1 }));
          }
        };

        try {
          await Promise.all(Array(Math.min(CONC, changedRows.length)).fill(0).map(runOne));
          // Reset originalRows to current editRows so subsequent diffs work.
          setOriginalRows(editRows.map((r) => ({ ...r })));
          const summary = `${t('common.saved', 'La keydiyay')}: ${okCount}` +
            (errCount ? ` · ${t('common.errors', 'Khaladaad')}: ${errCount}` : '');
          if (errCount > 0) {
            return { message: `${summary}\n${sampleErrors.join('\n')}` };
          }
          swalSuccess(t('common.done', 'La sameeyay'), summary);
        } finally {
          setSaving(false);
          setSaveProgress({ done: 0, total: 0 });
        }
      },
    });
  }, [changedRows, editRows, studentSel.id, t]);

  const labelCls =
    'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5';
  const labelIconCls = 'w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400';
  const dateInputCls =
    'w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/20 focus:border-[#0f3d5e]';

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="lg:col-span-1">
            <label className={labelCls}>
              <User className={labelIconCls} />
              <span>{t('attendanceEdit.selectStudent', 'Select Student')}</span>
            </label>
            <Select2
              name="student"
              value={studentSel.id}
              selectedLabel={studentSel.label}
              onChange={(e) => setStudentSel({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={studentLoader}
              placeholder={t('attendanceEdit.selectStudent', 'Select Student')}
              isClearable={false}
            />
          </div>
          <div>
            <label className={labelCls}>
              <CalendarIcon className={labelIconCls} />
              <span>{t('attendanceEdit.fromDate', 'From Date')}</span>
            </label>
            <DateInput value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={dateInputCls} />
          </div>
          <div>
            <label className={labelCls}>
              <CalendarIcon className={labelIconCls} />
              <span>{t('attendanceEdit.toDate', 'To Date')}</span>
            </label>
            <DateInput value={toDate} onChange={(e) => setToDate(e.target.value)} className={dateInputCls} />
          </div>
          <div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Pencil className="w-4 h-4" />}
              onClick={handleEdit}
              disabled={loading}
            >
              {t('attendanceEdit.edit', 'Edit')}
            </Button>
          </div>
        </div>
      </div>

      {/* Result panel */}
      {loaded && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />

          {loading ? (
            <div className="p-10 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t('common.loading', 'Soo dejinaayo…')}
            </div>
          ) : editRows.length === 0 ? (
            <div className="p-10 text-center text-slate-500 dark:text-slate-400">
              {emptyMessage || t('entity.notFound', 'Not Found')}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#0B3C5D] text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">{t('attendanceEdit.cols.date', 'Date')}</th>
                      <th className="px-3 py-2 text-left font-semibold">{t('attendanceEdit.cols.day', 'Day')}</th>
                      <th className="px-3 py-2 text-left font-semibold">{t('attendanceEdit.cols.period', 'Period')}</th>
                      <th className="px-3 py-2 text-left font-semibold">{t('attendanceEdit.cols.state', 'State')}</th>
                      <th className="px-3 py-2 text-left font-semibold">{t('attendanceEdit.cols.reason', 'Reason')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {editRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {String(row.reg_date || '').slice(0, 10)}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.day_name || ''}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.period_name || ''}</td>
                        <td className="px-3 py-2">
                          <select
                            value={Number(row.st_att_id) || ''}
                            onChange={(e) => {
                              const id = Number(e.target.value) || 0;
                              const opt = stateOptions.find((o) => Number(o.st_att_id) === id);
                              updateRow(row.id, { st_att_id: id, state: opt?.state || '' });
                            }}
                            className="w-full h-9 px-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/20 focus:border-[#0f3d5e]"
                          >
                            {stateOptions.map((opt) => (
                              <option key={opt.st_att_id} value={opt.st_att_id}>{opt.state}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.reason || ''}
                            onChange={(e) => updateRow(row.id, { reason: e.target.value })}
                            className="w-full h-9 px-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/20 focus:border-[#0f3d5e]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Update Data — only enabled when there are diffs */}
              <div className="px-4 py-4 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-col items-center gap-2">
                <Button
                  size="md"
                  variant="primary"
                  leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  onClick={handleUpdate}
                  disabled={saving || changedRows.length === 0}
                  className="px-12"
                >
                  {saving
                    ? `${t('common.saving', 'La keydinayaa')}… ${saveProgress.done}/${saveProgress.total}`
                    : t('attendanceEdit.updateData', 'Update Data')}
                </Button>
                {changedRows.length > 0 && !saving && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {changedRows.length} {changedRows.length === 1 ? 'row' : 'rows'} changed
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!loaded && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 p-10 text-center text-slate-500 dark:text-slate-400">
          <div className="font-medium">{t('attendanceEdit.notLoaded', 'No data loaded')}</div>
          <div className="text-xs mt-1">{t('attendanceEdit.loadHint', 'Select Student + From Date + To Date then click Edit')}</div>
        </div>
      )}
    </div>
  );
}

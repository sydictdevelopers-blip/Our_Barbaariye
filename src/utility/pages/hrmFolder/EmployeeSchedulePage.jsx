import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Database, Plus, Trash2, Save, Pencil, X, Power, RefreshCw, CalendarDays,
} from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DataTableCard from '../../../components/DataTableCard';
import {
  crud, fetchDataPaginated, makeOptionLoader, runBulk, getSessionUBrIdNum,
} from '../../../services/api';
import { swalError, swalSuccess, swalConfirm } from '../../../utils/swal';

const blankRow = () => ({
  day_id: '', day_label: '',
  sh_id: '', sh_label: '',
  time_in: '', time_out: '',
});

const toTime = (v) => (v && v.length === 5 ? `${v}:00` : v || null);

const compactSelectStyle = {
  control: (base) => ({ ...base, minHeight: '40px', height: '40px', fontSize: '14px', borderRadius: '12px' }),
  valueContainer: (base) => ({ ...base, padding: '0 12px' }),
  indicatorsContainer: (base) => ({ ...base, height: '40px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
};

const innerSelectStyle = {
  control: (base) => ({ ...base, minHeight: '40px', height: '40px', fontSize: '14px', borderRadius: '10px' }),
  valueContainer: (base) => ({ ...base, padding: '0 10px' }),
  indicatorsContainer: (base) => ({ ...base, height: '40px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
};

export default function EmployeeSchedulePage() {
  const { t } = useTranslation();
  const sessionBrId = useSelector((s) => s?.ui?.user?.br_id ?? '');
  const sessionUBrId = getSessionUBrIdNum();

  const employeeLoader = useMemo(
    () => makeOptionLoader('employee_options', null, { valueKey: 'emp_id', labelKey: 'p_name' }),
    []
  );
  const dayLoader = useMemo(
    () => makeOptionLoader('day_options', null, { valueKey: 'd_id', labelKey: 'day_name' }),
    []
  );
  const shiftLoader = useMemo(
    () => makeOptionLoader('shift_options', null, { valueKey: 'sh_id', labelKey: 'shift_name' }),
    []
  );

  const [empId, setEmpId] = useState('');
  const [empLabel, setEmpLabel] = useState('');
  const [view, setView] = useState('table');
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formRows, setFormRows] = useState([blankRow()]);

  // Single-tab header — the page only owns one entity, but the Tabs pill
  // matches the visual treatment used by EmployeeOfficeTabs so the section
  // headers in HRM all look consistent.
  const headerTab = useMemo(
    () => [{ id: 'schedule', label: t('hrm.schedule.title'), icon: CalendarDays }],
    [t]
  );

  // Parse "10 HOURS 30 MINUTES" / "10 HOURS 0 MINUTES" / "1 HOUR 5 MINUTES"
  // into minutes so we can sum across rows and re-render a Total cell that
  // matches the SP's own formatting.
  const parseTotalHoursToMinutes = useCallback((str) => {
    if (!str) return 0;
    const m = String(str).match(/(\d+)\s*HOURS?\s*(\d+)?\s*MINUTES?/i);
    if (!m) return 0;
    return Number(m[1] || 0) * 60 + Number(m[2] || 0);
  }, []);
  const formatMinutes = useCallback((mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')} HOURS ${String(m).padStart(2, '0')} MINUTES`;
  }, []);

  const loadRows = useCallback(async () => {
    if (!empId) {
      swalError(t('swal.titles.warning'), t('hrm.schedule.selectFirst'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetchDataPaginated({
        queryName: 'EmployeeSchedules',
        page: 1,
        limit: 100,
        emp_id: empId,
      });
      const data = res?.data ?? [];
      setColumns([
        { key: 'emp_sch_id',  label: t('hrm.schedule.cols.id') },
        { key: 'day_name',    label: t('hrm.schedule.cols.day') },
        { key: 'type',        label: t('hrm.schedule.cols.type') },
        { key: 'time_in',     label: t('hrm.schedule.cols.timeIn') },
        { key: 'time_out',    label: t('hrm.schedule.cols.timeOut') },
        { key: 'total_hours', label: t('hrm.schedule.cols.totalHours') },
        { key: 'state',       label: t('hrm.schedule.cols.state') },
      ]);
      setRows(data);
      setView('table');
      setTableLoaded(true);
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    } finally {
      setLoading(false);
    }
  }, [empId, t]);

  useEffect(() => {
    setRows([]);
    setColumns([]);
    setTableLoaded(false);
    setView('table');
    setEditId(null);
  }, [empId]);

  const onAddNew = () => {
    if (!empId) {
      swalError(t('swal.titles.warning'), t('hrm.schedule.selectFirst'));
      return;
    }
    setEditId(null);
    setFormRows([blankRow()]);
    setView('form');
  };

  const onEditRow = (row) => {
    setEditId(row.emp_sch_id);
    setFormRows([{
      day_id: row.day_id ?? '',
      day_label: row.day_name ?? '',
      sh_id: row.sh_id ?? '',
      sh_label: row.type ?? '',
      time_in: row.time_in ? String(row.time_in).slice(0, 5) : '',
      time_out: row.time_out ? String(row.time_out).slice(0, 5) : '',
    }]);
    setView('form');
  };

  const onDeleteRow = async (row) => {
    const ok = await swalConfirm({
      title: t('swal.titles.confirmDelete'),
      text: t('entity.confirmDeleteRecord'),
    });
    if (!ok) return;
    try {
      const result = await crud({
        operation: 'delete',
        fn: 'employee_schedule_sp',
        params: {
          emp_sch_id_sp: row.emp_sch_id,
          emp_id_sp: empId,
          time_in_sp: null,
          time_out_sp: null,
          day_id_sp: 0,
          sh_id_sp: 0,
          state_sp: 'Active',
          reg_date_sp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          u_br_id_sp: sessionUBrId,
          language_sp: 0,
        },
      });
      swalSuccess(t('swal.titles.success'), result || t('swal.texts.deleted'));
      await loadRows();
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    }
  };

  const onToggleState = async (row) => {
    const next = String(row.state || '').toLowerCase() === 'active' ? 'Inactive' : 'Active';
    try {
      const result = await crud({
        operation: 'update',
        fn: 'employee_schedule_sp',
        params: {
          emp_sch_id_sp: row.emp_sch_id,
          emp_id_sp: empId,
          time_in_sp: toTime(String(row.time_in).slice(0, 5)),
          time_out_sp: toTime(String(row.time_out).slice(0, 5)),
          day_id_sp: row.day_id || 0,
          sh_id_sp: row.sh_id || 0,
          state_sp: next,
          reg_date_sp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          u_br_id_sp: sessionUBrId,
          language_sp: 0,
        },
      });
      swalSuccess(t('swal.titles.success'), result || t('swal.texts.updated'));
      await loadRows();
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    }
  };

  const updateRow = (idx, patch) =>
    setFormRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addBlankRow = () => setFormRows((prev) => [...prev, blankRow()]);
  const removeRow = (idx) =>
    setFormRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const onSave = async () => {
    const valid = formRows.filter((r) => r.day_id && r.sh_id && r.time_in && r.time_out);
    if (valid.length === 0) {
      swalError(t('swal.titles.warning'), t('hrm.schedule.fillAllRequired'));
      return;
    }
    try {
      if (editId) {
        const r = valid[0];
        await crud({
          operation: 'update',
          fn: 'employee_schedule_sp',
          params: {
            emp_sch_id_sp: editId,
            emp_id_sp: Number(empId),
            time_in_sp: toTime(r.time_in),
            time_out_sp: toTime(r.time_out),
            day_id_sp: Number(r.day_id),
            sh_id_sp: Number(r.sh_id),
            state_sp: 'Active',
            reg_date_sp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            u_br_id_sp: sessionUBrId,
            language_sp: 0,
          },
        });
      } else {
        const steps = valid.map((r) => ({
          type: 'sp',
          fn: 'employee_schedule_sp',
          params: [
            0,
            Number(empId),
            toTime(r.time_in),
            toTime(r.time_out),
            Number(r.day_id),
            Number(r.sh_id),
            'Active',
            new Date().toISOString().replace('T', ' ').slice(0, 19),
            sessionUBrId,
            0,
            'insert',
          ],
        }));
        await runBulk(steps);
      }
      swalSuccess(t('swal.titles.success'), t('swal.texts.saved'));
      setView('table');
      setEditId(null);
      setFormRows([blankRow()]);
      await loadRows();
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    }
  };

  // Sum of total_hours across every visible row — drives the Total footer
  // cell. Memoized so we don't reparse the SP strings on every render.
  const totalMinutes = useMemo(
    () => rows.reduce((acc, r) => acc + parseTotalHoursToMinutes(r.total_hours), 0),
    [rows, parseTotalHoursToMinutes]
  );

  const renderActions = (row) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onToggleState(row)}
        aria-label={t('action.toggleState')}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-white transition-colors ${
          String(row.state).toLowerCase() === 'active'
            ? 'bg-sky-600 hover:bg-sky-700'
            : 'bg-amber-500 hover:bg-amber-600'
        }`}
      >
        <Power className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onEditRow(row)}
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

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm shadow-slate-200/60 dark:shadow-slate-900/40">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] to-[#0D9488]" />
        <div className="flex items-center justify-between flex-wrap gap-4 px-5 py-4 min-h-[58px] bg-gradient-to-r from-[#F8FAFC] to-[#EEF2F7] dark:from-slate-800/70 dark:to-slate-800/50 border-b border-slate-200/80 dark:border-slate-700/80">
          <Tabs tabs={headerTab} activeTab="schedule" onTabChange={() => {}} className="flex-1 min-w-0" />
        </div>

        <div className="px-3 pb-4 pt-3 space-y-3">
          {/* Action toolbar — same shape as Vocation/Employee Office. */}
          <div className="flex flex-wrap items-end gap-3 px-2">
            <div className="flex-1 min-w-[240px] max-w-md">
              <Select2
                key={`emp-${sessionBrId}`}
                name="emp_id"
                value={empId}
                selectedLabel={empLabel}
                placeholder={t('hrm.schedule.selectEmployee')}
                loadOptions={employeeLoader}
                onChange={(e) => {
                  setEmpId(e.target.value);
                  setEmpLabel(e.target.label || '');
                }}
                styles={compactSelectStyle}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="md"
                variant="primary"
                leftIcon={<Database className="w-4 h-4" />}
                onClick={loadRows}
                disabled={!empId || loading}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('action.show')}
              </Button>
              <Button
                size="md"
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={onAddNew}
                disabled={!empId}
              >
                {t('entity.addNew')}
              </Button>
            </div>
          </div>

          {/* Multi-row schedule form — only when adding/editing */}
          {view === 'form' && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-900/40 mx-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {/* The "+" icon-only button lives in the rightmost header
                      cell — matches the legacy screenshot. It only shows
                      while inserting (edit mode is single-row). */}
                  <thead className="bg-[#0f3d5e] text-white">
                    <tr>
                      <th className="px-3 py-2.5 text-start font-semibold uppercase text-xs tracking-wide">{t('hrm.schedule.cols.day')}</th>
                      <th className="px-3 py-2.5 text-start font-semibold uppercase text-xs tracking-wide">{t('hrm.schedule.cols.scheduleType')}</th>
                      <th className="px-3 py-2.5 text-start font-semibold uppercase text-xs tracking-wide">{t('hrm.schedule.cols.timeIn')}</th>
                      <th className="px-3 py-2.5 text-start font-semibold uppercase text-xs tracking-wide">{t('hrm.schedule.cols.timeOut')}</th>
                      <th className="px-3 py-2 w-14 text-center">
                        {!editId && (
                          <button
                            type="button"
                            onClick={addBlankRow}
                            aria-label={t('hrm.schedule.addRow', { defaultValue: 'Add row' })}
                            title={t('hrm.schedule.addRow', { defaultValue: 'Add row' })}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-sm"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-3 py-2 min-w-[160px]">
                          <Select2
                            name={`day_${idx}`}
                            value={row.day_id}
                            selectedLabel={row.day_label}
                            placeholder={t('hrm.schedule.ph.day')}
                            loadOptions={dayLoader}
                            onChange={(e) => updateRow(idx, { day_id: e.target.value, day_label: e.target.label || '' })}
                            styles={innerSelectStyle}
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[160px]">
                          <Select2
                            name={`sh_${idx}`}
                            value={row.sh_id}
                            selectedLabel={row.sh_label}
                            placeholder={t('hrm.schedule.ph.scheduleType')}
                            loadOptions={shiftLoader}
                            onChange={(e) => updateRow(idx, { sh_id: e.target.value, sh_label: e.target.label || '' })}
                            styles={innerSelectStyle}
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[130px]">
                          <input
                            type="time"
                            value={row.time_in}
                            onChange={(e) => updateRow(idx, { time_in: e.target.value })}
                            className="w-full h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/30 focus:border-[#0f3d5e]"
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[130px]">
                          <input
                            type="time"
                            value={row.time_out}
                            onChange={(e) => updateRow(idx, { time_out: e.target.value })}
                            className="w-full h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/30 focus:border-[#0f3d5e]"
                          />
                        </td>
                        <td className="px-3 py-2 text-end">
                          {!editId && formRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                              aria-label={t('action.delete')}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Wide centered Save Info bar — secondary Cancel hugs the
                  left so the user can still back out without saving. */}
              <div className="flex items-center justify-center gap-3 px-4 py-4 bg-white dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-700/60">
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<X className="w-4 h-4" />}
                  onClick={() => { setView('table'); setEditId(null); setFormRows([blankRow()]); }}
                >
                  {t('action.cancel')}
                </Button>
                <button
                  type="button"
                  onClick={onSave}
                  className="inline-flex items-center justify-center gap-2 px-12 py-2.5 rounded-md bg-[#0B3C5D] hover:bg-[#0a2f48] text-white text-sm font-semibold uppercase tracking-wide shadow-sm transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {t('hrm.schedule.saveInfo')}
                </button>
              </div>
            </div>
          )}

          {view === 'table' && tableLoaded && (
            <div className="space-y-0">
              <DataTableCard
                showDataPanel
                columns={columns}
                data={rows}
                isLoading={loading}
                renderActions={renderActions}
                rowKey="emp_sch_id"
              />
              {/* Total row — mirrors the legacy schedule view. Shows the
                  summed total_hours across every visible row plus a single
                  toggle button that flips state for every row at once. */}
              {rows.length > 0 && (
                <div className="mx-2 -mt-2 px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {t('hrm.schedule.totalRow', { defaultValue: 'Total' })}
                  </span>
                  <span className="ms-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B3C5D] text-white text-xs font-semibold tabular-nums">
                    {formatMinutes(totalMinutes)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

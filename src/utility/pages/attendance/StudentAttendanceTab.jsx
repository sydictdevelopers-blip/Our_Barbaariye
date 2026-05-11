import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Plus,
  Trash2,
  Clock,
  GraduationCap,
  Hash,
  Calendar as CalendarIcon,
  Save,
  Pencil,
  Loader2,
} from 'lucide-react';
import AsyncSelect from 'react-select/async';
import Button from '../../../components/ui/Button';
import ActionButton from '../../../components/ui/ActionButton';
import Select2 from '../../../components/ui/Select2';
import DateInput from '../../../components/ui/DateInput';
import DataTableCard from '../../../components/DataTableCard';
import { crud, fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalError, swalSuccess, swalConfirmAction } from '../../../utils/swal';
import { confirmDelete } from '../../../utils/confirmDelete';
import EditAttendanceModal from './EditAttendanceModal';

// Style ee multi-select Period — la mid Select2 si ay u eg yihiin filter-yada kale.
const periodMultiStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '12px',
    borderColor: state.isFocused ? '#0f3d5e' : 'rgb(226 232 240)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(15, 61, 94, 0.2)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#0f3d5e' : 'rgb(203 213 225)' },
  }),
  menu: (base) => ({ ...base, zIndex: 9999, borderRadius: '12px' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'rgb(241 245 249)',
    border: '1px solid rgb(226 232 240)',
    borderRadius: '6px',
  }),
  multiValueLabel: (base) => ({ ...base, color: 'rgb(30 41 59)' }),
};

// Action codes muujinaaya saxda hoosta legend-ka:
//   P=Present, A=Absent, S=Sick, V=Vocation, L=Late, N=None
const ACTION_CODES = ['P', 'A', 'S', 'V', 'L', 'N'];

// Frontend single-letter code → state_attendance.st_att_id (integer the SP
// expects in p_state). Order assumed to match the legend (P=1…N=6) and the
// row order seeded in `state_attendance`. Verify against your DB if Save
// reports a wrong-state error.
const STATE_CODE_TO_ID = { P: 1, A: 2, S: 3, V: 4, L: 5, N: 6 };

/**
 * StudentAttendanceTab — UI shell ee tab-ka "Student Attendence".
 *
 * Toolbar: Class, Period (multi), Date, First-Name checkbox.
 * Buttons:
 *   CLASS DELETE BY DATE | PERIOD ATTENDENCE DELETE
 *   SHOW ATTENDENCE | ADD ATTENDENCE | ADD ATTENDENCE LATE
 *
 * ADD ATTENDENCE → SP: btn_student_class(cl_id, pr_id, reg_date)
 *   Multi-period waxa loo qaadaa hal call per period; cinwaanada (rows) waxaa lagu
 *   dedupe-eeyaa std_cl_id-ga si arday isku mid ah uusan laba jeer u soo bixin
 *   marka periods badan la dooro.
 *
 * Save SP weli lama xirin (Add Attendence Save) — Save button-ku waa placeholder.
 */
export default function StudentAttendanceTab() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);

  /* ── filter state ── */
  const [classSel, setClassSel] = useState({ id: '', label: '' });
  // Period waa multi-select — array of { value, label }
  const [periods, setPeriods] = useState([]);
  const [attendDate, setAttendDate] = useState(today);
  const [byFirstName, setByFirstName] = useState(false);

  /* ── lazy loaders ── */
  const classLoader = useMemo(() => makeOptionLoader('attendence_class_options'), []);
  const periodLoader = useMemo(() => makeOptionLoader('period_options'), []);

  /* ── SHOW table state ── */
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  // Message from the SP when no real rows were returned — shown beneath the
  // "Not Found" empty state so the user sees the SP's reason verbatim.
  const [emptyMessage, setEmptyMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ── ADD form state ── */
  // addMode: false → show DataTableCard; true → render the editable add table.
  const [addMode, setAddMode] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  // Snapshot ee class/periods/date markii ADD la riixay — si haddii user-ku
  // beddelo filters-ka kor, formka hoose uusan u khasaarin xogtii la doortay.
  const [addCtx, setAddCtx] = useState({ classLabel: '', periods: [], date: '' });
  // Liiska ardayda — { id, student, phone, reason, action }
  const [addRows, setAddRows] = useState([]);
  // Marka SP-ga uu soo celiyo `message` (ardayda dhammaantood mar hore la calaamadiyay).
  const [addMessage, setAddMessage] = useState('');
  // True intii Save Data uu shaqaynayo — disable button + muuji progress.
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
  // Show-table row actions: row currently being edited (null = modal closed).
  const [editRow, setEditRow] = useState(null);

  const validateRequired = (need) => {
    if (need.classSel && !classSel.id) return t('studentAttendence.selectClass', 'Fadlan dooro Fasal');
    if (need.period && periods.length === 0) return t('studentAttendence.selectPeriod', 'Fadlan dooro Goor (Period)');
    if (need.date && !attendDate) return t('studentAttendence.selectDate', 'Fadlan dooro Date');
    return null;
  };

  /**
   * SHOW ATTENDENCE — vw_student_attendance(reg_date, period, class, branch)
   * The SP takes a single period; for multi-period selection we fan-out one
   * call per period in parallel and concatenate. Branch is JWT-injected on
   * the backend, so it is not sent from here.
   */
  const handleShow = useCallback(async () => {
    const err = validateRequired({ classSel: true, period: true, date: true });
    if (err) {
      swalError(err, '');
      return;
    }
    setAddMode(false);
    setLoading(true);
    setEmptyMessage('');
    try {
      const settled = await Promise.all(
        periods.map((p) =>
          fetchDataPaginated({
            queryName: 'StudentAttendence',
            page: 1,
            limit: 1000,
            cl_id: classSel.id,
            pr_id: p.value,
            attend_date: attendDate,
          }).catch((e) => ({ __error: e?.message || 'Failed' }))
        )
      );

      const allRows = [];
      const messages = [];
      let firstColumns = [];
      settled.forEach((res, idx) => {
        if (res?.__error) return;
        if (!firstColumns.length && res?.columns?.length) firstColumns = res.columns;
        const data = res?.data ?? res?.rows ?? [];
        const p = periods[idx];
        data.forEach((row) => {
          // SP-da soo celisa hal saf-message ah marka xog la waayo: id-ga ma
          // jiro laakiin `message` waa la buuxiyey. Saaaf-saaf saxaa: row-gaas
          // shaxda ma muujinayno, message-kana waxaan u xaaslinaynaa empty
          // state si user-ka loogu muujiyo "Not Found" + sababta.
          if (row && (row.id == null || row.id === '') && row.message) {
            messages.push(row.message);
            return;
          }
          // SP doesn't return period info; attach pr_id + label from the
          // outer fan-out so the Edit modal can pre-fill the Period dropdown.
          allRows.push({ ...row, pr_id: p?.value, period: p?.label });
        });
      });

      // Hide the SP's `message` column — it carries SP-side notes that are
      // not meaningful for the user-facing table.
      firstColumns = firstColumns.filter((c) => (c?.key || '').toLowerCase() !== 'message');

      if (byFirstName) {
        const nameKey = ['student', 'p_name', 'name'].find((k) => allRows[0] && k in allRows[0]) || null;
        if (nameKey) {
          allRows.sort((a, b) => String(a[nameKey] ?? '').localeCompare(String(b[nameKey] ?? '')));
        }
      }

      setRows(allRows);
      setColumns(firstColumns);
      if (allRows.length === 0) {
        setEmptyMessage(messages[0] || '');
      }
      setLoaded(true);
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed to load');
      setRows([]);
      setColumns([]);
      setEmptyMessage('');
      setLoaded(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSel.id, periods, attendDate, byFirstName]);

  /**
   * ADD ATTENDENCE — SP wuxuu qaataa hal period mar kasta. Multi-period
   * waxaan u qabannaa parallel: per-period call → soo ururi ardayda → dedupe
   * std_cl_id-ga (qof la siman). Haddii dhammaan periods-yada keenaan
   * "message-row" oo keliya, xog ma jirto — message-ka ayaa la muujinayaa.
   */
  const handleAddAttendence = useCallback(async () => {
    const err = validateRequired({ classSel: true, period: true, date: true });
    if (err) {
      swalError(err, '');
      return;
    }
    setAddMode(true);
    setAddLoading(true);
    setAddRows([]);
    setAddMessage('');
    setAddCtx({
      classLabel: classSel.label,
      periods: periods.map((p) => ({ value: p.value, label: p.label })),
      date: attendDate,
    });
    try {
      const settled = await Promise.all(
        periods.map((p) =>
          fetchDataPaginated({
            queryName: 'StudentAttendenceAdd',
            page: 1,
            limit: 1000,
            cl_id: classSel.id,
            pr_id: p.value,
            attend_date: attendDate,
          }).catch((e) => ({ __error: e?.message || 'Failed' }))
        )
      );

      const byId = new Map();
      const messages = [];
      settled.forEach((res) => {
        if (res?.__error) {
          messages.push(res.__error);
          return;
        }
        const data = res?.data ?? res?.rows ?? [];
        data.forEach((row) => {
          // SP ka soo bixiya hal saf-message ah marka cidna u baahnayn calaamadin.
          if (row?.id == null && row?.message) {
            messages.push(row.message);
            return;
          }
          if (!byId.has(row.id)) {
            byId.set(row.id, {
              id: row.id,
              student: row.student || '',
              phone: row.phone || '',
              reason: row.reason || '',
              action: 'P', // default Present
            });
          }
        });
      });

      const list = Array.from(byId.values());
      if (byFirstName) {
        list.sort((a, b) => String(a.student).localeCompare(String(b.student)));
      }
      setAddRows(list);
      if (list.length === 0) {
        setAddMessage(messages[0] || t('entity.notFound', 'Not Found'));
      }
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed to load');
    } finally {
      setAddLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSel.id, classSel.label, periods, attendDate, byFirstName]);

  const handleAddAttendenceLate = () => {
    swalError(
      t('common.notReady', 'Function-ka diyaar uma ahan'),
      t('studentAttendence.addLateNotReady', 'Add Attendence Late weli lama dhammaystirin.')
    );
  };

  const updateAddRow = (id, patch) => {
    setAddRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  /** Delete one attendance row via student_attendance_sp(delete). */
  const handleDeleteRow = useCallback(async (row) => {
    if (!row?.id) return;
    const ok = await confirmDelete({
      id: row.id,
      label: t('studentAttendence.attendance', 'Attendance'),
      recordPreview: `${row.student || row.p_name || ''} — ${row.period || ''}`,
    });
    if (!ok) return;
    try {
      const res = await crud({
        operation: 'delete',
        fn: 'student_attendance_sp',
        params: {
          p_id: row.id,
          p_student: 0,
          p_period: 0,
          p_state: 0,
          p_reason: '',
          p_reg_date: row?.reg_date || new Date().toISOString().slice(0, 10),
          u_br_id_sp: 0,
        },
      });
      swalSuccess(t('common.done', 'La sameeyay'), res?.message || '');
      // Drop the row from local state so the table updates without a reload.
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed to delete');
    }
  }, [t]);

  const renderShowActions = useCallback((row) => (
    <div className="flex justify-center gap-1">
      <ActionButton variant="edit" aria-label="Edit" onClick={() => setEditRow(row)}>
        <Pencil className="w-4 h-4" />
      </ActionButton>
      <ActionButton variant="delete" aria-label="Delete" onClick={() => handleDeleteRow(row)}>
        <Trash2 className="w-4 h-4" />
      </ActionButton>
    </div>
  ), [handleDeleteRow]);

  /**
   * Save Data — for every visible (in-state) row, insert one attendance
   * record per selected period via student_attendance_sp(insert).
   *
   * Concurrency: backend serializes through a single PG connection per
   * request, so we limit to N parallel requests (CONC) to avoid hammering
   * the server while still being faster than serial. The SP itself returns
   * "AlreadyInsert" for rows that already have attendance for that
   * period+date — we count those as skipped, not failed.
   */
  const handleSaveAdd = useCallback(async () => {
    if (addRows.length === 0) return;
    if (!addCtx.periods.length || !addCtx.date) {
      swalError(t('common.error', 'Khalad'), t('studentAttendence.selectPeriod', 'Fadlan dooro Goor (Period)'));
      return;
    }

    // Build the full task list: one insert per (row × period).
    const tasks = [];
    for (const row of addRows) {
      for (const period of addCtx.periods) {
        tasks.push({ row, period });
      }
    }

    setSaving(true);
    setSaveProgress({ done: 0, total: tasks.length });

    const CONC = 8;
    let okCount = 0;
    let skipCount = 0;
    let errCount = 0;
    const sampleErrors = [];

    let cursor = 0;
    const runOne = async () => {
      while (true) {
        const i = cursor++;
        if (i >= tasks.length) return;
        const { row, period } = tasks[i];
        try {
          const res = await crud({
            operation: 'insert',
            fn: 'student_attendance_sp',
            params: {
              p_id: 0,
              p_student: row.id,
              p_period: period.value,
              p_state: STATE_CODE_TO_ID[row.action] ?? 0,
              p_reason: row.reason || '',
              p_reg_date: addCtx.date,
              u_br_id_sp: 0, // backend overrides from JWT
            },
          });
          const msg = String(res?.message || '').toLowerCase();
          if (msg.includes('already')) skipCount++;
          else okCount++;
        } catch (e) {
          errCount++;
          if (sampleErrors.length < 3) sampleErrors.push(e?.message || 'Failed');
        }
        setSaveProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    };

    try {
      await Promise.all(Array(Math.min(CONC, tasks.length)).fill(0).map(runOne));

      const summary = `${t('common.saved', 'La keydiyay')}: ${okCount} · ${t('studentAttendence.skipped', 'La booday')}: ${skipCount}` +
        (errCount ? ` · ${t('common.errors', 'Khaladaad')}: ${errCount}` : '');

      if (errCount > 0) {
        swalError(
          t('common.partialError', 'Qaar way fashilmeen'),
          `${summary}\n${sampleErrors.join('\n')}`
        );
      } else {
        swalSuccess(t('common.done', 'La sameeyay'), summary);
      }
      setAddMode(false);
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed to save');
    } finally {
      setSaving(false);
      setSaveProgress({ done: 0, total: 0 });
    }
  }, [addRows, addCtx, t]);

  // Shared HTML escape — class/period labels can contain DB-sourced text and
  // SweetAlert renders `html` verbatim. Re-used by both delete handlers.
  const escHtml = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const dangerChipCls = 'display:inline-block;margin:2px 4px;padding:3px 10px;border-radius:9999px;background:#fee2e2;color:#dc2626;font-weight:600;font-size:13px;border:1px solid #fecaca';

  /**
   * CLASS DELETE BY DATE — class_attendancedelet_sp(p_class, p_date,
   * p_user_id). Tirtir dhammaan attendance-ka fasal hal date (dhammaan
   * periods). u_br_id_sp waxa la dirayaa 0 — backend ayaa ka beddelaaya JWT.
   */
  const handleClassDeleteByDate = useCallback(() => {
    const err = validateRequired({ classSel: true, date: true });
    if (err) {
      swalError(err, '');
      return;
    }
    const html = `
      <div style="text-align:center;line-height:1.6">
        <div style="margin-bottom:10px">
          <span style="${dangerChipCls}">${escHtml(classSel.label)}</span>
          <span style="${dangerChipCls}">${escHtml(attendDate)}</span>
        </div>
        <div style="color:#475569;font-size:14px">${escHtml(t('studentAttendence.confirmDelete', 'This will delete the attendance. Continue?'))}</div>
      </div>
    `;
    swalConfirmAction({
      title: t('swal.titles.confirmDelete'),
      html,
      confirmText: t('swal.buttons.yesDelete', 'Haa, tirtir'),
      confirmColor: '#dc2626',
      onConfirm: async () => {
        try {
          const res = await crud({
            operation: 'delete',
            fn: 'class_attendancedelet_sp',
            params: {
              p_class: Number(classSel.id) || 0,
              p_date: attendDate,
              u_br_id_sp: 0, // backend overrides from JWT
            },
          });
          if (loaded) await handleShow();
          return { message: res?.message || t('swal.texts.deleted', 'Xogta waa la tirtiray.') };
        } catch (e) {
          throw new Error(e?.message || t('swal.texts.deleteFailed', 'Tirtirka way fashilantay.'));
        }
      },
    });
  }, [classSel.id, classSel.label, attendDate, loaded, handleShow, t]);

  /**
   * PERIOD ATTEND DELETE — period_attendancedelet_sp(p_class, p_period,
   * p_date, p_user_id). SP qaata hal period mar, sidaa darteed marka multi-
   * period la doortay waxaan u fan-out gareynaa hal call per period oo si
   * isku mid u taxan (parallel). u_br_id_sp waxaa JWT-ka backend-ku ka
   * buuxiyaa, marka 0 placeholder ah ayaa la diraa.
   */
  const handlePeriodAttendDelete = useCallback(() => {
    const err = validateRequired({ classSel: true, period: true, date: true });
    if (err) {
      swalError(err, '');
      return;
    }
    const periodChipsHtml = periods
      .map((p) => `<span style="${dangerChipCls}">${escHtml(p.label)}</span>`)
      .join('');
    const html = `
      <div style="text-align:center;line-height:1.6">
        <div style="margin-bottom:10px">
          <span style="${dangerChipCls}">${escHtml(classSel.label)}</span>
          ${periodChipsHtml}
          <span style="${dangerChipCls}">${escHtml(attendDate)}</span>
        </div>
        <div style="color:#475569;font-size:14px">${escHtml(t('studentAttendence.confirmDelete', 'This will delete the attendance. Continue?'))}</div>
      </div>
    `;
    swalConfirmAction({
      title: t('swal.titles.confirmDelete'),
      html,
      confirmText: t('swal.buttons.yesDelete', 'Haa, tirtir'),
      confirmColor: '#dc2626',
      onConfirm: async () => {
        const selectedPeriods = [...periods];
        const settled = await Promise.all(
          selectedPeriods.map((p) =>
            crud({
              operation: 'delete',
              fn: 'period_attendancedelet_sp',
              params: {
                p_class: Number(classSel.id) || 0,
                p_period: Number(p.value) || 0,
                p_date: attendDate,
                u_br_id_sp: 0, // backend overrides from JWT
              },
            })
              .then((res) => ({ ok: true, message: res?.message || '' }))
              .catch((e) => ({ ok: false, message: e?.message || 'Failed' }))
          )
        );
        const okCount = settled.filter((r) => r.ok).length;
        const errCount = settled.length - okCount;
        const summary = `${t('common.done', 'La sameeyay')}: ${okCount}` +
          (errCount ? ` · ${t('common.errors', 'Khaladaad')}: ${errCount}` : '');

        if (loaded) await handleShow();

        return { message: summary };
      },
    });
  }, [classSel.id, classSel.label, periods, attendDate, loaded, handleShow, t]);

  /* ── client-side filter / paginate (SHOW table) ── */
  const filteredRows = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tableColumns = columns?.length
    ? columns
    : [{ key: 'message', label: t('common.message', 'Message') }];

  const labelCls =
    'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5';
  const labelIconCls = 'w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400';

  return (
    <div className="space-y-4">
      {/* ── Filter card: filters + actions row ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>
              <GraduationCap className={labelIconCls} />
              <span>{t('select.class', 'Class')}</span>
            </label>
            <Select2
              name="class"
              value={classSel.id}
              selectedLabel={classSel.label}
              onChange={(e) => setClassSel({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={classLoader}
              placeholder={t('select.class', 'Select Class')}
              isClearable={false}
            />
          </div>
          <div>
            <label className={labelCls}>
              <Hash className={labelIconCls} />
              <span>{t('select.period', 'Period')}</span>
            </label>
            <AsyncSelect
              isMulti
              cacheOptions
              defaultOptions
              loadOptions={periodLoader}
              value={periods}
              onChange={(arr) => setPeriods(arr || [])}
              placeholder={t('select.period', 'Select Period')}
              styles={periodMultiStyles}
              classNamePrefix="select2"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
              menuPlacement="auto"
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              getOptionValue={(opt) => opt?.value}
              getOptionLabel={(opt) => (opt?.label != null ? String(opt.label) : String(opt?.value ?? ''))}
            />
          </div>
          <div>
            <label className={labelCls}>
              <CalendarIcon className={labelIconCls} />
              <span>{t('studentAttendence.fields.date', 'Date')}</span>
            </label>
            <DateInput
              value={attendDate}
              onChange={(e) => setAttendDate(e.target.value)}
              className="w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/20 focus:border-[#0f3d5e]"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={byFirstName}
              onChange={(e) => setByFirstName(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-[#0B3C5D] focus:ring-[#0f3d5e]/20"
            />
            <span className="font-medium">{t('studentAttendence.firstName', 'First Name')}</span>
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleClassDeleteByDate}
            >
              {t('studentAttendence.classDeleteByDate', 'Class Delete By Date')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handlePeriodAttendDelete}
            >
              {t('studentAttendence.periodAttendDelete', 'Period Attend Delete')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Database className="w-4 h-4" />}
              onClick={handleShow}
            >
              {t('studentAttendence.showAttendence', 'Show Attendence')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddAttendence}
            >
              {t('studentAttendence.addAttendence', 'Add Attendence')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Clock className="w-4 h-4" />}
              onClick={handleAddAttendenceLate}
            >
              {t('studentAttendence.addAttendenceLate', 'Add Attendence Late')}
            </Button>
          </div>
        </div>
      </div>

      {addMode ? (
        <AddAttendencePanel
          t={t}
          loading={addLoading}
          rows={addRows}
          message={addMessage}
          ctx={addCtx}
          onChangeRow={updateAddRow}
          onSave={handleSaveAdd}
          saving={saving}
          saveProgress={saveProgress}
        />
      ) : (
        <DataTableCard
          showDataPanel={loaded}
          searchPlaceholder={t('entity.search', 'Search')}
          searchValue={searchQuery}
          onSearchChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          onSearchSubmit={() => {}}
          emptyTitleClickToLoad={t('entity.noLoaded', 'No data loaded')}
          emptyDescClickToLoad={t('entity.loadHint', 'Click SHOW ATTENDENCE to load data')}
          emptyIconClickToLoad={Database}
          columns={tableColumns}
          data={pagedRows}
          isLoading={loading}
          emptyIcon={Database}
          emptyTitle={t('entity.notFound', 'Not Found')}
          emptyDescription={emptyMessage}
          hasActions={true}
          renderActions={renderShowActions}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={pageSize}
          onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          onPageClick={(p) => setCurrentPage(p)}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setCurrentPage(1);
          }}
          rowKey="id"
        />
      )}

      {editRow && (
        <EditAttendanceModal
          open={!!editRow}
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={handleShow}
        />
      )}
    </div>
  );
}

/* ─────────────────── ADD form ─────────────────── */

function AddAttendencePanel({ t, loading, rows, message, ctx, onChangeRow, onSave, saving, saveProgress }) {
  const periodChips = ctx.periods.map((p) => p.label).filter(Boolean).join(', ');

  // Pagination — fixed 200/page. If the dataset fits on one page
  // (≤ PAGE_SIZE), pagination is hidden and all rows render at once.
  // For huge datasets (e.g. 80k+ rows) we paginate to keep the DOM small.
  const PAGE_SIZE = 200;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [rows]);

  const total = rows.length;
  const paginate = total > PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedRows = useMemo(
    () => (paginate ? rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : rows),
    [rows, paginate, safePage]
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />

      {/* Header — context summary */}
      <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center gap-3 bg-slate-50/60 dark:bg-slate-800/30">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {ctx.classLabel && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
              <GraduationCap className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400" />
              {ctx.classLabel}
            </span>
          )}
          {periodChips && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
              <Hash className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400" />
              {periodChips}
            </span>
          )}
          {ctx.date && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
              <CalendarIcon className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400" />
              {ctx.date}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 text-center text-xs text-slate-600 dark:text-slate-300 border-b border-slate-200/70 dark:border-slate-700/70">
        {t(
          'studentAttendence.legend',
          '(P=Present, A=Absent, S=Sick, V=Vocation, L=Late, N=None)'
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-10 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t('common.loading', 'Soo dejinaayo…')}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-slate-500 dark:text-slate-400">
          {message || t('entity.notFound', 'Not Found')}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#0B3C5D] text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t('studentAttendence.cols.student', 'Student name')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t('studentAttendence.cols.phone', 'Phone')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t('studentAttendence.cols.reason', 'Reason')}
                  </th>
                  <th className="px-3 py-2 text-center font-semibold">
                    {t('studentAttendence.cols.action', 'Action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pagedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.student}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.phone}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.reason}
                        onChange={(e) => onChangeRow(row.id, { reason: e.target.value })}
                        className="w-full h-8 px-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/20 focus:border-[#0f3d5e]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-3">
                        {ACTION_CODES.map((code) => (
                          <label
                            key={code}
                            className="inline-flex items-center gap-1 cursor-pointer text-slate-700 dark:text-slate-200"
                          >
                            <input
                              type="radio"
                              name={`act-${row.id}`}
                              value={code}
                              checked={row.action === code}
                              onChange={() => onChangeRow(row.id, { action: code })}
                              className="w-3.5 h-3.5 text-[#0B3C5D] focus:ring-[#0f3d5e]/20"
                            />
                            <span className="text-xs font-semibold">{code}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer — only shown when total exceeds one page */}
          {paginate && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, total)} / {total}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-3 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                >
                  {t('common.prev', 'Prev')}
                </button>
                <span className="text-slate-600 dark:text-slate-300 min-w-[64px] text-center">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 px-3 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                >
                  {t('common.next', 'Next')}
                </button>
              </div>
            </div>
          )}

          {/* Save Data — primary action for the whole add form */}
          <div className="px-4 py-4 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-col items-center gap-2">
            <Button
              size="md"
              variant="primary"
              leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              onClick={onSave}
              disabled={loading || saving || rows.length === 0}
              className="px-12"
            >
              {saving
                ? `${t('common.saving', 'La keydinayaa')}… ${saveProgress.done}/${saveProgress.total}`
                : t('studentAttendence.saveData', 'Save Data')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Database, Copy, RefreshCw, User, Filter, Receipt, Calendar, Award, ChevronDown } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DataTableCard from '../../../components/DataTableCard';
import { crud, fetchDataPaginated, makeOptionLoader, fetchSelectOptions } from '../../../services/api';
import { swalError, swalSuccess, swalConfirmAction } from '../../../utils/swal';

// Possible state values for student_class.state — exposed inline in the table
// so a user can move a record between Continue / Passed / Failed / Pause /
// Graduated without leaving the row. Order matches user request.
const STATE_OPTIONS = ['Continue', 'Passed', 'Failed', 'Pause', 'Graduated'];

const STATE_PALETTE = {
  Continue:  'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
  Passed:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  Failed:    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
  Pause:     'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  Graduated: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
  _default:  'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:border-slate-600',
};

/**
 * InlineSelect — chip-shaped <select> for in-row editing. Renders the current
 * value as a coloured pill while exposing a native dropdown for keyboard / a11y
 * support. The pill expands on hover to hint that it's interactive.
 */
function InlineSelect({ value, options, onChange, palette, disabled }) {
  const cls = palette?.[value] ?? palette?._default ?? STATE_PALETTE._default;
  return (
    <span className={`relative inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${cls} ${disabled ? 'opacity-60' : 'hover:brightness-95'}`}>
      <span className="truncate max-w-[120px]">{value || '—'}</span>
      <ChevronDown className="w-3 h-3 opacity-70" />
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Change value"
      >
        <option value="" disabled>—</option>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const lbl = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{lbl}</option>;
        })}
      </select>
    </span>
  );
}

const NO_DATA_ROW = [{ id: '__no_data__', student: 'This Information Was Not Found!' }];

const compactSelectStyle = {
  control: (base) => ({ ...base, minHeight: '38px', height: '38px', fontSize: '13px', borderRadius: '10px' }),
  valueContainer: (base) => ({ ...base, padding: '0 10px' }),
  indicatorsContainer: (base) => ({ ...base, height: '38px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
};
const compactBtn = 'px-3 py-2 text-sm rounded-lg gap-2';

export default function StudentInfoTab() {
  const { t } = useTranslation();
  const sessionUser = useSelector((state) => state.ui.user);
  const sessionUBrId = sessionUser?.u_br_id != null ? Number(sessionUser.u_br_id) : 0;

  // Per-row batch options keyed by class id — fetched lazily the first time a
  // class is shown so the batch dropdown opens with all sibling batches.
  const [batchOptionsByClass, setBatchOptionsByClass] = useState({});

  const renderCountBadge = (color, IconCmp) => (row, value) => {
    const n = Number(value) || 0;
    const palettes = {
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
      sky:     'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
      amber:   'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
    };
    const dim = n === 0 ? 'opacity-60' : '';
    return (
      <button
        type="button"
        onClick={() => handleViewCount(row, value)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border tabular-nums transition-colors ${palettes[color]} ${dim}`}
      >
        <IconCmp className="w-3.5 h-3.5" />
        {n.toLocaleString()}
      </button>
    );
  };

  const renderStateCell = (row, value) => (
    <InlineSelect
      value={value}
      options={STATE_OPTIONS}
      palette={STATE_PALETTE}
      onChange={(next) => handleStateChange(row, next)}
    />
  );

  const renderBatchCell = (row, value) => {
    const clKey = String(row.cl_id ?? row.class ?? '');
    const opts = batchOptionsByClass[clKey];
    return (
      <InlineSelect
        value={value}
        // Pre-seed with the current label so the chip shows correctly even
        // before the option list resolves; overlay click triggers the fetch.
        options={opts || (value ? [value] : [])}
        onChange={(next) => handleBatchChange(row, next)}
        disabled={!opts}
      />
    );
  };

  const INFO_COLUMNS = [
    { key: 'id',            label: 'ID' },
    { key: 'student',       label: t('studentInfo.student') },
    { key: 'class',         label: t('studentInfo.class') },
    { key: 'academic_name', label: t('studentInfo.academicYear') },
    { key: 'batch',         label: t('studentInfo.batch', { defaultValue: 'Batch' }),
      render: renderBatchCell },
    { key: 'state',         label: t('studentInfo.state'),
      render: renderStateCell },
    { key: 'charges',       label: t('studentInfo.charges'),
      render: renderCountBadge('amber', Receipt) },
    { key: 'attendances',   label: t('studentInfo.attendances'),
      render: renderCountBadge('sky', Calendar) },
    { key: 'results',       label: t('studentInfo.results'),
      render: renderCountBadge('emerald', Award) },
    { key: 'reg_date',      label: t('studentInfo.date') },
  ];

  const DUP_COLUMNS = [
    { key: 'student_name',   label: t('studentInfo.student') },
    { key: 'emis_id',        label: 'EMIS' },
    { key: 'id_card',        label: 'ID Card' },
    { key: 'sex',            label: 'Sex' },
    { key: 'tel',            label: 'Phone' },
    { key: 'classes',        label: t('studentInfo.class') },
    { key: 'academic_years', label: t('studentInfo.academicYear') },
    { key: 'dup_count',      label: 'Duplicates' },
  ];

  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStudentLabel, setSelectedStudentLabel] = useState('');

  const [tableData, setTableData] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [viewMode, setViewMode] = useState('info'); // 'info' | 'duplicates'

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inline edit + drill-down handlers — full save round-trip / detail panels
  // TBD; for now we surface the row context in a swal so the user sees the
  // action is wired and the SP signature can be confirmed before building
  // the modal. Each handler logs intent so backend wiring is a small follow-up.
  // Resolve a batch label from cached options so the confirm dialog can show
  // the user-readable name (not just the b_id).
  const batchLabelFor = (clId, bId) => {
    if (bId == null || bId === '') return '';
    const opts = batchOptionsByClass[String(clId)] || [];
    const found = opts.find((o) => String(o.value) === String(bId));
    return found ? found.label : String(bId);
  };

  const handleStateChange = (row, next) => {
    if (!next || next === row.state) return;
    if (!sessionUBrId) {
      swalError(t('swal.titles.error'), t('login.errors.sessionExpired'));
      return;
    }
    swalConfirmAction({
      title: t('studentInfo.confirmStateChange', { defaultValue: 'Beddel xaaladda?' }),
      text: t('studentInfo.confirmStateChangeText', {
        defaultValue: '{{student}}: {{from}} → {{to}}',
        student: row.student || '',
        from: row.state || '—',
        to: next,
      }),
      confirmText: t('common.update', { defaultValue: 'Update' }),
      confirmColor: '#0f3d5e',
      onConfirm: async () => {
        const resp = await crud({
          operation: 'update',
          fn: 'student_class_inline_update_sp',
          params: {
            p_std_cl_id: Number(row.id) || 0,
            p_b_id: 0,
            p_state: next,
            p_u_br_id: sessionUBrId,
          },
        });
        setTableData((prev) => prev.map((r) => (r.id === row.id ? { ...r, state: next } : r)));
        return { message: resp?.message ?? '' };
      },
    });
  };

  const handleBatchChange = (row, nextBId) => {
    if (!nextBId || String(nextBId) === String(row.b_id ?? '')) return;
    if (!sessionUBrId) {
      swalError(t('swal.titles.error'), t('login.errors.sessionExpired'));
      return;
    }
    const newLabel = batchLabelFor(row.cl_id, nextBId);
    swalConfirmAction({
      title: t('studentInfo.confirmBatchChange', { defaultValue: 'Beddel wajiga?' }),
      text: t('studentInfo.confirmBatchChangeText', {
        defaultValue: '{{student}}: {{from}} → {{to}}',
        student: row.student || '',
        from: row.batch || '—',
        to: newLabel || nextBId,
      }),
      confirmText: t('common.update', { defaultValue: 'Update' }),
      confirmColor: '#0f3d5e',
      onConfirm: async () => {
        const resp = await crud({
          operation: 'update',
          fn: 'student_class_inline_update_sp',
          params: {
            p_std_cl_id: Number(row.id) || 0,
            p_b_id: Number(nextBId),
            p_state: '',
            p_u_br_id: sessionUBrId,
          },
        });
        setTableData((prev) => prev.map((r) => (r.id === row.id
          ? { ...r, b_id: Number(nextBId), batch: newLabel || r.batch }
          : r)));
        return { message: resp?.message ?? '' };
      },
    });
  };
  const handleViewCount = (row, value) => {
    swalError(
      t('studentInfo.detailsComingSoon', { defaultValue: 'Details panel coming soon' }),
      `${row.student || ''} — ${value ?? 0}`,
    );
  };

  // After data loads, fetch the batch options for every distinct class so the
  // inline batch dropdown opens with the right list. Cached per class to avoid
  // re-fetching when the user pages or sorts.
  useEffect(() => {
    const classes = Array.from(new Set(
      tableData
        .map((r) => r.cl_id)
        .filter((v) => v != null && v !== '')
    ));
    const missing = classes.filter((c) => !batchOptionsByClass[String(c)]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const updates = {};
      await Promise.all(missing.map(async (cl_id) => {
        try {
          const res = await fetchSelectOptions('batch_options', 100, '', { cl_id });
          const list = Array.isArray(res?.data) ? res.data : [];
          updates[String(cl_id)] = list.map((o) => ({ value: o.b_id, label: o.batch_name }));
        } catch {
          updates[String(cl_id)] = [];
        }
      }));
      if (!cancelled) setBatchOptionsByClass((prev) => ({ ...prev, ...updates }));
    })();
    return () => { cancelled = true; };
  }, [tableData, batchOptionsByClass]);

  const loadStudentOptions = useMemo(
    () => makeOptionLoader('std_admin_all_options', null, { valueKey: 'std_id', labelKey: 'p_name' }),
    []
  );

  const handleShowData = async () => {
    if (!selectedStudent) {
      swalError(t('studentInfo.noStudent'));
      return;
    }
    setLoadingTable(true);
    setViewMode('info');
    try {
      const res = await fetchDataPaginated({
        queryName: 'studentClass_info',
        page: 1,
        limit: 100,
        search: '',
        std_id: selectedStudent,
      });
      const rows = res?.data ?? [];
      // Filter out the synthetic 'Not found' row from the SP (it has result populated and id=null)
      const real = rows.filter((r) => !(r.result && r.id == null));
      setTableData(real.map((r, i) => ({ ...r, id: r.id ?? `__row_${i}` })));
      setTableLoaded(true);
      setCurrentPage(1);
    } catch (e) {
      swalError(e?.message || 'Khalad ayaa dhacay');
    } finally {
      setLoadingTable(false);
    }
  };

  const handleShowDuplicateData = async () => {
    setLoadingTable(true);
    setViewMode('duplicates');
    try {
      const res = await fetchDataPaginated({
        queryName: 'StudentinfoDuplicates',
        page: 1,
        limit: 500,
        search: '',
      });
      const rows = res?.data ?? [];
      setTableData(rows.map((r, i) => ({ id: r.std_id ?? i, ...r })));
      setTableLoaded(true);
      setCurrentPage(1);
    } catch (e) {
      swalError(e?.message || 'Khalad ayaa dhacay');
    } finally {
      setLoadingTable(false);
    }
  };

  const activeColumns = viewMode === 'duplicates' ? DUP_COLUMNS : INFO_COLUMNS;

  const filteredRows = useMemo(() => {
    const list = tableLoaded && tableData.length === 0 ? NO_DATA_ROW : tableData;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    const keys = activeColumns.map((c) => c.key);
    return list.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [tableData, tableLoaded, searchQuery, activeColumns]);

  const totalRows = filteredRows.length;
  const pagedRows = useMemo(() => {
    const s = (currentPage - 1) * pageSize;
    return filteredRows.slice(s, s + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const filterToolbar = (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
      <div className="p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
            <User className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400" />
            <span>{t('select.student', { defaultValue: 'Student' })}</span>
          </label>
          <Select2
            name="filterStudent"
            value={selectedStudent}
            selectedLabel={selectedStudentLabel}
            loadOptions={loadStudentOptions}
            onChange={(e) => {
              setSelectedStudent(e.target.value ?? '');
              setSelectedStudentLabel(e.target.label ?? '');
            }}
            placeholder={t('studentInfo.selectStudent')}
            isClearable={false}
            styles={compactSelectStyle}
            isOptionDisabled={(opt) => opt?.isHint}
            formatOptionLabel={(opt) =>
              opt?.isHint ? <span className="text-slate-500 italic">{opt.label}</span> : opt?.label
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShowData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
            {loadingTable && viewMode === 'info' ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('studentInfo.showData')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Copy className="w-4 h-4" />} onClick={handleShowDuplicateData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
            {loadingTable && viewMode === 'duplicates' ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('studentInfo.showDuplicate')}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {filterToolbar}
      <DataTableCard
        showDataPanel={tableLoaded}
        searchPlaceholder="Search:"
        searchValue={searchQuery}
        onSearchChange={(e) => { setSearchQuery(e?.target?.value ?? ''); setCurrentPage(1); }}
        onSearchSubmit={() => {}}
        columns={activeColumns}
        data={pagedRows}
        isLoading={loadingTable}
        emptyTitleClickToLoad={t('studentInfo.noData')}
        emptyDescClickToLoad={t('studentInfo.noDataDesc')}
        total={totalRows}
        currentPage={currentPage}
        totalPages={Math.max(1, Math.ceil(totalRows / pageSize))}
        itemsPerPage={pageSize}
        onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(Math.max(1, Math.ceil(totalRows / pageSize)), p + 1))}
        onPageClick={(p) => setCurrentPage(p)}
        onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
      />
    </div>
  );
}

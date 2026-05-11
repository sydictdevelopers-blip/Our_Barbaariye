import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Plus, Save, Trash2, XCircle, GraduationCap, CalendarDays, BookOpen, Filter, Users } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import Modal from '../../../components/ui/Modal';
import DataTableCard from '../../../components/DataTableCard';
import { makeOptionLoader, fetchDataPaginated, crud, runBulk } from '../../../services/api';
import * as swal from '../../../utils/swal';
import { confirmDelete } from '../../../utils/confirmDelete';

const AUTH_STORAGE_KEY = 'brabaariye_user';
const getSessionUBrId = () => {
  if (typeof window === 'undefined') return '';
  try {
    return JSON.parse(window.localStorage?.getItem(AUTH_STORAGE_KEY) || '{}')?.u_br_id ?? '';
  } catch {
    return '';
  }
};

/** Labelled filter field — uniform with the other tabs' toolbars. */
function FieldGroup({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400" />}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}

const BULK_INPUT_CLS =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500';
const BULK_LABEL_CLS = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1';

/** One editable row in the bulk-add grid. Class + Academic Year are shared
 *  in the header, so each row only carries the per-subject fields. The
 *  subject loader is owned here so changing the shared class/year only
 *  re-evaluates this row's options without remounting unrelated rows. */
function BulkSyllabusRow({
  row, idx, classId, academicId, chapterLoader,
  onSelectChange, onFieldChange, onRemove, canRemove, t,
}) {
  const subjectLoader = useMemo(
    () => makeOptionLoader(
      'subject_class_options',
      () => ({ cl_id: classId, a_y_id: academicId }),
      { labelKey: 'subject_name' },
    ),
    [classId, academicId],
  );
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0B3C5D] text-white text-[11px] font-bold">
          {idx + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            title={t('teacherSyllabus.removeRow', { defaultValue: 'Remove row' })}
            className="p-1.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
        <div>
          <label className={BULK_LABEL_CLS}>
            {t('teacherSyllabus.fields.subject')} <span className="text-rose-500">*</span>
          </label>
          <Select2
            key={`bulk-sub-${idx}-${classId}-${academicId}`}
            name={`bulk-sub-${idx}`}
            value={row.sub_cl_id}
            selectedLabel={row.sub_cl_label}
            onChange={onSelectChange('sub_cl_id', 'sub_cl_label')}
            loadOptions={subjectLoader}
            isDisabled={!classId || !academicId}
            placeholder={classId && academicId ? t('select.subject') : t('select.pickClassYearFirst')}
          />
        </div>
        <div>
          <label className={BULK_LABEL_CLS}>{t('teacherSyllabus.fields.chapter')}</label>
          <Select2
            name={`bulk-chap-${idx}`}
            value={row.chapter}
            selectedLabel={row.chapter_label}
            onChange={onSelectChange('chapter', 'chapter_label')}
            loadOptions={chapterLoader}
            placeholder={t('teacherSyllabus.placeholders.chapter')}
          />
        </div>
        <div>
          <label className={BULK_LABEL_CLS}>{t('teacherSyllabus.fields.topic')}</label>
          <input
            type="text"
            value={row.topic}
            onChange={(e) => onFieldChange('topic', e.target.value)}
            placeholder={t('teacherSyllabus.placeholders.topic')}
            className={BULK_INPUT_CLS}
          />
        </div>
        <div>
          <label className={BULK_LABEL_CLS}>{t('teacherSyllabus.fields.page')}</label>
          <input
            type="text"
            value={row.page}
            onChange={(e) => onFieldChange('page', e.target.value)}
            placeholder={t('teacherSyllabus.placeholders.page')}
            className={BULK_INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={BULK_LABEL_CLS}>{t('teacherSyllabus.fields.description')}</label>
          <input
            type="text"
            value={row.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            placeholder={t('teacherSyllabus.placeholders.description')}
            className={BULK_INPUT_CLS}
          />
        </div>
      </div>
    </div>
  );
}

const EMPTY_BULK_ROW = {
  sub_cl_id: '', sub_cl_label: '',
  chapter: '', chapter_label: '',
  topic: '', page: '', description: '',
};

/**
 * TeacherSyllabusTab — UI shell ee Teacher Syllabus tab.
 * Backend functions waxa diyaarinaayo user-ka.
 */
export default function TeacherSyllabusTab() {
  const { t } = useTranslation();
  const SYLLABUS_COLUMNS = useMemo(() => ([
    { key: 'subject', label: t('teacherSyllabus.cols.subject') },
    { key: 'class', label: t('teacherSyllabus.cols.class') },
    { key: 'chapter', label: t('teacherSyllabus.cols.chapter') },
    { key: 'topic', label: t('teacherSyllabus.cols.topic') },
    { key: 'page', label: t('teacherSyllabus.cols.page') },
    { key: 'reg_date', label: t('teacherSyllabus.cols.date') },
  ]), [t]);
  /* ── Top toolbar 3 selects (id + label) ── */
  const [filterClass,    setFilterClass]    = useState(''); const [filterClassLabel,    setFilterClassLabel]    = useState('');
  const [filterAcademic, setFilterAcademic] = useState(''); const [filterAcademicLabel, setFilterAcademicLabel] = useState('');
  const [filterSubject,  setFilterSubject]  = useState(''); const [filterSubjectLabel,  setFilterSubjectLabel]  = useState('');

  /* ── Lazy loaders (server-side: 25 default + search beyond) ── */
  const classLoader    = useMemo(() => makeOptionLoader('class_options'), []);
  const academicLoader = useMemo(() => makeOptionLoader('academicYeartab', null, { sortByActiveState: true }), []);
  const teacherLoader  = useMemo(() => makeOptionLoader('employee_options'), []);
  const chapterLoader  = useMemo(() => makeOptionLoader('chapter_options'), []);
  const filterSubjectLoader = useMemo(
    () => makeOptionLoader('subject_class_options', () => ({ cl_id: filterClass, a_y_id: filterAcademic }), { labelKey: 'subject_name' }),
    [filterClass, filterAcademic]
  );

  /* ── Table data ── */
  const [tableData, setTableData] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ── Add/Edit modal (dual-mode via editingId) ──
     Edit mode (editingId != null) → single-row form (`form` state).
     Add  mode (editingId == null) → bulk grid (`bulkRows` + shared teacher/year).
     The bulk path lets the user enter several class entries in one pass and
     commits them through a single transactional /api/bulk request. */
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    teacher_id: '', teacher_label: '',
    cl_id: '',      cl_label: '',
    a_y_id: '',     a_y_label: '',
    sub_cl_id: '',  sub_cl_label: '',
    chapter: '',    chapter_label: '',
    topic: '',
    page: '',
    description: '',
  });
  const [bulkTeacher,  setBulkTeacher]  = useState({ id: '', label: '' });
  const [bulkClass,    setBulkClass]    = useState({ id: '', label: '' });
  const [bulkAcademic, setBulkAcademic] = useState({ id: '', label: '' });
  const [bulkRows,     setBulkRows]     = useState([{ ...EMPTY_BULK_ROW }]);
  const isBulkMode = editingId == null;

  /* Modal subject loader keyed on form.cl_id + form.a_y_id. */
  const modalSubjectLoader = useMemo(
    () => makeOptionLoader('subject_class_options', () => ({ cl_id: form.cl_id, a_y_id: form.a_y_id }), { labelKey: 'subject_name' }),
    [form.cl_id, form.a_y_id]
  );

  /* When class/academic filter changes, clear the (now-stale) subject filter. */
  useEffect(() => {
    setFilterSubject('');
    setFilterSubjectLabel('');
  }, [filterClass, filterAcademic]);

  const fetchSyllabusRows = async () => {
    const res = await fetchDataPaginated({
      queryName: 'TeacherSyllabus',
      page: 1,
      limit: 500,
      cl_id: filterClass,
      sub_cl_id: filterSubject,
      a_y_id: filterAcademic,
    });
    return res?.data ?? res?.rows ?? [];
  };

  /* ── GO: load rows, display read-only with action buttons ── */
  const handleGo = async () => {
    setLoadingTable(true);
    try {
      const rows = await fetchSyllabusRows();
      setTableData(rows);
      setTableLoaded(true);
    } catch {
      setTableData([]);
      setTableLoaded(true);
    } finally {
      setLoadingTable(false);
    }
  };

  const openEditModal = async (row) => {
    if (!row?.id) return;
    setEditingId(Number(row.id));
    // Seed what we already know from the table row while the full row loads.
    setForm({
      teacher_id: row.emp_id != null ? String(row.emp_id) : '', teacher_label: row.teacher_name ?? '',
      cl_id: filterClass || '',      cl_label: filterClassLabel || '',
      a_y_id: filterAcademic || '',  a_y_label: filterAcademicLabel || '',
      sub_cl_id: row.sub_cl_id != null ? String(row.sub_cl_id) : '', sub_cl_label: row.subject ?? '',
      chapter: row.chap_id != null ? String(row.chap_id) : '',
      chapter_label: row.chapter ?? '',
      topic: row.topic ?? '',
      page: row.page ?? '',
      description: row.description ?? '',
    });
    setAddOpen(true);

    // Fetch authoritative lesson_plan row by l_p_id so emp_id / sub_cl_id /
    // description AND the matching dropdown labels are always correct,
    // regardless of what show_teacher_daily_sp returned in the table view or
    // whether the toolbar filters were even set when the user clicked Edit.
    try {
      const res = await fetchDataPaginated({
        queryName: 'LessonPlanRow',
        page: 1,
        limit: 1,
        l_p_id: Number(row.id) || 0,
      });
      const full = (res?.data ?? res?.rows ?? [])[0];
      if (full) {
        setForm((f) => ({
          ...f,
          teacher_id:    full.emp_id    != null ? String(full.emp_id)    : f.teacher_id,
          teacher_label: full.teacher_name ?? full.p_name ?? f.teacher_label,
          cl_id:         full.cl_id     != null ? String(full.cl_id)     : f.cl_id,
          cl_label:      full.class ?? full.class_name ?? f.cl_label,
          a_y_id:        full.a_y_id    != null ? String(full.a_y_id)    : f.a_y_id,
          a_y_label:     full.academic ?? full.academic_name ?? f.a_y_label,
          sub_cl_id:     full.sub_cl_id != null ? String(full.sub_cl_id) : f.sub_cl_id,
          sub_cl_label:  full.subject ?? full.subject_name ?? f.sub_cl_label,
          chapter:       full.chap_id   != null ? String(full.chap_id)   : f.chapter,
          chapter_label: full.chapter ?? full.chapter_name ?? f.chapter_label,
          topic:         full.topic ?? f.topic,
          page:          full.page  ?? f.page,
          description:   full.description ?? f.description,
        }));
      }
    } catch {
      /* keep seeded values if the row fetch fails */
    }
  };

  const handleDeleteRow = async (row) => {
    if (!row?.id) return;
    const ok = await confirmDelete({ id: row.id, label: t('tabs.teacherSyllabus'), recordPreview: row.subject_name || row.lesson_title });
    if (!ok) return;
    try {
      const res = await crud({
        operation: 'delete',
        fn: 'lesson_plan_sp',
        params: {
          l_p_id_sp: Number(row.id) || 0,
          emp_id_sp: 0,
          sub_cl_id_sp: 0,
          chap_id_sp: 0,
          topic_sp: '',
          page_sp: '',
          description_sp: '',
          u_br_id_sp: Number(getSessionUBrId()) || 0,
        },
      });
      swal.swalSuccess(t('teacherSyllabus.successTitle'), res?.message || t('teacherSyllabus.deleted'));
      setTableData((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      swal.swalError(t('teacherSyllabus.errorTitle'), err?.message || t('teacherSyllabus.deleteFailed'));
    }
  };

  /* ── Client-side filter + paginate for DataTableCard ── */
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tableData;
    return tableData.filter((r) =>
      SYLLABUS_COLUMNS.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q))
    );
  }, [tableData, searchQuery, SYLLABUS_COLUMNS]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Plain function (NOT useCallback): action buttons need the latest closures
  // for openEditModal / handleDeleteRow so the seed values they read
  // (filterClass, filterClassLabel, filterAcademic, …) reflect the current
  // toolbar selection. A useCallback([]) here would freeze the closure to
  // first-render filter state — empty strings — and Edit would open with
  // blank Class/Year/Teacher fields.
  const renderActions = (row) => (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => openEditModal(row)}
        title={t('common.edit')}
        className="p-1.5 rounded-md text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => handleDeleteRow(row)}
        title={t('common.delete')}
        className="p-1.5 rounded-md text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  /* ── Add/Edit modal handlers ── */
  const openAddModal = () => {
    setEditingId(null);
    // Prefill the shared bulk header from the toolbar's filters when present
    // so the user doesn't have to re-pick class/year for every session.
    setBulkTeacher({ id: '', label: '' });
    setBulkClass({ id: filterClass || '', label: filterClassLabel || '' });
    setBulkAcademic({ id: filterAcademic || '', label: filterAcademicLabel || '' });
    setBulkRows([{ ...EMPTY_BULK_ROW }]);
    setAddOpen(true);
  };
  const closeAddModal = () => {
    setAddOpen(false);
    setEditingId(null);
  };

  /* ── Bulk-row helpers ── */
  const setBulkTeacherChange = (e) => setBulkTeacher({ id: e.target.value, label: e.target.label || '' });
  const setBulkClassChange = (e) => {
    setBulkClass({ id: e.target.value, label: e.target.label || '' });
    // Class change invalidates every row's subject (subjects are scoped by class+year).
    setBulkRows((rows) => rows.map((r) => ({ ...r, sub_cl_id: '', sub_cl_label: '' })));
  };
  const setBulkAcademicChange = (e) => {
    setBulkAcademic({ id: e.target.value, label: e.target.label || '' });
    setBulkRows((rows) => rows.map((r) => ({ ...r, sub_cl_id: '', sub_cl_label: '' })));
  };
  const addBulkRow = () => setBulkRows((rows) => [...rows, { ...EMPTY_BULK_ROW }]);
  const removeBulkRow = (idx) =>
    setBulkRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)));
  const handleBulkRowSelect = (idx) => (key, labelKey) => (e) =>
    setBulkRows((rows) => rows.map((r, i) => (
      i === idx ? { ...r, [key]: e.target.value, [labelKey]: e.target.label || '' } : r
    )));
  const handleBulkRowField = (idx) => (key, value) =>
    setBulkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const validBulkRows = useMemo(
    () => bulkRows.filter((r) => r.sub_cl_id),
    [bulkRows]
  );

  const handleSaveAll = async () => {
    if (!bulkTeacher.id || !bulkClass.id || !bulkAcademic.id) {
      swal.swalError(
        t('teacherSyllabus.errorTitle'),
        t('teacherSyllabus.bulkRequireHeader', { defaultValue: 'Pick teacher, class, and academic year first.' }),
      );
      return;
    }
    if (validBulkRows.length === 0) {
      swal.swalError(
        t('teacherSyllabus.errorTitle'),
        t('teacherSyllabus.bulkRequireRow', { defaultValue: 'Add at least one row with a subject.' }),
      );
      return;
    }
    setSaving(true);
    const u_br_id = Number(getSessionUBrId()) || 0;
    // lesson_plan_sp positional params (see backend/config/dynamicController.js):
    //   l_p_id, emp_id, sub_cl_id, chap_id, topic, page, description, u_br_id, oper
    const steps = validBulkRows.map((r) => ({
      type: 'sp',
      fn: 'lesson_plan_sp',
      params: [
        0,
        Number(bulkTeacher.id) || 0,
        Number(r.sub_cl_id) || 0,
        Number(r.chapter) || 0,
        r.topic || '',
        r.page || '',
        r.description || '',
        u_br_id,
        'insert',
      ],
    }));
    try {
      await runBulk(steps);
      swal.swalSuccess(
        t('teacherSyllabus.successTitle'),
        t('teacherSyllabus.bulkSaved', { count: validBulkRows.length, defaultValue: '{{count}} records saved.' }),
      );
      closeAddModal();
      if (tableLoaded && filterClass && filterAcademic && filterSubject) {
        const rows = await fetchSyllabusRows();
        setTableData(rows);
      }
    } catch (err) {
      swal.swalError(t('teacherSyllabus.errorTitle'), err?.message || t('teacherSyllabus.saveFailed'));
    } finally {
      setSaving(false);
    }
  };
  const setField = (field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'cl_id' || field === 'a_y_id') { next.sub_cl_id = ''; next.sub_cl_label = ''; }
      return next;
    });
  };
  const setSelectField = (k, lk) => (e) => setForm((f) => {
    const next = { ...f, [k]: e.target.value, [lk]: e.target.label || '' };
    if (k === 'cl_id' || k === 'a_y_id') { next.sub_cl_id = ''; next.sub_cl_label = ''; }
    return next;
  });

  const handleSave = async () => {
    if (!form.teacher_id || !form.cl_id || !form.a_y_id || !form.sub_cl_id) return;
    setSaving(true);
    const isEdit = editingId != null;
    try {
      const res = await crud({
        operation: isEdit ? 'update' : 'insert',
        fn: 'lesson_plan_sp',
        params: {
          l_p_id_sp: isEdit ? Number(editingId) || 0 : 0,
          emp_id_sp: Number(form.teacher_id) || 0,
          sub_cl_id_sp: Number(form.sub_cl_id) || 0,
          chap_id_sp: Number(form.chapter) || 0,
          topic_sp: form.topic || '',
          page_sp: form.page || '',
          description_sp: form.description || '',
          u_br_id_sp: Number(getSessionUBrId()) || 0,
        },
      });
      swal.swalSuccess(t('teacherSyllabus.successTitle'), res?.message || (isEdit ? t('teacherSyllabus.updated') : t('teacherSyllabus.saved')));
      closeAddModal();
      if (tableLoaded && filterClass && filterAcademic && filterSubject) {
        const rows = await fetchSyllabusRows();
        setTableData(rows);
      }
    } catch (err) {
      swal.swalError(t('teacherSyllabus.errorTitle'), err?.message || t('teacherSyllabus.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Filter card: header + grouped selects + actions row ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FieldGroup icon={GraduationCap} label={t('select.class', { defaultValue: 'Class' })}>
            <Select2
              name="filterClass"
              value={filterClass}
              selectedLabel={filterClassLabel}
              onChange={(e) => { setFilterClass(e.target.value); setFilterClassLabel(e.target.label || ''); }}
              loadOptions={classLoader}
              placeholder={t('select.class')}
            />
          </FieldGroup>
          <FieldGroup icon={CalendarDays} label={t('select.academicYear', { defaultValue: 'Academic Year' })}>
            <Select2
              name="filterAcademic"
              value={filterAcademic}
              selectedLabel={filterAcademicLabel}
              onChange={(e) => { setFilterAcademic(e.target.value); setFilterAcademicLabel(e.target.label || ''); }}
              loadOptions={academicLoader}
              placeholder={t('select.academicYear')}
            />
          </FieldGroup>
          <FieldGroup icon={BookOpen} label={t('select.subject', { defaultValue: 'Subject' })}>
            <Select2
              key={`fs-${filterClass}-${filterAcademic}`}
              name="filterSubject"
              value={filterSubject}
              selectedLabel={filterSubjectLabel}
              onChange={(e) => { setFilterSubject(e.target.value); setFilterSubjectLabel(e.target.label || ''); }}
              loadOptions={filterSubjectLoader}
              isDisabled={!filterClass || !filterAcademic}
              placeholder={filterClass && filterAcademic ? t('select.subject') : t('select.pickClassYearFirst')}
            />
          </FieldGroup>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={handleGo}
            disabled={!filterClass || !filterAcademic || !filterSubject || loadingTable}
          >
            {loadingTable ? t('action.loading') : t('action.go')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
          >
            {t('teacherSyllabus.addSyllabus')}
          </Button>
        </div>
      </div>

      {/* ── Datatable (populated after Go) ── */}
      {tableLoaded && (
        <DataTableCard
          columns={SYLLABUS_COLUMNS}
          data={pagedRows}
          isLoading={loadingTable}
          searchValue={searchQuery}
          onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          onSearchSubmit={() => {}}
          searchPlaceholder={t('teacherSyllabus.searchPlaceholder')}
          renderActions={renderActions}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={pageSize}
          onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          onPageClick={(p) => setCurrentPage(p)}
          onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
          emptyTitle={t('empty.noData')}
          emptyDescription={t('empty.noDataFilters')}
        />
      )}

      {/* ── Teacher Syllabus Form Modal ──
           Add  → bulk grid (one teacher + one academic year + many class rows)
           Edit → single-record form (unchanged) */}
      <Modal
        isOpen={addOpen}
        onClose={closeAddModal}
        title={isBulkMode ? t('teacherSyllabus.bulkAddTitle', { defaultValue: 'Add Multiple Syllabus Entries' }) : t('teacherSyllabus.editTitle')}
        size={isBulkMode ? '2xl' : 'lg'}
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeAddModal}>{t('common.close')}</Button>
            {isBulkMode ? (
              <Button
                variant="primary"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSaveAll}
                disabled={saving || !bulkTeacher.id || !bulkClass.id || !bulkAcademic.id || validBulkRows.length === 0}
              >
                {saving
                  ? t('action.saving')
                  : t('teacherSyllabus.bulkSaveAll', { count: validBulkRows.length, defaultValue: 'Save All ({{count}})' })}
              </Button>
            ) : (
              <Button
                variant="primary"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSave}
                disabled={saving || !form.teacher_id || !form.cl_id || !form.a_y_id || !form.sub_cl_id}
              >
                {saving ? t('action.saving') : t('common.save')}
              </Button>
            )}
          </>
        }
      >
        {isBulkMode ? (
          <div className="space-y-4">
            {/* Shared header — applies to every bulk row */}
            <div className="rounded-xl border border-[#0B3C5D]/15 bg-[#0B3C5D]/[0.04] dark:bg-slate-800/40 dark:border-slate-700 p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <Users className="w-4 h-4 text-[#0B3C5D] dark:text-teal-400" />
                <span className="text-[12px] font-semibold tracking-wide text-[#0B3C5D] dark:text-teal-300 uppercase">
                  {t('teacherSyllabus.bulkHeader', { defaultValue: 'Applies to all rows below' })}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                <div>
                  <label className={BULK_LABEL_CLS}>
                    {t('teacherSyllabus.fields.teacher')} <span className="text-rose-500">*</span>
                  </label>
                  <Select2
                    name="bulk-teacher"
                    value={bulkTeacher.id}
                    selectedLabel={bulkTeacher.label}
                    onChange={setBulkTeacherChange}
                    loadOptions={teacherLoader}
                    placeholder={t('select.teacher')}
                  />
                </div>
                <div>
                  <label className={BULK_LABEL_CLS}>
                    {t('teacherSyllabus.fields.class')} <span className="text-rose-500">*</span>
                  </label>
                  <Select2
                    name="bulk-class"
                    value={bulkClass.id}
                    selectedLabel={bulkClass.label}
                    onChange={setBulkClassChange}
                    loadOptions={classLoader}
                    placeholder={t('select.class')}
                  />
                </div>
                <div>
                  <label className={BULK_LABEL_CLS}>
                    {t('teacherSyllabus.fields.academicYear')} <span className="text-rose-500">*</span>
                  </label>
                  <Select2
                    name="bulk-academic"
                    value={bulkAcademic.id}
                    selectedLabel={bulkAcademic.label}
                    onChange={setBulkAcademicChange}
                    loadOptions={academicLoader}
                    placeholder={t('select.academicYear')}
                  />
                </div>
              </div>
            </div>

            {/* Stacked rows — one class entry per card */}
            <div className="space-y-3">
              {bulkRows.map((row, idx) => (
                <BulkSyllabusRow
                  key={idx}
                  row={row}
                  idx={idx}
                  classId={bulkClass.id}
                  academicId={bulkAcademic.id}
                  chapterLoader={chapterLoader}
                  onSelectChange={handleBulkRowSelect(idx)}
                  onFieldChange={handleBulkRowField(idx)}
                  onRemove={() => removeBulkRow(idx)}
                  canRemove={bulkRows.length > 1}
                  t={t}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={addBulkRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[#0B3C5D]/40 text-[#0B3C5D] dark:text-teal-300 dark:border-teal-400/40 hover:bg-[#0B3C5D]/5 dark:hover:bg-teal-500/5 text-sm font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                {t('teacherSyllabus.addRow', { defaultValue: 'Add Row' })}
              </button>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('teacherSyllabus.bulkValidCount', {
                  count: validBulkRows.length,
                  defaultValue: '{{count}} ready to save',
                })}
              </span>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('teacherSyllabus.fields.teacher')} <span className="text-rose-500">*</span>
            </label>
            <Select2
              name="teacher"
              value={form.teacher_id}
              selectedLabel={form.teacher_label}
              onChange={setSelectField('teacher_id', 'teacher_label')}
              loadOptions={teacherLoader}
              placeholder={t('select.teacher')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('teacherSyllabus.fields.class')} <span className="text-rose-500">*</span>
            </label>
            <Select2
              name="cl_id"
              value={form.cl_id}
              selectedLabel={form.cl_label}
              onChange={setSelectField('cl_id', 'cl_label')}
              loadOptions={classLoader}
              placeholder={t('select.class')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('teacherSyllabus.fields.academicYear')} <span className="text-rose-500">*</span>
            </label>
            <Select2
              name="a_y_id"
              value={form.a_y_id}
              selectedLabel={form.a_y_label}
              onChange={setSelectField('a_y_id', 'a_y_label')}
              loadOptions={academicLoader}
              placeholder={t('select.academicYear')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('teacherSyllabus.fields.subject')} <span className="text-rose-500">*</span>
            </label>
            <Select2
              key={`msub-${form.cl_id}-${form.a_y_id}`}
              name="sub_cl_id"
              value={form.sub_cl_id}
              selectedLabel={form.sub_cl_label}
              onChange={setSelectField('sub_cl_id', 'sub_cl_label')}
              loadOptions={modalSubjectLoader}
              isDisabled={!form.cl_id || !form.a_y_id}
              placeholder={form.cl_id && form.a_y_id ? t('select.subject') : t('select.pickClassYearFirst')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('teacherSyllabus.fields.chapter')}</label>
            <Select2
              name="chapter"
              value={form.chapter}
              selectedLabel={form.chapter_label}
              onChange={setSelectField('chapter', 'chapter_label')}
              loadOptions={chapterLoader}
              placeholder={t('teacherSyllabus.placeholders.chapter')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('teacherSyllabus.fields.topic')}</label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => setField('topic', e.target.value)}
              placeholder={t('teacherSyllabus.placeholders.topic')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('teacherSyllabus.fields.page')}</label>
            <input
              type="text"
              value={form.page}
              onChange={(e) => setField('page', e.target.value)}
              placeholder={t('teacherSyllabus.placeholders.page')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('teacherSyllabus.fields.description')}</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder={t('teacherSyllabus.placeholders.description')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
        </div>
        )}
      </Modal>
    </div>
  );
}

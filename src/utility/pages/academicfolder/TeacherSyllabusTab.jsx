import { useEffect, useMemo, useState, useCallback } from 'react';
import { Eye, Pencil, Plus, Save, Trash2, XCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import Modal from '../../../components/ui/Modal';
import DataTableCard from '../../../components/DataTableCard';
import { makeOptionLoader, fetchDataPaginated, crud } from '../../../services/api';
import * as swal from '../../../utils/swal';

const SYLLABUS_COLUMNS = [
  { key: 'subject', label: 'Subject' },
  { key: 'class', label: 'Class' },
  { key: 'chapter', label: 'Chapter' },
  { key: 'topic', label: 'Topic' },
  { key: 'page', label: 'Page' },
  { key: 'reg_date', label: 'Date' },
];

const AUTH_STORAGE_KEY = 'brabaariye_user';
const getSessionUBrId = () => {
  if (typeof window === 'undefined') return '';
  try {
    return JSON.parse(window.localStorage?.getItem(AUTH_STORAGE_KEY) || '{}')?.u_br_id ?? '';
  } catch {
    return '';
  }
};

/**
 * TeacherSyllabusTab — UI shell ee Teacher Syllabus tab.
 * Backend functions waxa diyaarinaayo user-ka.
 */
export default function TeacherSyllabusTab() {
  /* ── Top toolbar 3 selects (id + label) ── */
  const [filterClass,    setFilterClass]    = useState(''); const [filterClassLabel,    setFilterClassLabel]    = useState('');
  const [filterAcademic, setFilterAcademic] = useState(''); const [filterAcademicLabel, setFilterAcademicLabel] = useState('');
  const [filterSubject,  setFilterSubject]  = useState(''); const [filterSubjectLabel,  setFilterSubjectLabel]  = useState('');

  /* ── Lazy loaders (server-side: 25 default + search beyond) ── */
  const classLoader    = useMemo(() => makeOptionLoader('class_options'), []);
  const academicLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);
  const teacherLoader  = useMemo(() => makeOptionLoader('employee_options'), []);
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

  /* ── Add/Edit modal (dual-mode via editingId) ── */
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    teacher_id: '', teacher_label: '',
    cl_id: '',      cl_label: '',
    a_y_id: '',     a_y_label: '',
    sub_cl_id: '',  sub_cl_label: '',
    chapter: '',
    topic: '',
    page: '',
    description: '',
  });

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
      chapter: row.chapter != null ? String(row.chapter) : '',
      topic: row.topic ?? '',
      page: row.page ?? '',
      description: row.description ?? '',
    });
    setAddOpen(true);

    // Fetch authoritative lesson_plan row by l_p_id so emp_id / sub_cl_id / description
    // are always correct regardless of what show_teacher_daily_sp returns.
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
          teacher_id: full.emp_id != null ? String(full.emp_id) : f.teacher_id,
          cl_id: full.cl_id != null ? String(full.cl_id) : f.cl_id,
          a_y_id: full.a_y_id != null ? String(full.a_y_id) : f.a_y_id,
          sub_cl_id: full.sub_cl_id != null ? String(full.sub_cl_id) : f.sub_cl_id,
          chapter: full.chap_id != null ? String(full.chap_id) : f.chapter,
          topic: full.topic ?? f.topic,
          page: full.page ?? f.page,
          description: full.description ?? f.description,
        }));
      }
    } catch {
      /* keep seeded values if the row fetch fails */
    }
  };

  const handleDeleteRow = async (row) => {
    if (!row?.id) return;
    const ok = await swal.swalConfirm({
      title: 'Hubi tirtirka',
      text: 'Ma hubtaa inaad tirtirto recordkan?',
      confirmText: 'Haa, tirtir',
      cancelText: 'Maya',
    });
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
      swal.swalSuccess('Guul', res?.message || 'Recordka waa la tirtiray.');
      setTableData((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      swal.swalError('Qalad', err?.message || 'Tirtirka way fashilantay.');
    }
  };

  /* ── Client-side filter + paginate for DataTableCard ── */
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tableData;
    return tableData.filter((r) =>
      SYLLABUS_COLUMNS.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q))
    );
  }, [tableData, searchQuery]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderActions = useCallback(
    (row) => (
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => openEditModal(row)}
          title="Edit"
          className="p-1.5 rounded-md text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleDeleteRow(row)}
          title="Delete"
          className="p-1.5 rounded-md text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ── Add/Edit modal handlers ── */
  const openAddModal = () => {
    setEditingId(null);
    setForm({
      teacher_id: '', teacher_label: '',
      cl_id: filterClass || '', cl_label: filterClassLabel || '',
      a_y_id: filterAcademic || '', a_y_label: filterAcademicLabel || '',
      sub_cl_id: '', sub_cl_label: '',
      chapter: '',
      topic: '',
      page: '',
      description: '',
    });
    setAddOpen(true);
  };
  const closeAddModal = () => {
    setAddOpen(false);
    setEditingId(null);
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
      swal.swalSuccess('Guul', res?.message || (isEdit ? 'Xogta waa la cusboonaysiiyay.' : 'Xogta waa la kaydiyay.'));
      closeAddModal();
      if (tableLoaded && filterClass && filterAcademic && filterSubject) {
        const rows = await fetchSyllabusRows();
        setTableData(rows);
      }
    } catch (err) {
      swal.swalError('Qalad', err?.message || 'Kaydinta way fashilantay.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar: 3 selects + GO + EDIT + ADD ── */}
      <div className="flex flex-wrap items-end gap-2 px-3 py-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
        <div className="min-w-[160px] flex-1">
          <Select2
            name="filterClass"
            value={filterClass}
            selectedLabel={filterClassLabel}
            onChange={(e) => { setFilterClass(e.target.value); setFilterClassLabel(e.target.label || ''); }}
            loadOptions={classLoader}
            placeholder="Select Class"
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <Select2
            name="filterAcademic"
            value={filterAcademic}
            selectedLabel={filterAcademicLabel}
            onChange={(e) => { setFilterAcademic(e.target.value); setFilterAcademicLabel(e.target.label || ''); }}
            loadOptions={academicLoader}
            placeholder="Select AcademicYear"
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <Select2
            key={`fs-${filterClass}-${filterAcademic}`}
            name="filterSubject"
            value={filterSubject}
            selectedLabel={filterSubjectLabel}
            onChange={(e) => { setFilterSubject(e.target.value); setFilterSubjectLabel(e.target.label || ''); }}
            loadOptions={filterSubjectLoader}
            isDisabled={!filterClass || !filterAcademic}
            placeholder={filterClass && filterAcademic ? 'Select Subject' : 'Pick Class + Year first'}
          />
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Eye className="w-4 h-4" />}
          onClick={handleGo}
          disabled={!filterClass || !filterAcademic || !filterSubject || loadingTable}
        >
          {loadingTable ? 'Loading…' : 'Go'}
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openAddModal}
        >
          Add Teacher Syllabus
        </Button>
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
          searchPlaceholder="Search syllabus..."
          renderActions={renderActions}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={pageSize}
          onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          onPageClick={(p) => setCurrentPage(p)}
          onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
          emptyTitle="Wax xog ah ma jiraan"
          emptyDescription="Filter-yada kuwa kale isku day ama hubi inay records jiraan."
        />
      )}

      {/* ── Teacher Syllabus Form Modal ── */}
      <Modal
        isOpen={addOpen}
        onClose={closeAddModal}
        title={editingId != null ? 'Teacher Syllabus — Edit' : 'Teacher Syllabus Form'}
        size="lg"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeAddModal}>Close</Button>
            <Button
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={saving || !form.teacher_id || !form.cl_id || !form.a_y_id || !form.sub_cl_id}
            >
              {saving ? 'Kaydinayaa…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Teacher <span className="text-rose-500">*</span>
            </label>
            <Select2
              name="teacher"
              value={form.teacher_id}
              selectedLabel={form.teacher_label}
              onChange={setSelectField('teacher_id', 'teacher_label')}
              loadOptions={teacherLoader}
              placeholder="Select Teacher"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Class <span className="text-rose-500">*</span>
            </label>
            <Select2
              name="cl_id"
              value={form.cl_id}
              selectedLabel={form.cl_label}
              onChange={setSelectField('cl_id', 'cl_label')}
              loadOptions={classLoader}
              placeholder="Select Class"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <Select2
              name="a_y_id"
              value={form.a_y_id}
              selectedLabel={form.a_y_label}
              onChange={setSelectField('a_y_id', 'a_y_label')}
              loadOptions={academicLoader}
              placeholder="Select Academic Year"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject <span className="text-rose-500">*</span>
            </label>
            <Select2
              key={`msub-${form.cl_id}-${form.a_y_id}`}
              name="sub_cl_id"
              value={form.sub_cl_id}
              selectedLabel={form.sub_cl_label}
              onChange={setSelectField('sub_cl_id', 'sub_cl_label')}
              loadOptions={modalSubjectLoader}
              isDisabled={!form.cl_id || !form.a_y_id}
              placeholder={form.cl_id && form.a_y_id ? 'Select Subject' : 'Pick Class + Year first'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Chapter (ID)</label>
            <input
              type="number"
              min="0"
              value={form.chapter}
              onChange={(e) => setField('chapter', e.target.value)}
              placeholder="e.g. 1"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Topic</label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => setField('topic', e.target.value)}
              placeholder="e.g. Introduction"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Page</label>
            <input
              type="text"
              value={form.page}
              onChange={(e) => setField('page', e.target.value)}
              placeholder="e.g. 12"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Faahfaahin dheeraad ah (optional)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

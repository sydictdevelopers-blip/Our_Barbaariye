import { useCallback, useMemo, useState } from 'react';
import { Database, Pencil, Plus, Trash2, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import EmptyState from '../../../components/ui/EmptyState';
import DataTableCard from '../../../components/DataTableCard';
import { crud, fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalConfirm, swalError, swalSuccess } from '../../../utils/swal';

const ACTIVITY_COLUMNS = [
  { key: 'activity_name', label: 'Activity' },
  { key: 'class_name',    label: 'Class' },
  { key: 'subject_name',  label: 'Subject' },
  { key: 'marks',         label: 'Marks' },
  { key: 'deadline',      label: 'Deadline' },
  { key: 'description',   label: 'Description' },
  { key: 'reg_date',      label: 'Reg Date' },
];

const EMPTY_FORM = {
  ac_id: '', ac_label: '',
  cl_id: '', cl_label: '',
  a_y_id: '', a_y_label: '',
  sub_cl_id: '', sub_cl_label: '',
  e_r_id: '', e_r_label: '',
  marks: '', description: '', deadline: '',
};

const INPUT_CLS = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLS = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';

function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      {children}
    </div>
  );
}

export default function LessonActivityMarksTab() {
  /* ── toolbar (id + label so we can pre-seed Add modal) ── */
  const [filterAcademic, setFilterAcademic] = useState('');
  const [filterAcademicLabel, setFilterAcademicLabel] = useState('');
  const [filterClass,    setFilterClass]    = useState('');
  const [filterClassLabel, setFilterClassLabel] = useState('');

  /* ── Lazy loaders (server-side: 25 default + search) ── */
  const academicLoader = useMemo(() => makeOptionLoader('academic_options'), []);
  const classLoader    = useMemo(() => makeOptionLoader('class_options'), []);
  const activityLoader = useMemo(() => makeOptionLoader('activity_type_options'), []);
  const examRegLoader  = useMemo(() => makeOptionLoader('exam_reg_options'), []);

  /* ── table ── */
  const [tableData,    setTableData]    = useState([]);
  const [tableLoaded,  setTableLoaded]  = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);

  /* ── pagination ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);

  /* ── modal ── */
  const [addOpen,   setAddOpen]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);

  /* ── Subject loader depends on cl_id + a_y_id; recreate when they change. ── */
  const subjectLoader = useMemo(
    () => makeOptionLoader('subject_class_options', () => ({ cl_id: form.cl_id, a_y_id: form.a_y_id }), { labelKey: 'subject_name' }),
    [form.cl_id, form.a_y_id]
  );

  /* ── fetch rows ── */
  const fetchRows = useCallback(async (clId, ayId) => {
    const res = await fetchDataPaginated({ queryName: 'LessonActivity', page: 1, limit: 500, search: '', cl_id: clId, a_y_id: ayId });
    return res?.data ?? [];
  }, []);

  const handleShowData = async () => {
    if (!filterClass || !filterAcademic) return;
    setLoadingTable(true);
    try {
      const rows = await fetchRows(filterClass, filterAcademic);
      setTableData(rows);
      setTableLoaded(true);
      setCurrentPage(1);
    } catch (e) {
      swalError(e?.message || 'Error loading data');
    } finally {
      setLoadingTable(false);
    }
  };

  /* ── add ── */
  const handleAddNew = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      cl_id: filterClass, cl_label: filterClassLabel,
      a_y_id: filterAcademic, a_y_label: filterAcademicLabel,
    });
    setAddOpen(true);
  };

  /* ── edit ── */
  const openEditModal = useCallback(async (row) => {
    setEditingId(row.ac_t_id);
    try {
      const res = await fetchDataPaginated({ queryName: 'LessonActivityRow', page: 1, limit: 1, search: '', ac_t_id: row.ac_t_id });
      const r = (res?.data ?? [])[0];
      if (!r) { swalError('Could not load row data'); return; }
      setForm({
        ac_id:       String(r.ac_id       ?? ''),  ac_label:     String(row.activity_name ?? ''),
        cl_id:       String(r.cl_id       ?? ''),  cl_label:     String(row.class_name    ?? ''),
        a_y_id:      String(r.a_y_id      ?? ''),  a_y_label:    '', // unknown until user opens dropdown
        sub_cl_id:   String(r.sub_cl_id   ?? ''),  sub_cl_label: String(row.subject_name  ?? ''),
        e_r_id:      String(r.e_r_id      ?? ''),  e_r_label:    '', // unknown until user opens dropdown
        marks:       String(r.marks       ?? ''),
        description: String(r.description ?? ''),
        deadline:    String(r.deadline    ?? ''),
      });
      setAddOpen(true);  // open only after form is ready
    } catch (e) {
      swalError(e?.message || 'Could not load row');
    }
  }, []);

  /* ── delete ── */
  const handleDelete = useCallback(async (row) => {
    const ok = await swalConfirm({ title: 'Delete this lesson activity?' });
    if (!ok) return;
    try {
      await crud({
        operation: 'delete',
        fn: 'lesson_activity_sp',
        params: {
          ac_t_id_sp:     Number(row.ac_t_id)  || 0,
          ac_id_sp:       Number(row.ac_id)    || 0,
          cl_id_sp:       Number(row.cl_id)    || 0,
          sub_cl_id_sp:   Number(row.sub_cl_id)|| 0,
          marks_sp:       Number(row.marks)    || 0,
          description_sp: row.description      ?? '',
          deadline_sp:    row.deadline         || null,
          e_r_id_sp:      Number(row.e_r_id) || 0,
          language_sp:    0,
        },
      });
      setTableData((prev) => prev.filter((r) => r.ac_t_id !== row.ac_t_id));
      swalSuccess('Deleted successfully');
    } catch (e) {
      swalError(e?.message || 'Delete failed');
    }
  }, []);

  /* ── save ── */
  const handleSave = async () => {
    if (!form.ac_id || !form.cl_id || !form.a_y_id || !form.sub_cl_id || !form.e_r_id || !form.deadline) {
      swalError('Activity, Class, Academic Year, Subject, Exam Registration and Deadline are required');
      return;
    }
    setSaving(true);
    try {
      const isEdit = editingId != null;
      await crud({
        operation: isEdit ? 'update' : 'insert',
        fn: 'lesson_activity_sp',
        params: {
          ac_t_id_sp:     isEdit ? Number(editingId) : 0,
          ac_id_sp:       Number(form.ac_id)        || 0,
          cl_id_sp:       Number(form.cl_id)         || 0,
          sub_cl_id_sp:   Number(form.sub_cl_id)    || 0,
          marks_sp:       form.marks ? Number(form.marks) : 0,
          description_sp: form.description           || '',
          deadline_sp:    form.deadline              || null,
          e_r_id_sp:      Number(form.e_r_id) || 0,
          language_sp:    0,
        },
      });
      swalSuccess(isEdit ? 'Updated successfully' : 'Added successfully');
      setAddOpen(false);
      const rows = await fetchRows(filterClass || form.cl_id, filterAcademic || form.a_y_id);
      setTableData(rows);
      setTableLoaded(true);
    } catch (e) {
      swalError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── search + pagination ── */
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tableData;
    return tableData.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [tableData, searchQuery]);

  const totalRows = filteredRows.length;
  const pagedRows = useMemo(() => {
    const s = (currentPage - 1) * pageSize;
    return filteredRows.slice(s, s + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const renderActions = useCallback((row) => (
    <div className="flex gap-1">
      <button onClick={() => openEditModal(row)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600"><Pencil className="w-4 h-4" /></button>
      <button onClick={() => handleDelete(row)}  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-red-500"><Trash2  className="w-4 h-4" /></button>
    </div>
  ), [openEditModal, handleDelete]);

  const setField = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));
  const setSelectField = (k, lk) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value, [lk]: e.target.label || '' }));

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-end gap-2 px-3 py-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
        <div className="min-w-[180px] flex-1">
          <Select2
            name="filterAcademic"
            value={filterAcademic}
            selectedLabel={filterAcademicLabel}
            onChange={(e) => { setFilterAcademic(e.target.value); setFilterAcademicLabel(e.target.label || ''); }}
            loadOptions={academicLoader}
            placeholder="Select Academic Year"
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <Select2
            name="filterClass"
            value={filterClass}
            selectedLabel={filterClassLabel}
            onChange={(e) => { setFilterClass(e.target.value); setFilterClassLabel(e.target.label || ''); }}
            loadOptions={classLoader}
            placeholder="Select Class"
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShowData} disabled={!filterAcademic || !filterClass || loadingTable}>
          {loadingTable ? 'Loading…' : 'Show Data'}
        </Button>
        <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddNew}>
          Add Activity
        </Button>
      </div>

      {/* ── Empty states ── */}
      {!tableLoaded && (
        <div className="rounded-xl border border-slate-200/70 bg-white py-10">
          <EmptyState title="Wax xog ah lama soo bandhigin" description="Dooro Academic Year iyo Class, kadibna riix Show Data." />
        </div>
      )}
      {tableLoaded && tableData.length === 0 && (
        <div className="rounded-xl border border-slate-200/70 bg-white py-10">
          <EmptyState title="Wax xog ah ma jiraan" description="Filter-yada kale isku day ama hubi inay records jiraan." />
        </div>
      )}

      {/* ── DataTable ── */}
      {tableLoaded && tableData.length > 0 && (
        <DataTableCard
          title="Lesson Activities"
          columns={ACTIVITY_COLUMNS}
          data={pagedRows}
          total={totalRows}
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalRows / pageSize))}
          itemsPerPage={pageSize}
          onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage((p) => Math.min(Math.ceil(totalRows / pageSize), p + 1))}
          onPageClick={(p) => setCurrentPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          searchValue={searchQuery}
          onSearchChange={(e) => { setSearchQuery(e?.target?.value ?? ''); setCurrentPage(1); }}
          onSearchSubmit={() => {}}
          renderActions={renderActions}
        />
      )}

      {/* ── Modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Lesson Activity' : 'Add Lesson Activity'}
              </h3>
              <button onClick={() => setAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — 2-column grid */}
            <div className="px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-4">

              {/* Activity */}
              <Field label="Activity *">
                <Select2 name="ac_id" value={form.ac_id} selectedLabel={form.ac_label}
                  onChange={setSelectField('ac_id', 'ac_label')} loadOptions={activityLoader} placeholder="Select Activity" />
              </Field>

              {/* Exam Reg */}
              <Field label="Exam Registration *">
                <Select2 name="e_r_id" value={form.e_r_id} selectedLabel={form.e_r_label}
                  onChange={setSelectField('e_r_id', 'e_r_label')} loadOptions={examRegLoader} placeholder="Select Exam Reg" />
              </Field>

              {/* Class */}
              <Field label="Class *">
                <Select2 name="cl_id" value={form.cl_id} selectedLabel={form.cl_label}
                  onChange={(e) => setForm((prev) => ({ ...prev, cl_id: e.target.value, cl_label: e.target.label || '', sub_cl_id: '', sub_cl_label: '' }))}
                  loadOptions={classLoader} placeholder="Select Class" />
              </Field>

              {/* Academic Year */}
              <Field label="Academic Year *">
                <Select2 name="a_y_id" value={form.a_y_id} selectedLabel={form.a_y_label}
                  onChange={(e) => setForm((prev) => ({ ...prev, a_y_id: e.target.value, a_y_label: e.target.label || '', sub_cl_id: '', sub_cl_label: '' }))}
                  loadOptions={academicLoader} placeholder="Select Academic Year" />
              </Field>

              {/* Subject — full width; loader keyed on cl_id+a_y_id so the dropdown remounts when filters change */}
              <div className="col-span-2">
                <Field label="Subject *">
                  <Select2
                    key={`sub-${form.cl_id}-${form.a_y_id}`}
                    name="sub_cl_id"
                    value={form.sub_cl_id}
                    selectedLabel={form.sub_cl_label}
                    onChange={setSelectField('sub_cl_id', 'sub_cl_label')}
                    loadOptions={subjectLoader}
                    isDisabled={!form.cl_id || !form.a_y_id}
                    placeholder={form.cl_id && form.a_y_id ? 'Select Subject' : 'Select Class & Academic Year first'}
                  />
                </Field>
              </div>

              {/* Marks */}
              <Field label="Marks">
                <input type="number" value={form.marks} onChange={setField('marks')} className={INPUT_CLS} placeholder="0" />
              </Field>

              {/* Deadline */}
              <Field label="Deadline *">
                <input type="date" value={form.deadline} onChange={setField('deadline')} className={INPUT_CLS} />
              </Field>

              {/* Description — full width */}
              <div className="col-span-2">
                <Field label="Description">
                  <textarea value={form.description} onChange={setField('description')} rows={3}
                    className={`${INPUT_CLS} resize-none`} placeholder="Description…" />
                </Field>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <Button size="sm" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

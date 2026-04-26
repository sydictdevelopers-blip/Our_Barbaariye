import { useCallback, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import EmptyState from '../../../components/ui/EmptyState';
import DataTableCard from '../../../components/DataTableCard';
import { crud, fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalConfirm, swalError, swalSuccess } from '../../../utils/swal';

const RESULT_COLUMNS = [
  { key: 'student_name',   label: 'Student' },
  { key: 'batch_name',     label: 'Batch' },
  { key: 'activity_type',  label: 'Activity' },
  { key: 'subject_name',   label: 'Subject' },
  { key: 'max_marks',      label: 'Max Marks' },
  { key: 'marks_obtained', label: 'Obtained' },
  { key: 'state',          label: 'State' },
];

const EMPTY_FORM = { ac_t_id: '', ac_t_label: '', std_cl_id: '', std_cl_label: '', marks_obtained: '', state: 'Active' };

const INPUT_CLS = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLS = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

export default function LessonActivityResultsTab() {
  /* ── filter state (id + label) ── */
  const [filterAcademic,     setFilterAcademic]     = useState(''); const [filterAcademicLabel,     setFilterAcademicLabel]     = useState('');
  const [filterClass,        setFilterClass]        = useState(''); const [filterClassLabel,        setFilterClassLabel]        = useState('');
  const [filterBatch,        setFilterBatch]        = useState(''); const [filterBatchLabel,        setFilterBatchLabel]        = useState('');
  const [filterSubject,      setFilterSubject]      = useState(''); const [filterSubjectLabel,      setFilterSubjectLabel]      = useState('');
  const [filterActivityType, setFilterActivityType] = useState(''); const [filterActivityTypeLabel, setFilterActivityTypeLabel] = useState('');
  const [filterExam,         setFilterExam]         = useState(''); const [filterExamLabel,         setFilterExamLabel]         = useState('');
  const [filterDate,         setFilterDate]         = useState(new Date().toISOString().slice(0, 10));

  /* ── Lazy loaders (server-side: 25 default + search beyond) ── */
  const academicLoader     = useMemo(() => makeOptionLoader('academic_options'), []);
  const classLoader        = useMemo(() => makeOptionLoader('class_options'), []);
  const batchLoader        = useMemo(() => makeOptionLoader('batch_options'), []);
  const activityTypeLoader = useMemo(() => makeOptionLoader('activity_type_options'), []);
  const examLoader         = useMemo(() => makeOptionLoader('exam_reg_options'), []);
  // Subject loader keyed on class + academic year — recreate when those change.
  const subjectLoader = useMemo(
    () => makeOptionLoader('subject_class_options', () => ({ cl_id: filterClass, a_y_id: filterAcademic }), { labelKey: 'subject_name' }),
    [filterClass, filterAcademic]
  );
  // Modal-only loaders keyed on the filter context.
  const studentClassLoader = useMemo(
    () => makeOptionLoader('student_class_options', () => ({ a_y_id: filterAcademic, cl_id: filterClass, b_id: filterBatch || 0 })),
    [filterAcademic, filterClass, filterBatch]
  );
  const activityLoader = useMemo(
    () => makeOptionLoader('lesson_activity_options', () => ({ cl_id: filterClass, a_y_id: filterAcademic })),
    [filterClass, filterAcademic]
  );

  /* ── table ── */
  const [tableData,    setTableData]    = useState([]);
  const [tableLoaded,  setTableLoaded]  = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [bulkLoading,  setBulkLoading]  = useState(false);

  /* ── pagination ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);

  /* ── modal ── */
  const [addOpen,   setAddOpen]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);

  /* ── fetch rows ── */
  const fetchRows = useCallback(async () => {
    const res = await fetchDataPaginated({
      queryName: 'LessonActivityResults', page: 1, limit: 500, search: '',
      a_y_id: filterAcademic, cl_id: filterClass,
      b_id: filterBatch || 0, sub_cl_id: filterSubject || 0,
      ac_id: filterActivityType || 0, ex_reg_id: filterExam || 0,
    });
    return res?.data ?? [];
  }, [filterAcademic, filterClass, filterBatch, filterSubject, filterActivityType, filterExam]);

  const handleShow = async () => {
    if (!filterAcademic || !filterClass) { swalError('Academic Year and Class are required'); return; }
    setLoadingTable(true);
    try {
      const rows = await fetchRows();
      setTableData(rows);
      setTableLoaded(true);
      setCurrentPage(1);
    } catch (e) {
      swalError(e?.message || 'Error loading data');
    } finally {
      setLoadingTable(false);
    }
  };

  /* ── Update Exam Activity (bulk populate) ── */
  const handleUpdateExam = async () => {
    if (!filterAcademic || !filterClass) { swalError('Academic Year and Class are required'); return; }
    const ok = await swalConfirm({ title: 'Auto-populate result records for all students?', confirmText: 'Yes, update' });
    if (!ok) return;
    setBulkLoading(true);
    try {
      await crud({
        operation: 'insert',
        fn: 'bulk_lesson_activity_result_sp',
        params: {
          a_y_id_sp:    Number(filterAcademic) || 0,
          cl_id_sp:     Number(filterClass)    || 0,
          b_id_sp:      Number(filterBatch)    || 0,
          ex_reg_id_sp: Number(filterExam)     || 0,
        },
      });
      swalSuccess('Records updated');
      const rows = await fetchRows();
      setTableData(rows);
      setTableLoaded(true);
    } catch (e) {
      swalError(e?.message || 'Update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  /* ── Add ── */
  const handleAddNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAddOpen(true);
  };

  /* ── Edit ── */
  const openEditModal = useCallback(async (row) => {
    setEditingId(row.lar_id);
    try {
      const res = await fetchDataPaginated({ queryName: 'LessonActivityResultRow', page: 1, limit: 1, search: '', lar_id: row.lar_id });
      const r = (res?.data ?? [])[0];
      if (!r) { swalError('Could not load row'); return; }
      setForm({
        ac_t_id:       String(r.ac_t_id        ?? ''),
        std_cl_id:     String(r.std_cl_id      ?? ''),
        marks_obtained: String(r.marks_obtained ?? ''),
        state:         String(r.state          ?? 'Active'),
      });
      setAddOpen(true);
    } catch (e) {
      swalError(e?.message || 'Could not load row');
    }
  }, []);

  /* ── Delete ── */
  const handleDelete = useCallback(async (row) => {
    if (!row.lar_id || row.lar_id === 0) { swalError('No saved result to delete for this student'); return; }
    const ok = await swalConfirm({ title: 'Delete this result?' });
    if (!ok) return;
    try {
      await crud({
        operation: 'delete',
        fn: 'lesson_activity_result_sp',
        params: { lar_id_sp: Number(row.lar_id), ac_t_id_sp: 0, std_cl_id_sp: 0, marks_sp: 0, state_sp: '' },
      });
      setTableData((prev) => prev.map((r) => r.lar_id === row.lar_id
        ? { ...r, lar_id: 0, marks_obtained: 0, state: 'Pending' } : r));
      swalSuccess('Deleted');
    } catch (e) {
      swalError(e?.message || 'Delete failed');
    }
  }, []);

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.ac_t_id || !form.std_cl_id) { swalError('Activity and Student are required'); return; }
    setSaving(true);
    try {
      const isEdit = editingId != null && editingId !== 0;
      await crud({
        operation: isEdit ? 'update' : 'insert',
        fn: 'lesson_activity_result_sp',
        params: {
          lar_id_sp:    isEdit ? Number(editingId) : 0,
          ac_t_id_sp:   Number(form.ac_t_id)        || 0,
          std_cl_id_sp: Number(form.std_cl_id)      || 0,
          marks_sp:     Number(form.marks_obtained)  || 0,
          state_sp:     form.state                   || 'Active',
        },
      });
      swalSuccess(isEdit ? 'Updated' : 'Added');
      setAddOpen(false);
      const rows = await fetchRows();
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

  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setSelectField = (k, lk) => (e) => setForm((p) => ({ ...p, [k]: e.target.value, [lk]: e.target.label || '' }));

  const filterFields = [
    { label: 'Academic Year', node: <Select2 name="fa" value={filterAcademic} selectedLabel={filterAcademicLabel} onChange={(e) => { setFilterAcademic(e.target.value); setFilterAcademicLabel(e.target.label || ''); }} loadOptions={academicLoader} placeholder="Select Year" /> },
    { label: 'Class',         node: <Select2 name="fc" value={filterClass}    selectedLabel={filterClassLabel}    onChange={(e) => { setFilterClass(e.target.value); setFilterClassLabel(e.target.label || ''); }} loadOptions={classLoader}    placeholder="Select Class" /> },
    { label: 'Batch',         node: <Select2 name="fb" value={filterBatch}    selectedLabel={filterBatchLabel}    onChange={(e) => { setFilterBatch(e.target.value); setFilterBatchLabel(e.target.label || ''); }} loadOptions={batchLoader}    placeholder="Select Batch" /> },
    { label: 'Subject',       node: <Select2 key={`fs-${filterClass}-${filterAcademic}`} name="fs" value={filterSubject}  selectedLabel={filterSubjectLabel} onChange={(e) => { setFilterSubject(e.target.value); setFilterSubjectLabel(e.target.label || ''); }} loadOptions={subjectLoader} isDisabled={!filterClass || !filterAcademic} placeholder={filterClass && filterAcademic ? 'Select Subject' : 'Select Class & Year first'} /> },
    { label: 'Activity Type', node: <Select2 name="ft" value={filterActivityType} selectedLabel={filterActivityTypeLabel} onChange={(e) => { setFilterActivityType(e.target.value); setFilterActivityTypeLabel(e.target.label || ''); }} loadOptions={activityTypeLoader} placeholder="Select Type" /> },
    { label: 'Exam',          node: <Select2 name="fe" value={filterExam}     selectedLabel={filterExamLabel}     onChange={(e) => { setFilterExam(e.target.value); setFilterExamLabel(e.target.label || ''); }} loadOptions={examLoader} placeholder="Select Exam" /> },
    { label: 'Date',          node: <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full px-3 py-[7px] rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500" /> },
  ];

  return (
    <div className="space-y-4">
      {/* ── Filters card ── */}
      <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900/40 border-b border-slate-200/70 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filters</h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3.5">
          {filterFields.map(({ label, node }) => (
            <div key={label}>
              <label className={LABEL_CLS}>{label}</label>
              {node}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="primary" leftIcon={<Eye className="w-4 h-4" />} onClick={handleShow} disabled={!filterAcademic || !filterClass || loadingTable}>
            {loadingTable ? 'Loading…' : 'Show'}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddNew}>
            Add New
          </Button>
          <Button size="sm" variant="primary" leftIcon={<RefreshCw className={`w-4 h-4 ${bulkLoading ? 'animate-spin' : ''}`} />} onClick={handleUpdateExam} disabled={bulkLoading}>
            {bulkLoading ? 'Updating…' : 'Update Exam Activity'}
          </Button>
        </div>
      </div>

      {/* ── Empty states ── */}
      {!tableLoaded && (
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/40 py-12">
          <EmptyState title="Wax xog ah lama soo bandhigin" description="Dooro Academic Year iyo Class, kadibna riix Show." />
        </div>
      )}
      {tableLoaded && tableData.length === 0 && (
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/40 py-12">
          <EmptyState title="Wax xog ah ma jiraan" description="Riix 'Update Exam Activity' si loogu sameeyo diiwaannada students-ka." />
        </div>
      )}

      {/* ── DataTable ── */}
      {tableLoaded && tableData.length > 0 && (
        <DataTableCard
          title="Lesson Activity Results"
          columns={RESULT_COLUMNS}
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Result' : 'Add Result'}
              </h3>
              <button onClick={() => setAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-4">
              {/* Activity */}
              <div className="col-span-2">
                <label className={LABEL_CLS}>Lesson Activity *</label>
                <Select2
                  key={`act-${filterClass}-${filterAcademic}`}
                  name="ac_t_id"
                  value={form.ac_t_id}
                  selectedLabel={form.ac_t_label}
                  onChange={setSelectField('ac_t_id', 'ac_t_label')}
                  loadOptions={activityLoader}
                  placeholder="Select Activity"
                />
              </div>
              {/* Student */}
              <div className="col-span-2">
                <label className={LABEL_CLS}>Student *</label>
                <Select2
                  key={`stu-${filterAcademic}-${filterClass}-${filterBatch}`}
                  name="std_cl_id"
                  value={form.std_cl_id}
                  selectedLabel={form.std_cl_label}
                  onChange={setSelectField('std_cl_id', 'std_cl_label')}
                  loadOptions={studentClassLoader}
                  placeholder="Select Student"
                />
              </div>
              {/* Marks */}
              <div>
                <label className={LABEL_CLS}>Marks Obtained</label>
                <input type="number" value={form.marks_obtained} onChange={setField('marks_obtained')} className={INPUT_CLS} placeholder="0" />
              </div>
              {/* State */}
              <div>
                <label className={LABEL_CLS}>State</label>
                <select value={form.state} onChange={setField('state')} className={INPUT_CLS}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
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

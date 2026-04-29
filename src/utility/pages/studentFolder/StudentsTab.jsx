import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Plus, Database, Image, Users, Mail, FileSpreadsheet, RefreshCw } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import ActionButton from '../../../components/ui/ActionButton';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated, fetchSelectOptions, makeOptionLoader } from '../../../services/api';
import { swalError, swalSuccess } from '../../../utils/swal';
import { CRUD_CONFIG, getSessionBrId } from '../../../config/crudConfig';
import CrudModal from '../../../modals/CrudModal';
import StudentImagesPanel from './StudentImagesPanel';
import StudentResponsiblesPanel from './StudentResponsiblesPanel';
import StudentEmisPanel from './StudentEmisPanel';

export default function StudentsTab() {
  const { t } = useTranslation();
  const RESULT_COLUMNS = useMemo(() => ([
    { key: 'std_id',           label: t('students.cols.id') },
    { key: 'id_card',          label: t('students.cols.idCard') },
    { key: 'student_name',     label: t('students.cols.student') },
    { key: 'phone',            label: t('students.cols.phone') },
    { key: 'sex',              label: t('students.cols.sex') },
    { key: 'district',         label: t('students.cols.district') },
    { key: 'responsible_name', label: t('students.cols.responsible') },
    { key: 'type',             label: t('students.cols.type') },
    { key: 'm_phone',          label: t('students.cols.mPhone') },
    { key: 'relation',         label: t('students.cols.relation') },
    { key: 'discount',         label: t('students.cols.discount') },
    { key: 'reg_date',         label: t('students.cols.regDate') },
    { key: 'username',         label: t('students.cols.user') },
  ]), [t]);

  const NO_DATA_ROW = useMemo(
    () => [{ id: '__no_data__', student_name: t('students.notFound') }],
    [t]
  );
  const [filterClass, setFilterClass] = useState('');
  const [filterClassLabel, setFilterClassLabel] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterBatchLabel, setFilterBatchLabel] = useState('');
  const [filterAcademic, setFilterAcademic] = useState('');
  const [filterAcademicLabel, setFilterAcademicLabel] = useState('');

  const [tableData, setTableData] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Lazy loaders (server-side: 25 default + search beyond).
  const classLoader    = useMemo(() => makeOptionLoader('class_options'), []);
  // Batch loader is class-aware: when filterClass set, returns only batches present in that class for active academic year.
  const batchLoader    = useMemo(
    () => makeOptionLoader('batch_options', () => ({ cl_id: filterClass })),
    [filterClass]
  );
  const academicLoader = useMemo(() => makeOptionLoader('academic_options'), []);

  const fetchRows = useCallback(async () => {
    const res = await fetchDataPaginated({
      queryName: 'Students',
      page: 1,
      limit: 500,
      search: '',
      ...(filterClass    && { cl_id: filterClass }),
      ...(filterBatch    && { b_id: filterBatch }),
      ...(filterAcademic && { a_y_id: filterAcademic }),
    });
    return res?.data ?? [];
  }, [filterClass, filterBatch, filterAcademic]);

  const handleShowData = async () => {
    if (!filterClass || !filterBatch || !filterAcademic) {
      swalError(t('students.errFiltersRequired'));
      return;
    }
    setViewMode('students');
    setLoadingTable(true);
    try {
      const rows = await fetchRows();
      const mapped = rows.map((r, i) => ({
        id: r.std_id ?? i,
        ...r,
      }));
      setTableData(mapped);
      setTableLoaded(true);
      setCurrentPage(1);
    } catch (e) {
      swalError(e?.message || t('swal.titles.error'));
    } finally {
      setLoadingTable(false);
    }
  };

  const placeholder = (label) => () => swalSuccess(label, t('students.featureInProgress'));

  const handleStudentClassUpdate = placeholder(t('students.classUpdateLabel'));

  // ----- Student registration modal (StudentRegister CRUD config) -----
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerMode, setRegisterMode] = useState('insert');
  const [registerInitial, setRegisterInitial] = useState({});
  const registerConfig = CRUD_CONFIG['StudentRegister'];

  const handleAddNew = async () => {
    // Academic Year + Batch are hidden in the form — supply them now.
    // Prefer the toolbar filter; fall back to the active academic year from the DB.
    let academicId = filterAcademic ? String(filterAcademic) : '';
    if (!academicId) {
      try {
        const res = await fetchSelectOptions('academic_options', 25);
        const rows = res?.data || [];
        const active = rows.find((r) => String(r.state || '').toLowerCase() === 'active') || rows[0];
        if (active?.a_y_id != null) academicId = String(active.a_y_id);
      } catch { /* fall through — guard below shows error */ }
    }
    if (!academicId) {
      swalError(t('students.errAcademicYearMissing'));
      return;
    }
    const preset = {
      a_y_id_sp: academicId,
      ...(filterClass       && { cl_id_sp: String(filterClass) }),
      ...(filterClassLabel  && { cl_id_sp_label: filterClassLabel }),
      ...(filterBatch       && { b_id_sp: String(filterBatch) }),
    };
    setRegisterInitial(preset);
    setRegisterMode('insert');
    setRegisterOpen(true);
  };
  const handleRegisterSuccess = async () => {
    if (filterClass && filterBatch && filterAcademic) {
      try {
        const rows = await fetchRows();
        setTableData(rows.map((r, i) => ({ id: r.std_id ?? i, ...r })));
      } catch { /* ignore: filter still informs UI */ }
    }
  };
  // 'students' (default table) | 'images' (image upload panel) | 'responsibles' (edit panel) | 'emis' (id-card edit panel)
  const [viewMode, setViewMode] = useState('students');
  const handleAddImage = () => {
    if (!filterClass || !filterBatch || !filterAcademic) {
      swalError(t('students.errFiltersRequired'));
      return;
    }
    setViewMode('images');
  };
  const handleEditAllResponsibles = () => {
    if (!filterClass || !filterAcademic) {
      swalError(t('students.errFiltersRequired'));
      return;
    }
    setViewMode('responsibles');
  };
  const handleEditAllEmis = () => {
    if (!filterClass || !filterAcademic) {
      swalError(t('students.errFiltersRequired'));
      return;
    }
    setViewMode('emis');
  };
  const handleImportExcel = placeholder(t('students.importExcelLabel'));

  const handleView = useCallback((row) => {
    if (row.id === '__no_data__') return;
    swalSuccess(t('action.view'), String(row.student_name ?? ''));
  }, [t]);

  const handleEdit = useCallback((row) => {
    if (row.id === '__no_data__') return;
    swalSuccess(t('action.edit'), String(row.student_name ?? ''));
  }, [t]);

  const filteredRows = useMemo(() => {
    const list = tableLoaded && tableData.length === 0 ? NO_DATA_ROW : tableData;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    const keys = RESULT_COLUMNS.map((c) => c.key);
    return list.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [tableData, tableLoaded, searchQuery, NO_DATA_ROW, RESULT_COLUMNS]);

  const totalRows = filteredRows.length;
  const pagedRows = useMemo(() => {
    const s = (currentPage - 1) * pageSize;
    return filteredRows.slice(s, s + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const renderActions = useCallback((row) => (
    <div className="flex justify-center gap-1">
      <ActionButton variant="success" aria-label="View" onClick={() => handleView(row)}>
        <Eye className="w-4 h-4" />
      </ActionButton>
      <ActionButton variant="edit" aria-label="Edit" onClick={() => handleEdit(row)}>
        <Pencil className="w-4 h-4" />
      </ActionButton>
    </div>
  ), [handleView, handleEdit]);

  const compactSelectStyle = { control: (base) => ({ ...base, minHeight: '38px', height: '38px', fontSize: '13px', borderRadius: '10px' }), valueContainer: (base) => ({ ...base, padding: '0 10px' }), indicatorsContainer: (base) => ({ ...base, height: '38px' }), input: (base) => ({ ...base, margin: 0, padding: 0 }) };
  const compactBtn = 'px-3 py-2 text-sm rounded-lg gap-2';
  const filterToolbar = (
    <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-900/40 shadow-sm px-3 py-2.5 flex flex-nowrap items-center gap-2.5 overflow-x-auto">
      <div className="w-40 shrink-0">
        <Select2
          name="filterClass"
          value={filterClass}
          selectedLabel={filterClassLabel}
          onChange={(e) => {
            setFilterClass(e.target.value);
            setFilterClassLabel(e.target.label || '');
            // Class beddelay → tirtir batch (in la sii dooro batch sax ah ee class-ka cusub).
            setFilterBatch('');
            setFilterBatchLabel('');
          }}
          loadOptions={classLoader}
          placeholder={t('students.cols.class')}
          isClearable={false}
          styles={compactSelectStyle}
        />
      </div>
      <div className="w-36 shrink-0">
        <Select2
          key={`fb-${filterClass}`}
          name="filterBatch"
          value={filterBatch}
          selectedLabel={filterBatchLabel}
          onChange={(e) => { setFilterBatch(e.target.value); setFilterBatchLabel(e.target.label || ''); }}
          loadOptions={batchLoader}
          isDisabled={!filterClass}
          placeholder={t('students.cols.batch')}
          isClearable={false}
          styles={compactSelectStyle}
        />
      </div>
      <div className="w-40 shrink-0">
        <Select2
          name="filterAcademic"
          value={filterAcademic}
          selectedLabel={filterAcademicLabel}
          onChange={(e) => { setFilterAcademic(e.target.value); setFilterAcademicLabel(e.target.label || ''); }}
          loadOptions={academicLoader}
          placeholder={t('lessonActivityResults.filters.academicYear')}
          isClearable={false}
          styles={compactSelectStyle}
        />
      </div>

      <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShowData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
        {loadingTable ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('action.show')}
      </Button>

      <span className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" aria-hidden />

      <Button size="sm" variant="primary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={handleStudentClassUpdate} className={`${compactBtn} shrink-0`}>
        {t('students.classUpdate')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddNew} className={`${compactBtn} shrink-0`}>
        {t('students.addNew')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Image className="w-4 h-4" />} onClick={handleAddImage} className={`${compactBtn} shrink-0`}>
        {t('students.image')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Users className="w-4 h-4" />} onClick={handleEditAllResponsibles} className={`${compactBtn} shrink-0`}>
        {t('students.responsibles')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Mail className="w-4 h-4" />} onClick={handleEditAllEmis} className={`${compactBtn} shrink-0`}>
        {t('students.emis')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<FileSpreadsheet className="w-4 h-4" />} onClick={handleImportExcel} className={`${compactBtn} shrink-0`}>
        {t('students.importExcel')}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {filterToolbar}
      {viewMode === 'images' ? (
        <StudentImagesPanel
          cl_id={filterClass}
          b_id={filterBatch}
          a_y_id={filterAcademic}
          onClose={() => setViewMode('students')}
        />
      ) : viewMode === 'responsibles' ? (
        <StudentResponsiblesPanel
          cl_id={filterClass}
          b_id={filterBatch}
          a_y_id={filterAcademic}
          br_id={Number(getSessionBrId()) || 0}
          onClose={() => setViewMode('students')}
        />
      ) : viewMode === 'emis' ? (
        <StudentEmisPanel
          cl_id={filterClass}
          b_id={filterBatch}
          a_y_id={filterAcademic}
          br_id={Number(getSessionBrId()) || 0}
          onClose={() => setViewMode('students')}
        />
      ) : (
        <>
        <CrudModal
          isOpen={registerOpen}
          onClose={() => setRegisterOpen(false)}
          config={registerConfig}
          initialForm={registerInitial}
          mode={registerMode}
          onSuccess={handleRegisterSuccess}
          moduleKey="StudentRegister"
        />
        <DataTableCard
          showDataPanel={tableLoaded}
          searchPlaceholder={t('common.search')}
          searchValue={searchQuery}
          onSearchChange={(e) => { setSearchQuery(e?.target?.value ?? ''); setCurrentPage(1); }}
          onSearchSubmit={() => {}}
          columns={RESULT_COLUMNS}
          data={pagedRows}
          isLoading={loadingTable}
          renderActions={renderActions}
          emptyTitleClickToLoad={t('empty.notLoaded')}
          emptyDescClickToLoad={t('empty.showDataHint')}
          total={totalRows}
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalRows / pageSize))}
          itemsPerPage={pageSize}
          onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage((p) => Math.min(Math.max(1, Math.ceil(totalRows / pageSize)), p + 1))}
          onPageClick={(p) => setCurrentPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
        />
        </>
      )}
    </div>
  );
}

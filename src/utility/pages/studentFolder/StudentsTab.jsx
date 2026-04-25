import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Database, Image, Users, Mail, FileSpreadsheet, RefreshCw } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import ActionButton from '../../../components/ui/ActionButton';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated, fetchSelectOptions } from '../../../services/api';
import { swalError, swalSuccess } from '../../../utils/swal';

const RESULT_COLUMNS = [
  { key: 'student_name',  label: 'Student' },
  { key: 'emis_id',       label: 'EMIS' },
  { key: 'id_card',       label: 'ID Card' },
  { key: 'sex',           label: 'Sex' },
  { key: 'tel',           label: 'Phone' },
  { key: 'class_name',    label: 'Class' },
  { key: 'batch_name',    label: 'Batch' },
  { key: 'mothername',    label: 'Mother' },
  { key: 'mother_phone',  label: 'Mother Phone' },
  { key: 'reg_date',      label: 'Reg Date' },
  { key: 'state',         label: 'State' },
];

const NO_DATA_ROW = [{ id: '__no_data__', student_name: 'This Information Was Not Found!' }];

export default function StudentsTab() {
  const [classOptions, setClassOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [academicOptions, setAcademicOptions] = useState([]);

  const [filterClass, setFilterClass] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterAcademic, setFilterAcademic] = useState('');

  const [tableData, setTableData] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;
    const pair = (rows, vKey, lKey) =>
      rows.map((r) => ({ value: String(r[vKey] ?? ''), label: String(r[lKey] ?? r[vKey] ?? '') }));

    Promise.allSettled([
      fetchSelectOptions('class_options', 500, ''),
      fetchSelectOptions('batch_options', 200, ''),
      fetchSelectOptions('academic_options', 200, ''),
    ]).then(([clRes, bRes, acRes]) => {
      if (cancelled) return;
      const rows = (r) => (r.status === 'fulfilled' ? (r.value?.data ?? r.value?.rows ?? []) : []);
      setClassOptions(pair(rows(clRes), 'cl_id', 'class'));
      setBatchOptions(pair(rows(bRes), 'b_id', 'batch_name'));
      setAcademicOptions(pair(rows(acRes), 'a_y_id', 'academic_name'));
    });

    return () => { cancelled = true; };
  }, []);

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
      swalError('Class, Batch iyo Academic Year waa lagama maarmaan');
      return;
    }
    setLoadingTable(true);
    try {
      const rows = await fetchRows();
      const mapped = rows.map((r, i) => ({
        id: r.std_cl_id ?? r.std_id ?? i,
        ...r,
      }));
      setTableData(mapped);
      setTableLoaded(true);
      setCurrentPage(1);
    } catch (e) {
      swalError(e?.message || 'Khalad ayaa dhacay');
    } finally {
      setLoadingTable(false);
    }
  };

  const placeholder = (label) => () => swalSuccess(label, 'Feature horumar ayaa loogu jiraa');

  const handleStudentClassUpdate = placeholder('Student Class Update');
  const handleAddNew = placeholder('Add New');
  const handleAddImage = placeholder('Add Image');
  const handleEditAllResponsibles = placeholder('Edit All Responsibles');
  const handleEditAllEmis = placeholder('Edit All EMIS');
  const handleImportExcel = placeholder('Import Excel');

  const handleView = useCallback((row) => {
    if (row.id === '__no_data__') return;
    swalSuccess('View', String(row.student_name ?? ''));
  }, []);

  const handleEdit = useCallback((row) => {
    if (row.id === '__no_data__') return;
    swalSuccess('Edit', String(row.student_name ?? ''));
  }, []);

  const filteredRows = useMemo(() => {
    const list = tableLoaded && tableData.length === 0 ? NO_DATA_ROW : tableData;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    const keys = RESULT_COLUMNS.map((c) => c.key);
    return list.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [tableData, tableLoaded, searchQuery]);

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
          onChange={(e) => setFilterClass(e.target.value)}
          options={classOptions}
          placeholder="Class"
          isClearable={false}
          styles={compactSelectStyle}
        />
      </div>
      <div className="w-36 shrink-0">
        <Select2
          name="filterBatch"
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          options={batchOptions}
          placeholder="Batch"
          isClearable={false}
          styles={compactSelectStyle}
        />
      </div>
      <div className="w-40 shrink-0">
        <Select2
          name="filterAcademic"
          value={filterAcademic}
          onChange={(e) => setFilterAcademic(e.target.value)}
          options={academicOptions}
          placeholder="Academic Year"
          isClearable={false}
          styles={compactSelectStyle}
        />
      </div>

      <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShowData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
        {loadingTable ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Show'}
      </Button>

      <span className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" aria-hidden />

      <Button size="sm" variant="primary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={handleStudentClassUpdate} className={`${compactBtn} shrink-0`}>
        Class Update
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddNew} className={`${compactBtn} shrink-0`}>
        Add New
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Image className="w-4 h-4" />} onClick={handleAddImage} className={`${compactBtn} shrink-0`}>
        Image
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Users className="w-4 h-4" />} onClick={handleEditAllResponsibles} className={`${compactBtn} shrink-0`}>
        Responsibles
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Mail className="w-4 h-4" />} onClick={handleEditAllEmis} className={`${compactBtn} shrink-0`}>
        EMIS
      </Button>
      <Button size="sm" variant="primary" leftIcon={<FileSpreadsheet className="w-4 h-4" />} onClick={handleImportExcel} className={`${compactBtn} shrink-0`}>
        Import Excel
      </Button>
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
        columns={RESULT_COLUMNS}
        data={pagedRows}
        isLoading={loadingTable}
        renderActions={renderActions}
        emptyTitleClickToLoad="Wax xog ah lama soo bandhigin"
        emptyDescClickToLoad="Dooro Class iyo Academic Year, kadibna riix SHOW DATA."
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Database, Copy, RefreshCw } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import ActionButton from '../../../components/ui/ActionButton';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated, fetchSelectOptions } from '../../../services/api';
import { swalError, swalSuccess } from '../../../utils/swal';

const INFO_COLUMNS = [
  { key: 'student_name', label: 'Student' },
  { key: 'emis_id',      label: 'EMIS' },
  { key: 'id_card',      label: 'ID Card' },
  { key: 'sex',          label: 'Sex' },
  { key: 'tel',          label: 'Phone' },
  { key: 'dob',          label: 'DOB' },
  { key: 'mothername',   label: 'Mother' },
  { key: 'mother_phone', label: 'Mother Phone' },
  { key: 'state',        label: 'State' },
];

const DUP_COLUMNS = [
  { key: 'student_name', label: 'Student' },
  { key: 'emis_id',      label: 'EMIS' },
  { key: 'id_card',      label: 'ID Card' },
  { key: 'sex',          label: 'Sex' },
  { key: 'tel',          label: 'Phone' },
  { key: 'dup_count',    label: 'Duplicates' },
];

const NO_DATA_ROW = [{ id: '__no_data__', student_name: 'This Information Was Not Found!' }];

export default function StudentInfoTab() {
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  const [tableData, setTableData] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [viewMode, setViewMode] = useState('info'); // 'info' | 'duplicates'

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;
    fetchSelectOptions('all_students_options', 1000, '')
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data ?? res?.rows ?? [];
        setStudentOptions(rows.map((r) => ({ value: String(r.std_id ?? ''), label: String(r.p_name ?? '') })));
      })
      .catch(() => setStudentOptions([]));
    return () => { cancelled = true; };
  }, []);

  const handleShowData = async () => {
    if (!selectedStudent) {
      swalError('Fadlan dooro Student');
      return;
    }
    setLoadingTable(true);
    setViewMode('info');
    try {
      const res = await fetchDataPaginated({
        queryName: 'Studentinfo',
        page: 1,
        limit: 100,
        search: '',
        std_id: selectedStudent,
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

  const handleView = useCallback((row) => {
    if (row.id === '__no_data__') return;
    swalSuccess('View', String(row.student_name ?? ''));
  }, []);

  const handleEdit = useCallback((row) => {
    if (row.id === '__no_data__') return;
    swalSuccess('Edit', String(row.student_name ?? ''));
  }, []);

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
      <div className="w-72 shrink-0">
        <Select2
          name="filterStudent"
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          options={studentOptions}
          placeholder="Select Student"
          isClearable={false}
          styles={compactSelectStyle}
        />
      </div>
      <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShowData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
        {loadingTable && viewMode === 'info' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Show Data'}
      </Button>
      <span className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" aria-hidden />
      <Button size="sm" variant="primary" leftIcon={<Copy className="w-4 h-4" />} onClick={handleShowDuplicateData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
        {loadingTable && viewMode === 'duplicates' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Show Duplicate Data'}
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
        columns={activeColumns}
        data={pagedRows}
        isLoading={loadingTable}
        renderActions={renderActions}
        emptyTitleClickToLoad="Wax xog ah lama soo bandhigin"
        emptyDescClickToLoad="Dooro Student kadibna riix Show Data, ama riix Show Duplicate Data."
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

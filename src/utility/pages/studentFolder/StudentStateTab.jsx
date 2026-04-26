import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Eye, Pencil, Database, RefreshCw, Plus, GitMerge } from 'lucide-react';
import Button from '../../../components/ui/Button';
import ActionButton from '../../../components/ui/ActionButton';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated } from '../../../services/api';
import { swalError, swalSuccess } from '../../../utils/swal';
import StudentStateModal from '../../../modals/StudentStateModal';

const STATE_COLUMNS = [
  { key: 'id',       label: 'ID' },
  { key: 'student',  label: 'Student' },
  { key: 'state',    label: 'State' },
  { key: 'reg_date', label: 'Date' },
  { key: 'username', label: 'User' },
];

const NO_DATA_ROW = [{ id: '__no_data__', student: 'This Information Was Not Found!' }];

export default function StudentStateTab() {
  const sessionUser = useSelector((state) => state.ui.user);
  const sessionBrId = sessionUser?.br_id != null ? String(sessionUser.br_id) : '';

  const [tableData, setTableData] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleShowData = async () => {
    if (!sessionBrId) {
      swalError('Branch lagama helin session-ka — fadlan dib u login');
      return;
    }
    setLoadingTable(true);
    try {
      const res = await fetchDataPaginated({
        queryName: 'studentstate',
        page: 1,
        limit: 1000,
        search: '',
        br_id: sessionBrId,
      });
      // eslint-disable-next-line no-console
      console.log('[StudentState] br_id:', sessionBrId, 'response:', res);
      const rows = res?.data ?? [];
      setTableData(rows.map((r, i) => ({ id: r.id ?? i, ...r })));
      setTableLoaded(true);
      setCurrentPage(1);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[StudentState] error:', e);
      swalError(e?.message || 'Khalad ayaa dhacay');
    } finally {
      setLoadingTable(false);
    }
  };

  const placeholder = (label) => () => swalSuccess(label, 'Feature horumar ayaa loogu jiraa');
  const handleMergeStudent = placeholder('Merge Student');
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const handleAddNew = () => setStateModalOpen(true);

  const handleView = useCallback((row) => {
    if (row.id === '__no_data__') return;
    swalSuccess('View', String(row.student ?? ''));
  }, []);

  const handleEdit = useCallback((row) => {
    if (row.id === '__no_data__') return;
    swalSuccess('Edit', String(row.student ?? ''));
  }, []);

  const filteredRows = useMemo(() => {
    const list = tableLoaded && tableData.length === 0 ? NO_DATA_ROW : tableData;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    const keys = STATE_COLUMNS.map((c) => c.key);
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

  const compactBtn = 'px-3 py-2 text-sm rounded-lg gap-2';

  const filterToolbar = (
    <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-900/40 shadow-sm px-3 py-2.5 flex flex-nowrap items-center gap-2.5 overflow-x-auto">
      <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShowData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
        {loadingTable ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Show Data'}
      </Button>
      <span className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" aria-hidden />
      <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddNew} className={`${compactBtn} shrink-0`}>
        Add New
      </Button>
      <Button size="sm" variant="primary" leftIcon={<GitMerge className="w-4 h-4" />} onClick={handleMergeStudent} className={`${compactBtn} shrink-0`}>
        Merge Student
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
        columns={STATE_COLUMNS}
        data={pagedRows}
        isLoading={loadingTable}
        renderActions={renderActions}
        emptyTitleClickToLoad="Wax xog ah lama soo bandhigin"
        emptyDescClickToLoad="Riix Show Data si aad u aragto Student State."
        total={totalRows}
        currentPage={currentPage}
        totalPages={Math.max(1, Math.ceil(totalRows / pageSize))}
        itemsPerPage={pageSize}
        onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(Math.max(1, Math.ceil(totalRows / pageSize)), p + 1))}
        onPageClick={(p) => setCurrentPage(p)}
        onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
      />
      <StudentStateModal
        isOpen={stateModalOpen}
        onClose={() => setStateModalOpen(false)}
        onSuccess={() => {
          setStateModalOpen(false);
          if (tableLoaded) handleShowData();
        }}
      />
    </div>
  );
}

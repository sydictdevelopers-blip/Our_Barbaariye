import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Copy, RefreshCw, User, Filter } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalError } from '../../../utils/swal';

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

  const INFO_COLUMNS = [
    { key: 'id',            label: 'ID' },
    { key: 'student',       label: t('studentInfo.student') },
    { key: 'class',         label: t('studentInfo.class') },
    { key: 'academic_name', label: t('studentInfo.academicYear') },
    { key: 'state',         label: t('studentInfo.state') },
    { key: 'charges',       label: t('studentInfo.charges') },
    { key: 'attendances',   label: t('studentInfo.attendances') },
    { key: 'results',       label: t('studentInfo.results') },
    { key: 'reg_date',      label: t('studentInfo.date') },
  ];

  const DUP_COLUMNS = [
    { key: 'student_name', label: t('studentInfo.student') },
    { key: 'emis_id',      label: 'EMIS' },
    { key: 'id_card',      label: 'ID Card' },
    { key: 'sex',          label: 'Sex' },
    { key: 'tel',          label: 'Phone' },
    { key: 'dup_count',    label: 'Duplicates' },
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
      <div className="p-4">
        <div>
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
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
        <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShowData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
          {loadingTable && viewMode === 'info' ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('studentInfo.showData')}
        </Button>
        <Button size="sm" variant="primary" leftIcon={<Copy className="w-4 h-4" />} onClick={handleShowDuplicateData} disabled={loadingTable} className={`${compactBtn} shrink-0`}>
          {loadingTable && viewMode === 'duplicates' ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('studentInfo.showDuplicate')}
        </Button>
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

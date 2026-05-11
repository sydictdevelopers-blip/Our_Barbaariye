import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Clock, GraduationCap, Eye } from 'lucide-react';
import Button from '../../../components/ui/Button';
import ActionButton from '../../../components/ui/ActionButton';
import Select2 from '../../../components/ui/Select2';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalError } from '../../../utils/swal';
import StudentAbsentDetailModal from '../../../modals/StudentAbsentDetailModal';

/**
 * StudentAbsentsTab — Student Absents tab.
 *
 * SHOW STUDENT ABSENTS → vw_student_absents(p_class_id) via queryName
 * 'StudentAbsents'. SP returns columns (id, student, phone, class_name,
 * no_of_absent, message). When the class has no absents the SP emits a single
 * message-row (id NULL + message set); we filter that row out and surface the
 * message in the empty state.
 */
export default function StudentAbsentsTab() {
  const { t } = useTranslation();
  const [classSel, setClassSel] = useState({ id: '', label: '' });
  const classLoader = useMemo(() => makeOptionLoader('absents_class_options'), []);

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Selected row for the detail modal — null when modal is closed.
  const [detailRow, setDetailRow] = useState(null);

  const handleShow = useCallback(async () => {
    if (!classSel.id) {
      swalError(t('studentAbsents.selectClassRequired', 'Please select a Class'), '');
      return;
    }
    setLoading(true);
    setEmptyMessage('');
    try {
      const res = await fetchDataPaginated({
        queryName: 'StudentAbsents',
        page: 1,
        limit: 1000,
        cl_id: classSel.id,
      });
      const data = res?.data ?? res?.rows ?? [];
      const allRows = [];
      const messages = [];
      data.forEach((row) => {
        if (row && (row.id == null || row.id === '') && row.message) {
          messages.push(row.message);
          return;
        }
        allRows.push(row);
      });

      // Hide the SP's `message` helper column from the user-facing table.
      const cleanedColumns = (res?.columns || []).filter(
        (c) => (c?.key || '').toLowerCase() !== 'message'
      );

      setRows(allRows);
      setColumns(cleanedColumns);
      if (allRows.length === 0) setEmptyMessage(messages[0] || '');
      setLoaded(true);
      setCurrentPage(1);
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed to load');
      setRows([]);
      setColumns([]);
      setEmptyMessage('');
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [classSel.id, t]);

  const filteredRows = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tableColumns = columns?.length
    ? columns
    : [{ key: 'message', label: t('common.message', 'Message') }];

  const renderRowActions = (row) => (
    <div className="flex justify-center gap-1">
      <ActionButton
        variant="success"
        aria-label={t('studentAbsents.viewAction', 'View')}
        onClick={() => setDetailRow(row)}
      >
        <Eye className="w-4 h-4" />
      </ActionButton>
    </div>
  );

  const labelCls =
    'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5';
  const labelIconCls = 'w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className={labelCls}>
              <GraduationCap className={labelIconCls} />
              <span>{t('studentAbsents.selectClass', 'Select Class')}</span>
            </label>
            <Select2
              name="class"
              value={classSel.id}
              selectedLabel={classSel.label}
              onChange={(e) => setClassSel({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={classLoader}
              placeholder={t('studentAbsents.selectClass', 'Select Class')}
              isClearable={false}
            />
          </div>
          <div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Clock className="w-4 h-4" />}
              onClick={handleShow}
            >
              {t('studentAbsents.showAbsents', 'Show Student Absents')}
            </Button>
          </div>
        </div>
      </div>

      <DataTableCard
        showDataPanel={loaded}
        searchPlaceholder={t('entity.search', 'Search')}
        searchValue={searchQuery}
        onSearchChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1);
        }}
        onSearchSubmit={() => {}}
        emptyTitleClickToLoad={t('studentAbsents.notLoaded', 'No data loaded')}
        emptyDescClickToLoad={t('studentAbsents.loadHint', 'Click Show Student Absents to load data')}
        emptyIconClickToLoad={Database}
        columns={tableColumns}
        data={pagedRows}
        isLoading={loading}
        emptyIcon={Database}
        emptyTitle={t('entity.notFound', 'Not Found')}
        emptyDescription={emptyMessage}
        hasActions={true}
        renderActions={renderRowActions}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={pageSize}
        onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onPageClick={(p) => setCurrentPage(p)}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setCurrentPage(1);
        }}
        rowKey="id"
      />

      <StudentAbsentDetailModal
        isOpen={!!detailRow}
        onClose={() => setDetailRow(null)}
        studentId={detailRow?.id}
        fallbackName={detailRow?.student || ''}
      />
    </div>
  );
}

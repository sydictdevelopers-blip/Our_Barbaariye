import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Plus, Trash2, RefreshCw, ArrowLeftRight, Copy, User, Layers, GraduationCap, Filter, FileText } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalError, swalConfirmAction } from '../../../utils/swal';

/**
 * AssignTeacherRoomTab — UI shell ee tab-ka "Assign Teacher Room".
 * Toolbar-ka kor wuxuu leeyahay laba dropdown:
 *   Select Teacher | Select Exam
 * iyo toban button oo laba safka oo kala ah:
 *   SHOW | SINGLE DELETE TEACHER | EXAM TEACHER DELETE | DELETE ALL TEACHERS
 *   GENERATE ALL | ADD BY SHIFT | ADD BY LEVEL | SINGLE TEACHER | ROOM EXCHANGE | COPY EXAM TO EXAM
 *
 * SHOW wuxuu wacaa SP `assign_teacher_room_show(emp_id, ex_id, br_id)`.
 * Buttons-ka kale waxay isticmaalaan SP-yo gaar ah (placeholder hadda).
 */
export default function AssignTeacherRoomTab() {
  const { t } = useTranslation();

  /* ── filter state ── */
  const [teacher, setTeacher] = useState({ id: '', label: '' });
  const [exam, setExam] = useState({ id: '', label: '' });

  const teacherLoader = useMemo(() => makeOptionLoader('teacher_options'), []);
  const examLoader = useMemo(() => makeOptionLoader('exam_options'), []);

  /* ── table state ── */
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleShow = useCallback(async () => {
    if (!teacher.id && !exam.id) {
      swalError(t('assignTeacherRoom.selectFilters', 'Fadlan dooro Teacher ama Exam'), '');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchDataPaginated({
        queryName: 'AssignTeacherRoom',
        page: 1,
        limit: 500,
        emp_id: teacher.id || 0,
        ex_id: exam.id || 0,
      });
      const data = res?.data ?? res?.rows ?? [];
      setRows(data);
      setColumns(res?.columns || []);
      setLoaded(true);
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed to load');
      setRows([]);
      setColumns([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [teacher.id, exam.id, t]);

  const notReady = (label) => () => {
    swalError(
      t('common.notReady', 'Function-ka diyaar uma ahan'),
      `${label} ${t('common.willBeImplemented', 'weli lama dhammaystirin.')}`
    );
  };

  const onSingleDeleteTeacher = () => {
    if (!teacher.id) {
      swalError(t('assignTeacherRoom.selectTeacher', 'Fadlan dooro Teacher'), '');
      return;
    }
    swalConfirmAction({
      title: t('common.confirmDeleteTitle', 'Hubi tirtirka'),
      text: t('assignTeacherRoom.confirmDeleteSingle', 'Tani waxay tirtirtaa kala-saaridda macallinka. Sii wad?'),
      confirmText: t('swal.buttons.yesDelete', 'Haa, tirtir'),
      confirmColor: '#dc2626',
      onConfirm: async () => ({ message: t('common.notReadyAction', 'SP weli lama dhammaystirin.') }),
    });
  };

  const onExamTeacherDelete = () => {
    if (!exam.id) {
      swalError(t('assignTeacherRoom.selectExam', 'Fadlan dooro Exam'), '');
      return;
    }
    swalConfirmAction({
      title: t('common.confirmDeleteTitle', 'Hubi tirtirka'),
      text: t('assignTeacherRoom.confirmDeleteExam', 'Tani waxay tirtirtaa dhammaan macallimiinta imtixaankaas. Sii wad?'),
      confirmText: t('swal.buttons.yesDelete', 'Haa, tirtir'),
      confirmColor: '#dc2626',
      onConfirm: async () => ({ message: t('common.notReadyAction', 'SP weli lama dhammaystirin.') }),
    });
  };

  const onDeleteAllTeachers = () => {
    swalConfirmAction({
      title: t('common.confirmDeleteTitle', 'Hubi tirtirka'),
      text: t('assignTeacherRoom.confirmDeleteAll', 'Tani waxay tirtirtaa DHAMMAAN kala-saaridaha macallimiinta. Sii wad?'),
      confirmText: t('swal.buttons.yesDelete', 'Haa, tirtir'),
      confirmColor: '#dc2626',
      onConfirm: async () => ({ message: t('common.notReadyAction', 'SP weli lama dhammaystirin.') }),
    });
  };

  /* ── client-side filter / paginate ── */
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

  return (
    <div className="space-y-4">
      {/* ── Filter card: header + grouped selects + actions row ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/40">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0B3C5D]/10 dark:bg-[#0B3C5D]/30 text-[#0B3C5D] dark:text-teal-300">
            <Filter className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('assignTeacherRoom.filtersTitle', { defaultValue: 'Filters' })}
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
              <User className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400" />
              <span>{t('select.teacher')}</span>
            </label>
            <Select2
              name="teacher"
              value={teacher.id}
              selectedLabel={teacher.label}
              onChange={(e) => setTeacher({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={teacherLoader}
              placeholder={t('select.teacher', 'Select Teacher')}
              isClearable
            />
          </div>
          <div>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400" />
              <span>{t('select.exam')}</span>
            </label>
            <Select2
              name="exam"
              value={exam.id}
              selectedLabel={exam.label}
              onChange={(e) => setExam({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={examLoader}
              placeholder={t('select.exam', 'Select Exam')}
              isClearable
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
          <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShow}>
            {t('entity.show', 'SHOW')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />} onClick={onSingleDeleteTeacher}>
            {t('assignTeacherRoom.singleDeleteTeacher', 'Single Delete Teacher')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />} onClick={onExamTeacherDelete}>
            {t('assignTeacherRoom.examTeacherDelete', 'Exam Teacher Delete')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />} onClick={onDeleteAllTeachers}>
            {t('assignTeacherRoom.deleteAllTeachers', 'Delete All')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.generateAll', 'Generate All'))}>
            {t('assignTeacherRoom.generateAll', 'Generate All')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.addByShift', 'Add By Shift'))}>
            {t('assignTeacherRoom.addByShift', 'Add By Shift')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Layers className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.addByLevel', 'Add By Level'))}>
            {t('assignTeacherRoom.addByLevel', 'Add By Level')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<User className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.singleTeacher', 'Single Teacher'))}>
            {t('assignTeacherRoom.singleTeacher', 'Single Teacher')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<ArrowLeftRight className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.roomExchange', 'Room Exchange'))}>
            {t('assignTeacherRoom.roomExchange', 'Room Exchange')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Copy className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.copyExamToExam', 'Copy Exam To Exam'))}>
            {t('assignTeacherRoom.copyExamToExam', 'Copy Exam To Exam')}
          </Button>
        </div>
      </div>

      <DataTableCard
      showDataPanel={loaded}
      searchPlaceholder={t('entity.search', 'Search')}
      searchValue={searchQuery}
      onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        onSearchSubmit={() => {}}
        emptyTitleClickToLoad={t('entity.noLoaded', 'No data loaded')}
        emptyDescClickToLoad={t('entity.loadHint', 'Click SHOW to load data')}
        emptyIconClickToLoad={GraduationCap}
        columns={tableColumns}
        data={pagedRows}
        isLoading={loading}
        emptyIcon={GraduationCap}
        emptyTitle={t('entity.notFound', 'Not Found')}
        emptyDescription=""
        hasActions={false}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={pageSize}
        onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onPageClick={(p) => setCurrentPage(p)}
        onPageSizeChange={(n) => { setPageSize(n); setCurrentPage(1); }}
        rowKey="id"
      />
    </div>
  );
}

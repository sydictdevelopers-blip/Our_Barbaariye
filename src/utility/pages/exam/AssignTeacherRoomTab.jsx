import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Plus, Trash2, RefreshCw, ArrowLeftRight, Copy, User, Layers, GraduationCap } from 'lucide-react';
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

  const headerActions = (
    <>
      <div className="min-w-[260px] flex-1">
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
      <div className="min-w-[200px] flex-1">
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
      <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShow}>
        {t('entity.show', 'SHOW')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />} onClick={onSingleDeleteTeacher}>
        {t('assignTeacherRoom.singleDeleteTeacher', 'SINGLE DELETE TEACHER')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />} onClick={onExamTeacherDelete}>
        {t('assignTeacherRoom.examTeacherDelete', 'EXAM TEACHER DELETE')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />} onClick={onDeleteAllTeachers}>
        {t('assignTeacherRoom.deleteAllTeachers', 'DELETE ALL TEACHERS')}
      </Button>
      <div className="basis-full" />
      <Button size="sm" variant="primary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.generateAll', 'Generate All'))}>
        {t('assignTeacherRoom.generateAll', 'GENERATE ALL')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.addByShift', 'Add By Shift'))}>
        {t('assignTeacherRoom.addByShift', 'ADD BY SHIFT')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Layers className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.addByLevel', 'Add By Level'))}>
        {t('assignTeacherRoom.addByLevel', 'ADD BY LEVEL')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<User className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.singleTeacher', 'Single Teacher'))}>
        {t('assignTeacherRoom.singleTeacher', 'SINGLE TEACHER')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<ArrowLeftRight className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.roomExchange', 'Room Exchange'))}>
        {t('assignTeacherRoom.roomExchange', 'ROOM EXCHANGE')}
      </Button>
      <Button size="sm" variant="primary" leftIcon={<Copy className="w-4 h-4" />} onClick={notReady(t('assignTeacherRoom.copyExamToExam', 'Copy Exam To Exam'))}>
        {t('assignTeacherRoom.copyExamToExam', 'COPY EXAM TO EXAM')}
      </Button>
    </>
  );

  return (
    <DataTableCard
      showDataPanel={loaded}
      searchPlaceholder={t('entity.search', 'Search')}
      searchValue={searchQuery}
      onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
      onSearchSubmit={() => {}}
      headerActions={headerActions}
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
  );
}

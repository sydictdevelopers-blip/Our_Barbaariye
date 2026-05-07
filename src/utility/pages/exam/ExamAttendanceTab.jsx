import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Plus, Trash2, Filter, CalendarDays, Building2, FileText, Sun, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DateInput from '../../../components/ui/DateInput';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalError, swalConfirmAction } from '../../../utils/swal';

/**
 * ExamAttendenceTab — UI shell ee tab-ka "Exam Attendence".
 * Toolbar-ka kor wuxuu kor ka leeyahay 5 dropdown:
 *   Academic Year, Room, Exam, Shift, Subject
 * iyo Date input. Buttons-ka hoos:
 *   ROOM ATTENDENCE DELETE | SHIFT ATTENDENCE DELETE | ACADEMIC ATTENDENCE DELETE
 *   SHOW ATTENDENCE | ADD ATTENDENCE
 *
 * SHOW ATTENDENCE wuxuu wacaa SP `exam_attendence_show(...)` (haddii diyaar yahay).
 * Buttons-ka tirtirka waxay isticmaalaan SP-yo gaar ah (hadda placeholder ah).
 */
export default function ExamAttendenceTab() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);

  /* ── filter state (id + label) ── */
  const [academic, setAcademic] = useState({ id: '', label: '' });
  const [room, setRoom] = useState({ id: '', label: '' });
  const [exam, setExam] = useState({ id: '', label: '' });
  const [shift, setShift] = useState({ id: '', label: '' });
  const [subject, setSubject] = useState({ id: '', label: '' });
  const [attendDate, setAttendDate] = useState(today);

  /* ── lazy loaders ── */
  const academicLoader = useMemo(() => makeOptionLoader('academic_options', null, { labelKey: 'academic_name', sortByActiveState: true }), []);
  const roomLoader = useMemo(() => makeOptionLoader('room_options', null, { labelKey: 'room_name' }), []);
  const examLoader = useMemo(() => makeOptionLoader('exam_options'), []);
  const shiftLoader = useMemo(() => makeOptionLoader('shift_options'), []);
  const subjectLoader = useMemo(() => makeOptionLoader('subject_options'), []);

  /* ── table state ── */
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const validateRequired = (need) => {
    if (need.academic && !academic.id) return t('entity.selectAcademic', 'Fadlan dooro Academic Year');
    if (need.room && !room.id) return t('examAttendence.selectRoom', 'Fadlan dooro Room');
    if (need.exam && !exam.id) return t('entity.selectExam', 'Fadlan dooro Exam');
    if (need.shift && !shift.id) return t('examAttendence.selectShift', 'Fadlan dooro Shift');
    if (need.subject && !subject.id) return t('entity.selectSubject', 'Fadlan dooro Subject');
    if (need.date && !attendDate) return t('examAttendence.selectDate', 'Fadlan dooro Date');
    return null;
  };

  const handleShow = useCallback(async () => {
    const err = validateRequired({ academic: true, exam: true, date: true });
    if (err) {
      swalError(err, '');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchDataPaginated({
        queryName: 'ExamAttendence',
        page: 1,
        limit: 500,
        academicYearId: academic.id,
        r_id: room.id || 0,
        ex_id: exam.id || 0,
        sh_id: shift.id || 0,
        sub_id: subject.id || 0,
        attend_date: attendDate,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academic.id, room.id, exam.id, shift.id, subject.id, attendDate]);

  const handleAddAttendence = () => {
    swalError(
      t('common.notReady', 'Function-ka diyaar uma ahan'),
      t('examAttendence.addNotReady', 'Add Attendence weli lama dhammaystirin.')
    );
  };

  const buildDeleteAction = (label, requirements) => () => {
    const err = validateRequired(requirements);
    if (err) {
      swalError(err, '');
      return;
    }
    swalConfirmAction({
      title: t('common.confirmDeleteTitle', 'Hubi tirtirka'),
      text: `${label} — ${t('examAttendence.confirmDelete', 'Tani waxay tirtirtaa imtixaanka attendence-ka. Sii wad?')}`,
      confirmText: t('swal.buttons.yesDelete', 'Haa, tirtir'),
      confirmColor: '#dc2626',
      onConfirm: async () => {
        return { message: t('common.notReadyAction', 'SP weli lama dhammaystirin.') };
      },
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

  const labelCls = "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5";
  const labelIconCls = "w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400";

  return (
    <div className="space-y-4">
      {/* ── Filter card: header + grouped selects + actions row ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}><CalendarDays className={labelIconCls} /><span>{t('select.academicYear')}</span></label>
            <Select2 name="academic" value={academic.id} selectedLabel={academic.label} onChange={(e) => setAcademic({ id: e.target.value, label: e.target.label || '' })} loadOptions={academicLoader} placeholder={t('select.academicYear')} isClearable={false} />
          </div>
          <div>
            <label className={labelCls}><Building2 className={labelIconCls} /><span>{t('select.room', 'Room')}</span></label>
            <Select2 name="room" value={room.id} selectedLabel={room.label} onChange={(e) => setRoom({ id: e.target.value, label: e.target.label || '' })} loadOptions={roomLoader} placeholder={t('select.room', 'Select Room')} isClearable />
          </div>
          <div>
            <label className={labelCls}><FileText className={labelIconCls} /><span>{t('select.exam')}</span></label>
            <Select2 name="exam" value={exam.id} selectedLabel={exam.label} onChange={(e) => setExam({ id: e.target.value, label: e.target.label || '' })} loadOptions={examLoader} placeholder={t('select.exam')} isClearable={false} />
          </div>
          <div>
            <label className={labelCls}><Sun className={labelIconCls} /><span>{t('select.shift', 'Shift')}</span></label>
            <Select2 name="shift" value={shift.id} selectedLabel={shift.label} onChange={(e) => setShift({ id: e.target.value, label: e.target.label || '' })} loadOptions={shiftLoader} placeholder={t('select.shift', 'Select Shift')} isClearable />
          </div>
          <div>
            <label className={labelCls}><BookOpen className={labelIconCls} /><span>{t('select.subject')}</span></label>
            <Select2 name="subject" value={subject.id} selectedLabel={subject.label} onChange={(e) => setSubject({ id: e.target.value, label: e.target.label || '' })} loadOptions={subjectLoader} placeholder={t('select.subject')} isClearable />
          </div>
          <div>
            <label className={labelCls}><CalendarIcon className={labelIconCls} /><span>{t('examAttendence.fields.date', 'Date')}</span></label>
            <DateInput
              value={attendDate}
              onChange={(e) => setAttendDate(e.target.value)}
              className="w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/20 focus:border-[#0f3d5e]"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
          <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={buildDeleteAction(t('examAttendence.roomAttendDelete', 'Room Attendence Delete'), { academic: true, room: true, exam: true, date: true })}>
            {t('examAttendence.roomAttendDelete', 'Room Attend Delete')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={buildDeleteAction(t('examAttendence.shiftAttendDelete', 'Shift Attendence Delete'), { academic: true, shift: true, exam: true, date: true })}>
            {t('examAttendence.shiftAttendDelete', 'Shift Attend Delete')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={buildDeleteAction(t('examAttendence.academicAttendDelete', 'Academic Attendence Delete'), { academic: true, exam: true, date: true })}>
            {t('examAttendence.academicAttendDelete', 'Academic Attend Delete')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShow}>
            {t('examAttendence.showAttendence', 'Show Attendence')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddAttendence}>
            {t('examAttendence.addAttendence', 'Add Attendence')}
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
        emptyDescClickToLoad={t('entity.loadHint', 'Click SHOW ATTENDENCE to load data')}
        emptyIconClickToLoad={Database}
        columns={tableColumns}
        data={pagedRows}
        isLoading={loading}
        emptyIcon={Database}
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

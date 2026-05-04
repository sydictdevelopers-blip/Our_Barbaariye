import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Plus, RefreshCw, Hash, ArrowRightLeft, ArrowLeftRight, Copy, Trash2, Layers, Grid3x3 } from 'lucide-react';
import Select2 from '../../../components/ui/Select2';
import DataTableCard from '../../../components/DataTableCard';
import { fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalError, swalConfirmAction } from '../../../utils/swal';
import { RoomByClassModal, ClassByRoomModal } from '../../../modals/AssignStudentRoomActionModals';
import AutoGenerateRoomModal from '../../../modals/AutoGenerateRoomModal';

/**
 * AssignStudentRoomTab — UI shell ee tab-ka "Assign Student Room".
 * Toolbar ka kor wuxuu leeyahay sagaal button: ROOM BY CLASS, CLASS BY ROOM,
 * SHOW, AUTO GENERATE, SERIAL NUMBER, ROOM TRANSFER, ROOM EXCHANGE,
 * COPY STUDENT ROOM, iyo REMOVE (oo casaan ah).
 *
 * Backend SP-yada (room_by_class_sp, class_by_room_sp, …) waa kuwa
 * laga sugayo si full functionality loo wado — UI-gu wuxuu hadda
 * shaqeeyaa SHOW button-ka oo soo qaada xogta marka SP-ga
 * `assign_student_room_show` la sameeyo.
 */
export default function AssignStudentRoomTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [roomByClassOpen, setRoomByClassOpen] = useState(false);
  const [classByRoomOpen, setClassByRoomOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  // Inline page filters (NOT a modal). User picks Room + Academic, then SHOW.
  // Filters appear only after the SHOW button is clicked; any other action
  // button hides them again so the toolbar stays clean.
  const [showFilters, setShowFilters] = useState(false);
  const [room, setRoom] = useState({ id: '', label: '' });
  const [ay, setAy] = useState({ id: '', label: '' });

  const roomLoader = useMemo(() => makeOptionLoader('room_options'), []);
  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);

  const loadData = useCallback(async () => {
    if (!room.id) {
      swalError(t('assignStudentRoom.selectRoom', 'Fadlan dooro Room'), '');
      return;
    }
    if (!ay.id) {
      swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchDataPaginated({
        queryName: 'AssignStudentRoom',
        page: 1,
        limit: 500,
        r_id: room.id,
        academicYearId: ay.id,
      });
      const data = res?.data ?? res?.rows ?? [];
      setRows(data);
      setColumns(res?.columns || []);
      setLoaded(true);
    } catch (e) {
      swalError(t('common.error', 'Khalad'), e?.message || 'Failed to load');
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [t, room.id, ay.id]);

  // Reveal filters on first SHOW click; on subsequent clicks (filters already
  // visible + Room+Academic selected), trigger the actual fetch.
  const handleShowClick = useCallback(() => {
    if (!showFilters) { setShowFilters(true); return; }
    loadData();
  }, [showFilters, loadData]);

  // Wrap any non-SHOW action so it auto-hides the filter row first — keeps
  // the toolbar uncluttered when the user is not in SHOW context.
  const wrap = useCallback((fn) => () => { setShowFilters(false); fn(); }, []);

  const notReady = (label) => () => {
    swalError(
      t('common.notReady', 'Function-ka diyaar uma ahan'),
      `${label} ${t('common.willBeImplemented', 'weli lama dhammaystirin.')}`
    );
  };

  const onRemoveAll = async () => {
    swalConfirmAction({
      title: t('common.confirmDeleteTitle', 'Hubi tirtirka'),
      text: t('assignStudentRoom.confirmRemoveAll', 'Tani waxay tirtirtaa dhammaan kala-saaridaha qolalka. Sii wad?'),
      confirmText: t('swal.buttons.yesDelete', 'Haa, tirtir'),
      confirmColor: '#dc2626',
      onConfirm: async () => {
        return { message: t('common.notReadyAction', 'SP weli lama dhammaystirin.') };
      },
    });
  };

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

  // Compact toolbar: smaller buttons, icon-led with concise labels. Filters
  // appear inline only when SHOW is active, so other modes (Room By Class etc)
  // get a clean strip of action buttons.
  const btnClass = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold uppercase tracking-wide transition shadow-sm";
  const btnPrimary = `${btnClass} bg-[#0B3C5D] hover:bg-[#0a4773] text-white`;
  const btnDanger  = `${btnClass} bg-red-500 hover:bg-red-600 text-white`;
  const btnActive  = `${btnClass} bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-200`;

  const headerActions = (
    <>
      {showFilters && (
        <div className="basis-full mb-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-50 via-sky-50 to-blue-50 border border-sky-200 shadow-sm">
            <div className="flex items-center gap-2 pr-3 mr-1 border-r border-sky-200">
              <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-sm">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-sky-700">Filter</span>
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Room</label>
              <Select2
                value={room.id}
                selectedLabel={room.label}
                onChange={(e) => setRoom({ id: e.target.value, label: e.target.label || '' })}
                loadOptions={roomLoader}
                placeholder={t('assignStudentRoom.selectRoom', 'Select Room')}
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Academic Year</label>
              <Select2
                value={ay.id}
                selectedLabel={ay.label}
                onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}
                loadOptions={acadLoader}
                placeholder={t('entity.selectAcademic', 'Select Academic Year')}
              />
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="self-end h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-[12.5px] uppercase tracking-wide flex items-center gap-2 shadow-sm transition"
            >
              <Database className="w-4 h-4" />
              {loading ? '...' : 'Load'}
            </button>
          </div>
        </div>
      )}
      <button type="button" className={btnPrimary} onClick={wrap(() => setRoomByClassOpen(true))}>
        <Layers className="w-3.5 h-3.5" /> Room/Class
      </button>
      <button type="button" className={btnPrimary} onClick={wrap(() => setClassByRoomOpen(true))}>
        <Grid3x3 className="w-3.5 h-3.5" /> Class/Room
      </button>
      <button type="button" className={showFilters ? btnActive : btnPrimary} onClick={handleShowClick}>
        <Database className="w-3.5 h-3.5" /> {showFilters ? (loading ? '...' : 'Load') : 'Show'}
      </button>
      <button type="button" className={btnPrimary} onClick={wrap(() => setAutoGenOpen(true))}>
        <RefreshCw className="w-3.5 h-3.5" /> Auto Gen
      </button>
      <button type="button" className={btnPrimary} onClick={wrap(notReady(t('assignStudentRoom.serialNumber', 'Serial Number')))}>
        <Hash className="w-3.5 h-3.5" /> Serial
      </button>
      <button type="button" className={btnPrimary} onClick={wrap(notReady(t('assignStudentRoom.roomTransfer', 'Room Transfer')))}>
        <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
      </button>
      <button type="button" className={btnPrimary} onClick={wrap(notReady(t('assignStudentRoom.roomExchange', 'Room Exchange')))}>
        <ArrowLeftRight className="w-3.5 h-3.5" /> Exchange
      </button>
      <button type="button" className={btnPrimary} onClick={wrap(notReady(t('assignStudentRoom.copyStudentRoom', 'Copy Student Room')))}>
        <Copy className="w-3.5 h-3.5" /> Copy
      </button>
      <button type="button" className={btnDanger} onClick={wrap(onRemoveAll)}>
        <Trash2 className="w-3.5 h-3.5" /> Remove
      </button>
    </>
  );

  return (
    <>
    <DataTableCard
      showDataPanel={loaded}
      searchPlaceholder={t('entity.search', 'Search')}
      searchValue={searchQuery}
      onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
      onSearchSubmit={() => {}}
      headerActions={headerActions}
      emptyTitleClickToLoad={t('entity.noLoaded', 'No data loaded')}
      emptyDescClickToLoad={t('entity.loadHint', 'Click SHOW to load data')}
      emptyIconClickToLoad={Plus}
      columns={tableColumns}
      data={pagedRows}
      isLoading={loading}
      emptyIcon={Plus}
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
    <RoomByClassModal
      isOpen={roomByClassOpen}
      onClose={() => setRoomByClassOpen(false)}
      onSuccess={() => { setRoomByClassOpen(false); loadData(); }}
      context={{}}
    />
    <ClassByRoomModal
      isOpen={classByRoomOpen}
      onClose={() => setClassByRoomOpen(false)}
      onSuccess={() => { setClassByRoomOpen(false); loadData(); }}
      context={{}}
    />
    <AutoGenerateRoomModal
      isOpen={autoGenOpen}
      onClose={() => setAutoGenOpen(false)}
      onSuccess={() => { setAutoGenOpen(false); }}
    />
    </>
  );
}

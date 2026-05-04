import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Database, Plus, Printer, Pencil, Trash2, Eye } from 'lucide-react';
import Swal from 'sweetalert2';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import Button from '../../../components/ui/Button';
import ActionButton from '../../../components/ui/ActionButton';
import EmptyState from '../../../components/ui/EmptyState';
import DataTableCard from '../../../components/DataTableCard';
import MeetingAgendaModal from '../../../modals/MeetingAgendaModal';
import MeetingMinutesReportModal from '../../../modals/MeetingMinutesReportModal';
import MeetingMinutesReportListModal from '../../../modals/MeetingMinutesReportListModal';
import { getTabsForPath } from '../../../config/menuConfig';
import { setActiveTab } from '../../../slices/uiSlice';
import { fetchDataPaginated, crud, getSessionUBrIdNum } from '../../../services/api';
import { swalConfirm, swalError } from '../../../utils/swal';

const SWAL_CLS = {
  container: 'swal-on-top',
  popup: 'swal-app-popup',
  title: 'swal-app-title',
  htmlContainer: 'swal-app-html',
  confirmButton: 'swal-app-confirm',
  actions: 'swal-app-actions',
};

/** Show the raw DB message — no i18n translation. */
function alertDbMessage(message) {
  return Swal.fire({
    icon: 'success',
    title: String(message ?? '').trim() || 'OK',
    confirmButtonText: 'OK',
    timer: 2200,
    timerProgressBar: true,
    customClass: SWAL_CLS,
  });
}

/** Pick row id whether it's named id or m_ag_id. */
function rowIdOf(row) {
  if (!row) return 0;
  return Number(row.id ?? row.m_ag_id ?? 0) || 0;
}


const motionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

const iconMap = { Users };

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLS = 'block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1';

const buildColumns = (t) => [
  { key: 'id',           label: t('meeting.headers.id', 'ID') },
  { key: 'agenda',       label: t('meeting.headers.agenda', 'Agenda') },
  { key: 'participance', label: t('meeting.headers.participance', 'Participants') },
  { key: 'comments',     label: t('meeting.headers.comments', 'Comments') },
  { key: 'decisions',    label: t('meeting.headers.decisions', 'Decisions') },
  { key: 'meet_date',    label: t('meeting.headers.meetDate', 'Meeting Date') },
  { key: 'username',     label: t('meeting.headers.username', 'User') },
  { key: 'reg_date',     label: t('meeting.headers.regDate', 'Registered') },
];

function mapTab(tab, t) {
  return {
    ...tab,
    icon: typeof tab.icon === 'string' ? (iconMap[tab.icon] ?? Users) : tab.icon,
    label: tab.labelKey ? t(tab.labelKey, tab.label) : tab.label,
  };
}

function dropFallback(rows) {
  if (!Array.isArray(rows)) return [];
  if (
    rows.length === 1 &&
    rowIdOf(rows[0]) === 0 &&
    !String(rows[0].agenda ?? '').trim()
  ) {
    return [];
  }
  return rows;
}

function MeetingMinutesTab() {
  const { t } = useTranslation();
  const COLUMNS = useMemo(() => buildColumns(t), [t]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [reportRow, setReportRow] = useState(null);
  const [reportListOpen, setReportListOpen] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchDataPaginated({
        queryName: 'MeetingAgenda',
        page: 1,
        limit: 1000,
        search: '',
      });
      setRows(dropFallback(res?.data ?? []));
      setPage(1);
      setLoaded(true);
    } catch (e) {
      setErrorMsg(e?.message || 'Load failed');
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (from || to) {
      list = list.filter((r) => {
        const d = r.meet_date ? String(r.meet_date).slice(0, 10) : '';
        if (!d) return true;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [rows, from, to, search]);

  const total = filtered.length;
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered
      .slice(start, start + pageSize)
      .map((r) => ({ ...r, id: rowIdOf(r) }));
  }, [filtered, page, pageSize]);

  const openAdd = () => {
    setEditRow(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditRow(null);
  };

  const handleDelete = useCallback(
    async (row) => {
      const id = rowIdOf(row);
      if (!id) {
        swalError(t('meetingAgenda.errNoId', 'Row id is missing'));
        return;
      }
      const ok = await swalConfirm({
        title: t('meetingAgenda.confirmDeleteTitle', 'Delete agenda?'),
        text: t(
          'meetingAgenda.confirmDeleteText',
          'This action will permanently delete this agenda.'
        ),
        confirmText: t('swal.buttons.yesDelete', 'Yes, delete'),
        cancelText: t('swal.buttons.no', 'Cancel'),
      });
      if (!ok) return;
      const u_br_id = getSessionUBrIdNum();
      if (!u_br_id) {
        swalError(t('meetingAgenda.errNoUser', 'No active user session'));
        return;
      }
      const meetDateStr = row.meet_date
        ? String(row.meet_date).slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      try {
        const res = await crud({
          operation: 'delete',
          fn: 'meeting_agenda_sp',
          params: {
            m_ag_id_sp: id,
            agenda_sp: String(row.agenda ?? '').trim(),
            participance_sp: String(row.participance ?? '').trim(),
            comments_sp: String(row.comments ?? '').trim(),
            decisions_sp: String(row.decisions ?? '').trim(),
            meet_date_sp: meetDateStr,
            u_br_id_sp: u_br_id,
            reg_date_sp: new Date().toISOString(),
            language_sp: 1,
          },
        });
        await fetchRows();
        await alertDbMessage(res?.message);
      } catch (e) {
        swalError(e?.message || t('meetingAgenda.errDelete', 'Delete failed'));
      }
    },
    [t, fetchRows]
  );

  const renderActions = useCallback(
    (row) => (
      <div className="inline-flex items-center gap-2">
        <ActionButton
          variant="success"
          aria-label="View / print meeting minutes"
          onClick={() => setReportRow(row)}
        >
          <Eye className="w-4 h-4" />
        </ActionButton>
        <ActionButton
          variant="edit"
          aria-label="Edit agenda"
          onClick={() => openEdit(row)}
        >
          <Pencil className="w-4 h-4" />
        </ActionButton>
        <ActionButton
          variant="delete"
          aria-label="Delete agenda"
          onClick={() => handleDelete(row)}
        >
          <Trash2 className="w-4 h-4" />
        </ActionButton>
      </div>
    ),
    [handleDelete]
  );

  return (
    <div className="space-y-4">
      <div className="px-3 py-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="meeting-from" className={LABEL_CLS}>
              {t('meeting.from', 'From.')}
            </label>
            <input
              id="meeting-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label htmlFor="meeting-to" className={LABEL_CLS}>
              {t('meeting.to', 'To.')}
            </label>
            <input
              id="meeting-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => setReportListOpen(true)}
          >
            {t('action.print', 'PRINT')}
          </Button>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-3">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openAdd}
          >
            {t('entity.addNew', 'ADD NEW')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Database className="w-4 h-4" />}
            onClick={fetchRows}
          >
            {t('action.showData', 'SHOW DATA')}
          </Button>
        </div>
      </div>

      {!loaded && !loading && (
        <div className="rounded-xl border border-slate-200/70 bg-white py-10">
          <EmptyState
            title={t('empty.notLoaded', 'No data loaded yet')}
            description={t('empty.clickShowData', 'Click SHOW DATA to load meeting agendas')}
          />
        </div>
      )}

      {loaded && !loading && !errorMsg && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200/70 bg-white py-10">
          <EmptyState
            title={t('empty.noData', 'No meeting agendas found')}
            description={t('empty.noDataFilters', 'Try adjusting the date range')}
          />
        </div>
      )}

      {(loading || errorMsg || (loaded && filtered.length > 0)) && (
        <DataTableCard
          columns={COLUMNS}
          data={paged}
          isLoading={loading}
          error={errorMsg}
          total={total}
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          itemsPerPage={pageSize}
          onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
          onNextPage={() =>
            setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))
          }
          onPageClick={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          searchValue={search}
          onSearchChange={(e) => {
            setSearch(e?.target?.value ?? '');
            setPage(1);
          }}
          onSearchSubmit={() => {}}
          renderActions={renderActions}
          rowKey={rowIdOf}
        />
      )}

      <MeetingAgendaModal
        isOpen={modalOpen}
        onClose={closeModal}
        editRow={editRow}
        onSuccess={fetchRows}
      />

      <MeetingMinutesReportModal
        isOpen={!!reportRow}
        onClose={() => setReportRow(null)}
        row={reportRow}
      />

      <MeetingMinutesReportListModal
        isOpen={reportListOpen}
        onClose={() => setReportListOpen(false)}
        dateFrom={from}
        dateTo={to}
      />
    </div>
  );
}

export default function MeetingMinutesPage() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const rawTabs = getTabsForPath(location.pathname);
  const tabs = useMemo(() => rawTabs.map((tab) => mapTab(tab, t)), [rawTabs, t]);

  const { activeTab } = useSelector((state) => state.ui);

  useEffect(() => {
    if (tabs.length && !tabs.some((tab) => tab.id === activeTab)) {
      dispatch(setActiveTab(tabs[0].id));
    }
  }, [location.pathname, tabs, activeTab, dispatch]);

  const renderTabContent = () => {
    if (activeTab === 'MeetingMinutes') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <MeetingMinutesTab />
        </motion.div>
      );
    }
    return null;
  };

  if (!tabs.length) return null;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/60">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="relative px-5 py-5 bg-white border-b border-slate-200/70">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => dispatch(setActiveTab(id))}
            className="w-full"
          />
        </div>
        <div className="px-3 pb-4 pt-2">
          <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

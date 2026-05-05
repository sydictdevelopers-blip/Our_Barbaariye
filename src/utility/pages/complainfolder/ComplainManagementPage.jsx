import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Timer, Database, Plus, Eye, Undo2, CheckCircle2, RefreshCw } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import ActionButton from '../../../components/ui/ActionButton';
import EmptyState from '../../../components/ui/EmptyState';
import DataTableCard from '../../../components/DataTableCard';
import CrudModal from '../../../modals/CrudModal';
import { EntityTab } from '../../index';
import { CRUD_CONFIG } from '../../../config/crudConfig';
import { getTabsForPath } from '../../../config/menuConfig';
import { getModalEntities, getQueryForModalKey } from '../../../utils/tabModalUtils';
import { loadData } from '../../../slices/dataSlice';
import { setActiveTab } from '../../../slices/uiSlice';
import { store } from '../../../store/store';
import { fetchDataPaginated, crud, getSessionUBrIdNum } from '../../../services/api';
import { swalConfirmAction, swalError } from '../../../utils/swal';

const motionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

const iconMap = { Users, Timer, Database, Plus };

function mapTab(tab, t) {
  return {
    ...tab,
    icon: typeof tab.icon === 'string' ? (iconMap[tab.icon] ?? Users) : tab.icon,
    label: tab.labelKey ? t(tab.labelKey, tab.label) : tab.label,
    loadButtons: (tab.loadButtons || []).map((btn) => ({
      ...btn,
      icon: typeof btn.icon === 'string' ? (iconMap[btn.icon] ?? Plus) : btn.icon,
    })),
  };
}

/* ───────────────────────── Job Done tab ─────────────────────────
   Two big toggle buttons select the query:
     • OUTSTANDING → ComplianOutstanding (state='Active')
     • JOB DONE    → ComplianDone        (state='Inactive')
   Action column flips state via complain_done_sp(id, u_br_id, oper).
*/
const buildColumns = (t) => [
  { key: 'id',        label: t('complain.columns.id',       'ID') },
  { key: 'complian',  label: t('complain.columns.complian', 'Complaint') },
  { key: 'type',      label: t('complain.columns.type',     'Type') },
  { key: 'comments',  label: t('complain.columns.comments', 'Comments') },
  { key: 'date',      label: t('complain.columns.date',     'Date') },
  { key: 'user',      label: t('complain.columns.user',     'User') },
];

// Treat the SP "notfound" sentinel row (id=0, blank name) as an empty result.
function dropFallback(rows) {
  if (!Array.isArray(rows)) return [];
  if (rows.length === 1 && (rows[0].id === 0 || rows[0].id == null) && !rows[0].complian) return [];
  return rows;
}

function ComplainDoneTab() {
  const { t } = useTranslation();
  const COLUMNS = useMemo(() => buildColumns(t), [t]);
  const [view, setView] = useState('outstanding');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const queryName = view === 'outstanding' ? 'ComplianOutstanding' : 'ComplianDone';

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchDataPaginated({ queryName, page: 1, limit: 1000, search: '' });
      setRows(dropFallback(res?.data ?? []));
      setPage(1);
    } catch (e) {
      setErrorMsg(e?.message || 'Load failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [queryName]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

  const total = filtered.length;
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const flipState = useCallback((row, oper) => {
    swalConfirmAction({
      title: t('complain.confirmTitle', 'Fariin Ogeysis ah'),
      text: oper === 'out'
        ? t('complain.confirmOut', 'MA HUBTAA IN HOWSHAAN LA QABTAY?')
        : t('complain.confirmDone', 'MA HUBTAA IN HOWSHAAN DIB LOO CELIYO?'),
      confirmText: t('swal.buttons.confirm', 'Confirm'),
      cancelText:  t('swal.buttons.cancel',  'Cancel'),
      confirmColor: '#0f3d5e',
      onConfirm: async () => {
        const u_br_id = getSessionUBrIdNum();
        if (!u_br_id) {
          swalError(t('complain.errNoUser', 'No active user session'));
          return { message: '' };
        }
        try {
          const res = await crud({
            operation: oper,
            fn: 'complain_done_sp',
            params: { p_com_id: Number(row.id) || 0, p_u_br_id: u_br_id },
          });
          await fetchRows();
          return { message: res?.message };
        } catch (e) {
          swalError(e?.message || t('complain.errFlip', 'Update failed'));
          return { message: '' };
        }
      },
    });
  }, [t, fetchRows]);

  const renderActions = useCallback((row) => (
    view === 'outstanding' ? (
      <ActionButton
        variant="success"
        aria-label={t('complain.markAsDone', 'Mark as done')}
        onClick={() => flipState(row, 'out')}
      >
        <Eye className="w-4 h-4" />
      </ActionButton>
    ) : (
      <ActionButton
        variant="warning"
        aria-label={t('complain.returnToOutstanding', 'Return to outstanding')}
        onClick={() => flipState(row, 'done')}
      >
        <Undo2 className="w-4 h-4" />
      </ActionButton>
    )
  ), [view, flipState]);

  // Click to (re)load. Switching view triggers a fetch via the queryName
  // dependency on fetchRows; clicking the active button calls fetchRows()
  // directly so the user can manually refresh.
  const handleViewChange = (next) => {
    setPage(1);
    setSearch('');
    if (view === next) {
      fetchRows();
    } else {
      setView(next);
    }
  };

  const StatusButton = ({
    id, labelKey, fallback, icon: Icon,
    activeClass, idleTextClass, idleBorderClass, idleHoverClass,
    idleIconBgClass, idleIconTextClass,
  }) => {
    const isActive = view === id;
    return (
      <button
        type="button"
        onClick={() => handleViewChange(id)}
        aria-pressed={isActive}
        className={`group flex-1 min-w-[200px] flex items-center gap-3 py-3.5 px-5 text-sm font-bold rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
          isActive
            ? `${activeClass} text-white border-transparent shadow-lg ring-2 ring-white/20`
            : `bg-white ${idleTextClass} ${idleBorderClass} ${idleHoverClass} dark:bg-slate-800 dark:border-slate-700`
        }`}
      >
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
            isActive ? 'bg-white/25' : `${idleIconBgClass} ${idleIconTextClass}`
          }`}
        >
          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
        </span>
        <span className="tracking-wide flex-1 text-start uppercase">
          {t(labelKey, fallback)}
        </span>
        {isActive && total > 0 && (
          <span className="px-2.5 py-1 rounded-lg bg-white/25 text-xs font-extrabold tabular-nums">
            {total}
          </span>
        )}
        {isActive && (
          <RefreshCw
            className={`w-4 h-4 text-white/80 transition-transform group-hover:rotate-180 ${
              loading ? 'animate-spin' : ''
            }`}
            aria-hidden
          />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-sm">
        <StatusButton
          id="outstanding"
          labelKey="complain.outstanding"
          fallback="OUTSTANDING"
          icon={Timer}
          activeClass="bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-300/50"
          idleTextClass="text-amber-700 dark:text-amber-300"
          idleBorderClass="border-amber-200 dark:border-amber-700/40"
          idleHoverClass="hover:bg-amber-50 hover:border-amber-300"
          idleIconBgClass="bg-amber-100 dark:bg-amber-900/30"
          idleIconTextClass="text-amber-700 dark:text-amber-300"
        />
        <StatusButton
          id="done"
          labelKey="complain.jobDone"
          fallback="JOB DONE"
          icon={CheckCircle2}
          activeClass="bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-300/50"
          idleTextClass="text-emerald-700 dark:text-emerald-300"
          idleBorderClass="border-emerald-200 dark:border-emerald-700/40"
          idleHoverClass="hover:bg-emerald-50 hover:border-emerald-300"
          idleIconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          idleIconTextClass="text-emerald-700 dark:text-emerald-300"
        />
      </div>

      {!loading && !errorMsg && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200/70 bg-white py-10">
          <EmptyState
            title={
              view === 'outstanding'
                ? t('complain.emptyOutstanding', 'No outstanding complaints')
                : t('complain.emptyDone', 'No completed jobs yet')
            }
            description={t('complain.changeFilter', 'Switch the filter to view another list')}
          />
        </div>
      )}

      {(loading || errorMsg || filtered.length > 0) && (
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
          onNextPage={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
          onPageClick={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          searchValue={search}
          onSearchChange={(e) => { setSearch(e?.target?.value ?? ''); setPage(1); }}
          onSearchSubmit={() => {}}
          renderActions={renderActions}
          rowKey="id"
        />
      )}
    </div>
  );
}

/* ───────────────────────── Page wrapper ───────────────────────── */
export default function ComplainManagementPage() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [modal, setModal] = useState({ entityKey: null, editRow: null, context: {} });

  const rawTabs = getTabsForPath(location.pathname);
  const tabs = useMemo(() => rawTabs.map((tab) => mapTab(tab, t)), [rawTabs, t]);

  const { activeTab } = useSelector((state) => state.ui);
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab);
  const modalEntities = getModalEntities(tabs);

  useEffect(() => {
    if (tabs.length && !tabs.some((tab) => tab.id === activeTab)) {
      dispatch(setActiveTab(tabs[0].id));
    }
  }, [location.pathname, tabs, activeTab, dispatch]);

  const openModal = (entityKey) => (row = null, context = {}) => {
    const config = CRUD_CONFIG[entityKey];
    const editRow = row && config?.fromRow ? config.fromRow(row) : row;
    setModal({ entityKey, editRow, context });
  };

  const closeModal = () => setModal({ entityKey: null, editRow: null, context: {} });

  const reloadEntity = (entityKey) => {
    const q = getQueryForModalKey(tabs, entityKey);
    if (!q) return;
    const tabCfg = tabs.find((tab) => tab.modalKey === entityKey);
    const entKey = tabCfg?.entityKey ?? q;
    const entity = store.getState().data.entities[entKey] ?? {};
    dispatch(loadData({
      queryName: q,
      page: entity.currentPage ?? 1,
      limit: entity.itemsPerPage ?? 10,
      search: entity.searchQuery ?? '',
    }));
  };

  const renderTabContent = () => {
    if (activeTab === 'ComplainDone') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <ComplainDoneTab />
        </motion.div>
      );
    }
    const cfg = activeTabConfig?.entityKey ? activeTabConfig : null;
    if (cfg) {
      return (
        <motion.div key={activeTab} {...motionProps}>
          <EntityTab
            entityKey={cfg.entityKey}
            modalKey={cfg.modalKey}
            icon={cfg.icon}
            loadButtons={cfg.loadButtons}
            dispatch={dispatch}
            onEdit={openModal}
            hiddenColumns={cfg.hiddenColumns}
          />
        </motion.div>
      );
    }
    return null;
  };

  if (!tabs.length) return null;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm shadow-slate-200/60 dark:shadow-slate-900/40">
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

      {modalEntities.map((entityKey) => {
        const config = CRUD_CONFIG[entityKey];
        if (!config) return null;
        const editRow = modal.editRow;
        const isOpen = modal.entityKey === entityKey;
        return (
          <CrudModal
            key={entityKey}
            isOpen={isOpen}
            onClose={closeModal}
            config={config}
            initialForm={editRow || {}}
            mode={editRow ? 'update' : 'insert'}
            onSuccess={() => reloadEntity(entityKey)}
          />
        );
      })}
    </div>
  );
}

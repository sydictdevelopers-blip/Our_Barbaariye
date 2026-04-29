import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Timer, Database, Plus, Eye, Undo2 } from 'lucide-react';
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
const COLUMNS = [
  { key: 'id',        label: 'ID' },
  { key: 'complian',  label: 'Complian' },
  { key: 'type',      label: 'Type' },
  { key: 'comments',  label: 'Comments' },
  { key: 'date',      label: 'Date' },
  { key: 'user',      label: 'User' },
];

// Treat the SP "notfound" sentinel row (id=0, blank name) as an empty result.
function dropFallback(rows) {
  if (!Array.isArray(rows)) return [];
  if (rows.length === 1 && (rows[0].id === 0 || rows[0].id == null) && !rows[0].complian) return [];
  return rows;
}

function ComplainDoneTab() {
  const { t } = useTranslation();
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
        aria-label="Mark as done"
        onClick={() => flipState(row, 'out')}
      >
        <Eye className="w-4 h-4" />
      </ActionButton>
    ) : (
      <ActionButton
        variant="warning"
        aria-label="Return to outstanding"
        onClick={() => flipState(row, 'done')}
      >
        <Undo2 className="w-4 h-4" />
      </ActionButton>
    )
  ), [view, flipState]);

  const ToggleButton = ({ id, labelKey, fallback }) => {
    const isActive = view === id;
    return (
      <button
        type="button"
        onClick={() => { setView(id); setPage(1); setSearch(''); }}
        className={`flex-1 min-w-[160px] py-3 px-5 text-sm font-semibold rounded-xl transition-colors duration-200 border ${
          isActive
            ? 'bg-[#0f3d5e] text-white border-[#0f3d5e] shadow-sm'
            : 'bg-white text-[#0f3d5e] border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
        }`}
        aria-pressed={isActive}
      >
        {t(labelKey, fallback)}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
        <ToggleButton id="outstanding" labelKey="complain.outstanding" fallback="OUTSTANDING" />
        <ToggleButton id="done"        labelKey="complain.jobDone"     fallback="JOB DONE" />
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

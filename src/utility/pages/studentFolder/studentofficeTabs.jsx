import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import CrudModal from '../../../modals/CrudModal';
import StudentsTab from './StudentsTab';
import StudentInfoTab from './StudentInfoTab';
import StudentStateTab from './StudentStateTab';
import { EntityTab } from '../../index';
import { CRUD_CONFIG } from '../../../config/crudConfig';
import { fetchDataPaginated } from '../../../services/api';
import { swalError } from '../../../utils/swal';
import { useTabsForPath } from '../../../utils/usePrivilegedTabs';
import { getModalEntities, getQueryForModalKey } from '../../../utils/tabModalUtils';
import { resolveTabIcon, resolveButtonIcon } from '../../../utils/iconRegistry';
import { loadData } from '../../../slices/dataSlice';
import { setActiveTab } from '../../../slices/uiSlice';
import { store } from '../../../store/store';
import ChangeResponsibleForm from './ChangeResponsibleForm';

const motionProps = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };

function mapTab(tab) {
  return {
    ...tab,
    icon: resolveTabIcon(tab.icon),
    loadButtons: (tab.loadButtons || []).map((btn) => ({
      ...btn,
      icon: resolveButtonIcon(btn.icon),
    })),
  };
}

export default function StudentofficeTabs() {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const [modal, setModal] = useState({ entityKey: null, editRow: null });
  // Ref to the currently mounted EntityTab so the modal's onSuccess can call
  // refresh() — the tab-level queryName in menuConfig isn't always a real backend
  // query (e.g. "Responsible"), so refreshing via getQueryForModalKey 404s.
  const entityTabRef = useRef(null);

  const rawTabs = useTabsForPath(location.pathname);
  const tabs = useMemo(
    () => rawTabs.map(mapTab).map((tab) => ({
      ...tab,
      label: tab.labelKey ? t(tab.labelKey, tab.label) : tab.label,
    })),
    [rawTabs, t]
  );
  const { activeTab } = useSelector((state) => state.ui);
  const activeTabConfig = tabs.find((t) => t.id === activeTab);
  const modalEntities = getModalEntities(tabs);

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeTab)) {
      dispatch(setActiveTab(tabs[0].id));
    }
  }, [location.pathname, tabs, activeTab, dispatch]);

  // Some list views expose display labels (e.g. driver_name, plot_no) but not
  // the FK columns the edit form needs (emp_id, targo). Map modalKey → the
  // single-row fetch query + its id param so we hydrate the row before opening.
  const editFetchByModal = {
    ResponsibleModal: { queryName: 'ResponsibleEdit', idParam: 'res_id' },
    bus:              { queryName: 'BusEdit',         idParam: 'bus_id' },
  };
  const openModal = (entityKey) => async (row = null) => {
    const config = CRUD_CONFIG[entityKey];
    let workingRow = row;
    const fetchSpec = editFetchByModal[entityKey];
    if (fetchSpec && row?.id) {
      try {
        const res = await fetchDataPaginated({ queryName: fetchSpec.queryName, [fetchSpec.idParam]: row.id });
        const full = res?.data?.[0];
        if (full) workingRow = full;
      } catch (err) {
        swalError(t('swal.titles.error'), err?.message || '');
        return;
      }
    }
    const editRow = workingRow && config?.fromRow ? config.fromRow(workingRow) : workingRow;
    setModal({ entityKey, editRow });
  };

  const closeModal = () => setModal({ entityKey: null, editRow: null });

  const renderTabContent = () => {
    const cfg = activeTabConfig?.entityKey ? activeTabConfig : null;
    if (activeTab === 'Students' && location.pathname === '/StudentsOffice') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <StudentsTab />
        </motion.div>
      );
    }
    if (activeTab === 'Studentinfo' && location.pathname === '/StudentsOffice') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <StudentInfoTab />
        </motion.div>
      );
    }
    if (activeTab === 'studentstate' && location.pathname === '/StudentsOffice') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <StudentStateTab />
        </motion.div>
      );
    }
    if (cfg) {
      return (
        <motion.div key={activeTab} {...motionProps}>
          <EntityTab
            ref={entityTabRef}
            entityKey={cfg.entityKey}
            modalKey={cfg.modalKey}
            icon={cfg.icon}
            loadButtons={cfg.loadButtons}
            dispatch={dispatch}
            onEdit={openModal}
            showAcademicYearSelect={cfg.showAcademicYearSelect}
            academicYearOptionsQuery={cfg.academicYearOptionsQuery}
            showResponsibleSelect={cfg.showResponsibleSelect}
            hiddenColumns={cfg.hiddenColumns}
            hideEdit={cfg.hideEdit}
            hideDelete={cfg.hideDelete}
            hideAddNew={cfg.hideAddNew}
            bulkForm={cfg.entityKey === 'Responsible'
              ? ({ context, onSuccess, onCancel }) => (
                  <ChangeResponsibleForm
                    context={context}
                    onSuccess={onSuccess}
                    onCancel={onCancel}
                  />
                )
              : undefined}
          />
        </motion.div>
      );
    }
    return (
      <motion.div key={activeTab} {...motionProps} className="p-8 text-center text-slate-500">
        {t('placeholder.comingSoon')}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {tabs.length > 0 && (
        <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm shadow-slate-200/60 dark:shadow-slate-900/40">
          <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] to-[#0D9488]" />
          <div className="flex items-center justify-between flex-wrap gap-4 px-5 py-4 min-h-[58px] bg-gradient-to-r from-[#F8FAFC] to-[#EEF2F7] dark:from-slate-800/70 dark:to-slate-800/50 border-b border-slate-200/80 dark:border-slate-700/80">
           
            <Tabs
              tabs={tabs}
              
              activeTab={activeTab}
              onTabChange={(id) => dispatch(setActiveTab(id))}
              className="flex-1 min-w-0"
            />
          </div>
          <div className="px-3 pb-4 pt-1">
            <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>
          </div>
        </Card>
      )}

      {modalEntities.map((entityKey) => {
        const config = CRUD_CONFIG[entityKey];
        const isOpen = modal.entityKey === entityKey;
        const editRow = modal.editRow;
        if (!config) return null;
        return (
          <CrudModal
            key={entityKey}
            isOpen={isOpen}
            onClose={closeModal}
            config={config}
            initialForm={editRow || {}}
            mode={editRow ? 'update' : 'insert'}
            onSuccess={() => {
              // Refresh whichever load-button result is currently visible — this
              // works for "All", "Show Data", etc. Falls back to the tab-level
              // queryName only if the EntityTab hasn't mounted/loaded anything.
              if (entityTabRef.current?.refresh) {
                entityTabRef.current.refresh();
                return;
              }
              const q = getQueryForModalKey(tabs, entityKey);
              if (q) {
                const tabCfg = tabs.find((t) => t.modalKey === entityKey);
                const entKey = tabCfg?.entityKey ?? q;
                const entity = store.getState().data.entities[entKey] ?? {};
                dispatch(loadData({
                  queryName: q,
                  page: entity.currentPage ?? 1,
                  limit: entity.itemsPerPage ?? 10,
                  search: entity.searchQuery ?? '',
                }));
              }
            }}
          />
        );
      })}
    </div>
  );
}

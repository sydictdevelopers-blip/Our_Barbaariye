import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Plus } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import CrudModal from '../../../modals/CrudModal';
import SubjectClassBulkForm from '../../../modals/SubjectClassBulkForm';
import { EntityTab } from '../../index';
import { CRUD_CONFIG } from '../../../config/crudConfig';
import { getTabsForPath } from '../../../config/menuConfig';
import { getModalEntities, getQueryForModalKey } from '../../../utils/tabModalUtils';
import { loadData } from '../../../slices/dataSlice';
import { setActiveTab } from '../../../slices/uiSlice';
import { store } from '../../../store/store';

const motionProps = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };
const iconMap = { Database, Plus };

function mapTab(tab) {
  return {
    ...tab,
    icon: typeof tab.icon === 'string' ? (iconMap[tab.icon] ?? Database) : tab.icon,
    loadButtons: (tab.loadButtons || []).map((btn) => ({
      ...btn,
      icon: typeof btn.icon === 'string' ? (iconMap[btn.icon] ?? Plus) : btn.icon,
    })),
  };
}

export default function AccountsPage() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [modal, setModal] = useState({ entityKey: null, editRow: null, context: {} });

  const rawTabs = getTabsForPath(location.pathname);
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

  const openModal = (entityKey) => (row = null, context = {}) => {
    const config = CRUD_CONFIG[entityKey];
    const editRow = row && config?.fromRow ? config.fromRow(row) : row;
    setModal({ entityKey, editRow, context });
  };

  const closeModal = () => setModal({ entityKey: null, editRow: null, context: {} });

  const reloadEntity = (entityKey) => {
    const q = getQueryForModalKey(tabs, entityKey);
    if (!q) return;
    const tabCfg = tabs.find((t) => t.modalKey === entityKey);
    const entKey = tabCfg?.entityKey ?? q;
    const entity = store.getState().data.entities[entKey] ?? {};
    dispatch(loadData({
      queryName: q,
      page: entity.currentPage ?? 1,
      limit: entity.itemsPerPage ?? 10,
      search: entity.searchQuery ?? '',
      ...(modal.context?.cl_id && { cl_id: modal.context.cl_id }),
      ...(modal.context?.academicYearId && { academicYearId: modal.context.academicYearId }),
    }));
  };

  const renderTabContent = () => {
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
            showAcademicYearSelect={cfg.showAcademicYearSelect}
            academicYearOptionsQuery={cfg.academicYearOptionsQuery}
            showClassSelect={cfg.showClassSelect}
            classOptionsQuery={cfg.classOptionsQuery}
            hiddenColumns={cfg.hiddenColumns}
            bulkForm={cfg.entityKey === 'SubjectClassSetup'
              ? ({ context, onSuccess }) => (
                  <SubjectClassBulkForm context={context} onSuccess={onSuccess} />
                )
              : undefined}
          />
        </motion.div>
      );
    }
    return (
      <motion.div key={activeTab} {...motionProps} className="p-8 text-center text-slate-500">
        wa ikana wlalayaal
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {tabs.length > 0 && (
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
      )}

      {modalEntities.map((entityKey) => {
        const config = CRUD_CONFIG[entityKey];
        if (!config) return null;
        // SubjectClassSetup: insert-ka waxaa qaabilsan inline bulk form-ka,
        // sidaas darteed CrudModal kaliya waxaa loo furaa edit mode (editRow jiro).
        const isBulkEntity = entityKey === 'SubjectClassSetup';
        const editRow = modal.editRow;
        const isOpen = modal.entityKey === entityKey && (isBulkEntity ? !!editRow : true);
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

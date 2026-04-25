import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Plus } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import CrudModal from '../../../modals/CrudModal';
import StudentsTab from './StudentsTab';
import StudentInfoTab from './StudentInfoTab';
import StudentStateTab from './StudentStateTab';
import { EntityTab } from '../../index';
import { CRUD_CONFIG } from '../../../config/crudConfig';
import { getTabsForPath } from '../../../config/menuConfig';
import { getModalEntities, getQueryForModalKey } from '../../../utils/tabModalUtils';
import { loadData } from '../../../slices/dataSlice';
import { setActiveTab } from '../../../slices/uiSlice';
import { store } from '../../../store/store';
import ChangeResponsibleForm from './ChangeResponsibleForm';

const motionProps = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };
const iconMap = { Database, Plus };

function mapTab(tab) {
  return {
    ...tab,
    icon: iconMap[tab.icon] ?? Database,
    loadButtons: (tab.loadButtons || []).map((btn) => ({
      ...btn,
      icon: iconMap[btn.icon] ?? Plus,
    })),
  };
}

export default function StudentofficeTabs() {
  const location = useLocation();
  const dispatch = useDispatch();
  const [modal, setModal] = useState({ entityKey: null, editRow: null });

  const rawTabs = getTabsForPath(location.pathname);
  const tabs = useMemo(() => rawTabs.map(mapTab), [rawTabs]);
  const { activeTab } = useSelector((state) => state.ui);
  const activeTabConfig = tabs.find((t) => t.id === activeTab);
  const modalEntities = getModalEntities(tabs);

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeTab)) {
      dispatch(setActiveTab(tabs[0].id));
    }
  }, [location.pathname, tabs, activeTab, dispatch]);

  const openModal = (entityKey) => (row = null) => {
    const config = CRUD_CONFIG[entityKey];
    const editRow = row && config?.fromRow ? config.fromRow(row) : row;
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
        wa ikana wlalayaal
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {tabs.length > 0 && (
        <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/60">
          <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] to-[#0D9488]" />
          <div className="flex items-center justify-between flex-wrap gap-4 px-5 py-4 min-h-[58px] bg-gradient-to-r from-[#F8FAFC] to-[#EEF2F7] border-b border-slate-200/80">
           
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

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Power } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import ActionButton from '../../../components/ui/ActionButton';
import CrudModal from '../../../modals/CrudModal';
import { EntityTab } from '../../index';
import { CRUD_CONFIG } from '../../../config/crudConfig';
import { useTabsForPath } from '../../../utils/usePrivilegedTabs';
import { getModalEntities, getQueryForModalKey } from '../../../utils/tabModalUtils';
import { loadData } from '../../../slices/dataSlice';
import { setActiveTab } from '../../../slices/uiSlice';
import { crud } from '../../../services/api';
import { swalConfirmAction, swalError } from '../../../utils/swal';

const motionProps = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };

export default function AccountsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const [modal, setModal] = useState({ entityKey: null, editRow: null });

  const tabs = useTabsForPath(location.pathname);
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

  const activateAcademicYear = useCallback(async (row) => {
    await swalConfirmAction({
      title: t('academicSetup.academicYearTab.confirmActivateTitle', { defaultValue: 'Activate this academic year?' }),
      text: t('academicSetup.academicYearTab.confirmActivateText', { defaultValue: 'All other years will be marked Inactive.' }),
      onConfirm: async () => {
        try {
          const res = await crud({
            operation: 'activate',
            fn: 'academic_year_sp',
            params: {
              a_y_id_sp: row.id ?? row.a_y_id ?? 0,
              academic_name_sp: row.academic ?? '',
              started_sp: row.started ?? '',
              ended_sp: row.ended ?? '',
              u_br_id_sp: row.u_br_id ?? 1,
            },
          });
          dispatch(loadData('academicYeartab'));
          return res;
        } catch (e) {
          swalError(e?.message);
          throw e;
        }
      },
    });
  }, [dispatch, t]);

  const academicYearRowActions = useCallback((row) => {
    if (String(row?.state ?? '').toLowerCase() === 'active') return null;
    return (
      <ActionButton
        variant="warning"
        aria-label="Activate"
        onClick={() => activateAcademicYear(row)}
      >
        <Power className="w-4 h-4" />
      </ActionButton>
    );
  }, [activateAcademicYear]);

  const renderTabContent = () => {
    const cfg = activeTabConfig?.entityKey ? activeTabConfig : null;
    if (cfg) {
      const isAcademicYear = cfg.entityKey === 'academicYeartab';
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
            extraRowActions={isAcademicYear ? academicYearRowActions : undefined}
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
              const q = getQueryForModalKey(tabs, entityKey);
              if (q) dispatch(loadData(q));
            }}
          />
        );
      })}
    </div>
  );
}

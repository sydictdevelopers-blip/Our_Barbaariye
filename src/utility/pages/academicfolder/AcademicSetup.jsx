import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Plus, Users, Timer, PenTool, FolderPlus, ClipboardCheck, Hourglass } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import CrudModal from '../../../modals/CrudModal';
import SubjectClassBulkForm from '../../../modals/SubjectClassBulkForm';
import AssignClassExamBulkForm from '../../../modals/AssignClassExamBulkForm';
import ExamScheduleBulkForm from '../../../modals/ExamScheduleBulkForm';
import {
  GenerateExamFormModal,
  ExamStateFormModal,
  RemoveByClassModal,
  RemoveByExamModal,
} from '../../../modals/AssignClassExamActionModals';
import {
  CopyExamFormModal,
  PrintExamScheduleModal,
} from '../../../modals/ExamScheduleActionModals';
import { crud, getSessionUBrIdNum, getSessionBrIdNum } from '../../../services/api';
import { swalConfirmAction } from '../../../utils/swal';
import BranchTransferTab from './BranchTransferTab';
import AcademicTransferTab from './AcademicTransferTab';
import ClassTransferTab from './ClassTransferTab';
import TeacherSyllabusTab from './TeacherSyllabusTab';
import LessonActivityMarksTab from './LessonActivityMarksTab';
import LessonActivityResultsTab from './LessonActivityResultsTab';
import StudentPerformanceEditTab from './StudentPerformanceEditTab';
import QuestionsTableTab from '../exam/QuestionsTableTab';
import ExamInstructionTab from '../exam/ExamInstructionTab';
import GenerateExamTab from '../exam/GenerateExamTab';
import CreateOnlineExamTab from '../exam/CreateOnlineExamTab';
import ExamCopyTab from '../exam/ExamCopyTab';
import AssignStudentRoomTab from '../exam/AssignStudentRoomTab';
import ExamAttendenceTab from '../exam/ExamAttendanceTab';
import AssignTeacherRoomTab from '../exam/AssignTeacherRoomTab';
import { EntityTab } from '../../index';
import { CRUD_CONFIG } from '../../../config/crudConfig';
import { getTabsForPath } from '../../../config/menuConfig';
import { getModalEntities, getQueryForModalKey } from '../../../utils/tabModalUtils';
import { loadData } from '../../../slices/dataSlice';
import { setActiveTab } from '../../../slices/uiSlice';
import { store } from '../../../store/store';

const motionProps = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };
const iconMap = { Database, Plus, Users, Timer, PenTool, FolderPlus, ClipboardCheck, Hourglass };

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
  const [actionModal, setActionModal] = useState({ kind: null, context: null });
  const entityTabRef = useRef(null);

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
    if (activeTab === 'BranchTransfer' && location.pathname === '/AcademicTransfer') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <BranchTransferTab />
        </motion.div>
      );
    }
    if (activeTab === 'AcademicTransfer' && location.pathname === '/AcademicTransfer') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <AcademicTransferTab />
        </motion.div>
      );
    }
    if (activeTab === 'ClassTransfer' && location.pathname === '/AcademicTransfer') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <ClassTransferTab />
        </motion.div>
      );
    }
    if (activeTab === 'TeacherSyllabus' && location.pathname === '/AcademicSaylapus') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <TeacherSyllabusTab />
        </motion.div>
      );
    }
    if (activeTab === 'LessonActivityMarks' && location.pathname === '/LessonPlan') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <LessonActivityMarksTab />
        </motion.div>
      );
    }
    if (activeTab === 'LessonActivityResults' && location.pathname === '/LessonPlan') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <LessonActivityResultsTab />
        </motion.div>
      );
    }
    if (activeTab === 'StudentPerformanceEdit' && location.pathname === '/ActivityManagement') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <StudentPerformanceEditTab />
        </motion.div>
      );
    }
    if (activeTab === 'QuestionsTable' && location.pathname === '/ExamSetting') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <QuestionsTableTab />
        </motion.div>
      );
    }
    if (activeTab === 'ExamInstruction' && location.pathname === '/ExamSetting') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <ExamInstructionTab />
        </motion.div>
      );
    }
    if (activeTab === 'GenerateExam' && location.pathname === '/ExamSetting') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <GenerateExamTab />
        </motion.div>
      );
    }
    if (activeTab === 'CreateOnlineExam' && location.pathname === '/ExamSetting') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <CreateOnlineExamTab />
        </motion.div>
      );
    }
    if (activeTab === 'ExamCopy' && location.pathname === '/ExamSetting') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <ExamCopyTab />
        </motion.div>
      );
    }
    if (activeTab === 'AssignStudentRoom' && location.pathname === '/ExamService') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <AssignStudentRoomTab />
        </motion.div>
      );
    }
    if (activeTab === 'ExamAttendence' && location.pathname === '/ExamService') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <ExamAttendenceTab />
        </motion.div>
      );
    }
    if (activeTab === 'AssignTeacherRoom' && location.pathname === '/ExamService') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <AssignTeacherRoomTab />
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
            showClassSelect={cfg.showClassSelect}
            classOptionsQuery={cfg.classOptionsQuery}
            showBatchSelect={cfg.showBatchSelect}
            batchOptionsQuery={cfg.batchOptionsQuery}
            showLevelSelect={cfg.showLevelSelect}
            levelOptionsQuery={cfg.levelOptionsQuery}
            showExamSelect={cfg.showExamSelect}
            examOptionsQuery={cfg.examOptionsQuery}
            showSubjectSelect={cfg.showSubjectSelect}
            subjectOptionsQuery={cfg.subjectOptionsQuery}
            showStudentSelect={cfg.showStudentSelect}
            studentOptionsQuery={cfg.studentOptionsQuery}
            hideEdit={cfg.hideEdit}
            hideAddNew={cfg.hideAddNew}
            hiddenColumns={cfg.hiddenColumns}
            bulkForm={
              cfg.entityKey === 'SubjectClassSetup'
                ? ({ context, onSuccess }) => (
                    <SubjectClassBulkForm context={context} onSuccess={onSuccess} />
                  )
                : cfg.entityKey === 'AssignClassExam'
                ? ({ context, onSuccess }) => (
                    <AssignClassExamBulkForm context={context} onSuccess={onSuccess} />
                  )
                : cfg.entityKey === 'ExamSchedule'
                ? ({ context, onSuccess }) => (
                    <ExamScheduleBulkForm context={context} onSuccess={onSuccess} />
                  )
                : undefined
            }
            onCustomAction={(kind, ctx) => {
              // Remove Exam Schedule: hal alert, ma jiro modal — toos u tirtir.
              if (kind === 'ExamScheduleRemove') {
                swalConfirmAction({
                  title: t('examSchedule.removeTitle', 'Remove Exam Schedule'),
                  text: t('examSchedule.removeText', 'Are you sure you want to remove this?'),
                  confirmText: t('swal.buttons.remove', 'Remove'),
                  cancelText: t('swal.buttons.cancel', 'Cancel'),
                  confirmColor: '#0B3C5D',
                  onConfirm: async () => {
                    const result = await crud({
                      operation: 'delete',
                      fn: 'remove_exam_scheduale_by_exam',
                      params: {
                        a_y_id_sp: Number(ctx?.academicYearId) || 0,
                        ex_id_sp: Number(ctx?.ex_id) || 0,
                        u_br_id_sp: getSessionUBrIdNum(),
                        br_id_sp: getSessionBrIdNum(),
                      },
                    });
                    if (ctx?.academicYearId && ctx?.ex_id) {
                      entityTabRef.current?.showAs('ExamSceduleShow', {
                        academicYearId: ctx.academicYearId,
                        ex_id: ctx.ex_id,
                        lev_id: ctx.lev_id || 0,
                      });
                    }
                    return { message: result?.message };
                  },
                });
                return;
              }
              setActionModal({ kind, context: ctx });
            }}
          />
        </motion.div>
      );
    }
    return (
      <motion.div key={activeTab} {...motionProps} className="p-8 text-center text-slate-500">
        {t('placeholders.comingSoon', 'Coming soon')}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {tabs.length > 0 && (
        <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm shadow-slate-200/60 dark:shadow-slate-900/40">
          <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
          <div className="relative px-5 py-5 bg-white dark:bg-slate-800/80 border-b border-slate-200/70 dark:border-slate-700/70">
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
        // SubjectClassSetup & AssignClassExam: insert-ka waxaa qaabilsan inline
        // bulk form-ka, sidaas darteed CrudModal kaliya waxaa loo furaa edit
        // mode (editRow jiro).
        const isBulkEntity = entityKey === 'SubjectClassSetup' || entityKey === 'AssignClassExam' || entityKey === 'ExamSchedule';
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
            onSuccess={() => {
              // StudentPerformance is gated on a Student selection; auto-reload
              // after save would re-run the SP with stale/missing context. The
              // user wants to click "Show Data" themselves to refresh.
              if (entityKey === 'StudentPerformance') return;
              reloadEntity(entityKey);
            }}
          />
        );
      })}

      <GenerateExamFormModal
        isOpen={actionModal.kind === 'GenerateExam'}
        onClose={() => setActionModal({ kind: null, context: null })}
        onSuccess={(ctx) => {
          // Ka dib guul Generate-ka, table-ka Assign Class Exam waxaa loo
          // beddelaa view-ga "Show All" si user-ku u arko natiijada cusub.
          entityTabRef.current?.showAs('AssignClassExamShowAll', {
            academicYearId: ctx?.academicYearId,
            academicYearLabel: ctx?.academicYearLabel,
          });
        }}
        context={actionModal.context}
      />
      <ExamStateFormModal
        isOpen={actionModal.kind === 'ExamState'}
        onClose={() => setActionModal({ kind: null, context: null })}
        onSuccess={(ctx) => {
          if (ctx?.academicYearId) {
            entityTabRef.current?.showAs('AssignClassExamShowAll', {
              academicYearId: ctx.academicYearId,
            });
          }
        }}
        context={actionModal.context}
      />
      <RemoveByClassModal
        isOpen={actionModal.kind === 'RemoveByClass'}
        onClose={() => setActionModal({ kind: null, context: null })}
        onSuccess={(ctx) => {
          if (ctx?.academicYearId) {
            entityTabRef.current?.showAs('AssignClassExamShowAll', {
              academicYearId: ctx.academicYearId,
            });
          }
        }}
        context={actionModal.context}
      />
      <RemoveByExamModal
        isOpen={actionModal.kind === 'RemoveByExam'}
        onClose={() => setActionModal({ kind: null, context: null })}
        onSuccess={(ctx) => {
          if (ctx?.academicYearId) {
            entityTabRef.current?.showAs('AssignClassExamShowAll', {
              academicYearId: ctx.academicYearId,
            });
          }
        }}
        context={actionModal.context}
      />
      <CopyExamFormModal
        isOpen={actionModal.kind === 'CopyExamSchedule'}
        onClose={() => setActionModal({ kind: null, context: null })}
        onSuccess={(ctx) => {
          if (ctx?.academicYearId) {
            entityTabRef.current?.showAs('ExamSceduleShow', {
              academicYearId: ctx.academicYearId,
              ex_id: ctx.ex_id,
              lev_id: ctx.lev_id || 0,
            });
          }
        }}
        context={actionModal.context}
      />
      <PrintExamScheduleModal
        isOpen={actionModal.kind === 'PrintExamSchedule'}
        onClose={() => setActionModal({ kind: null, context: null })}
        context={actionModal.context}
      />
    </div>
  );
}

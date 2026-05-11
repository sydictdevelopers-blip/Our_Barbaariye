import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, ToggleLeft, ToggleRight } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import ActionButton from '../../../components/ui/ActionButton';
import CrudModal from '../../../modals/CrudModal';
import SubjectClassBulkForm from '../../../modals/SubjectClassBulkForm';
import AssignClassExamBulkForm from '../../../modals/AssignClassExamBulkForm';
import ExamScheduleBulkForm from '../../../modals/ExamScheduleBulkForm';
import ExamRegClassAssignSection from '../../../modals/ExamRegClassAssignSection';
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
import { crud, fetchDataPaginated, runBulk, getSessionUBrIdNum, getSessionBrIdNum } from '../../../services/api';
import { swalConfirmAction, swalError } from '../../../utils/swal';
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
import StudentAttendanceTab from '../attendance/StudentAttendanceTab';
import StudentAbsentsTab from '../attendance/StudentAbsentsTab';
import AttendanceEditTab from '../attendance/AttendanceEditTab';
import { EntityTab } from '../../index';
import { CRUD_CONFIG } from '../../../config/crudConfig';
import { useTabsForPath } from '../../../utils/usePrivilegedTabs';
import { getModalEntities, getQueryForModalKey } from '../../../utils/tabModalUtils';
import { resolveTabIcon, resolveButtonIcon } from '../../../utils/iconRegistry';
import { loadData } from '../../../slices/dataSlice';
import { setActiveTab } from '../../../slices/uiSlice';
import { store } from '../../../store/store';

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

export default function AccountsPage() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [modal, setModal] = useState({ entityKey: null, editRow: null, context: {} });
  const [actionModal, setActionModal] = useState({ kind: null, context: null });
  // Section-ka fasallada ku-dhejisan modalka Exam Registration. Parent ayaa hayaa
  // state-ka si onSuccess-ka modalka markuu dhaco uu u akhriyo doorashada ugu
  // dambeysay (mode + selected pairs) si uu u kaydiyo assign_class_exam-ka.
  const [examRegAssign, setExamRegAssign] = useState({
    mode: 'all',
    selected: [],
    options: [],
    loaded: false,
    loading: false,
  });
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

  const openModal = (entityKey) => (row = null, context = {}) => {
    const config = CRUD_CONFIG[entityKey];
    const editRow = row && config?.fromRow ? config.fromRow(row) : row;
    setModal({ entityKey, editRow, context });
    // Reset the inline assign-classes section every time the ExamRegister
    // modal opens — stale selections from a prior open must never leak in.
    // For edit (row exists) the section fetches existing assignments on mount
    // via its `examRegId` effect.
    if (entityKey === 'ExamRegister') {
      setExamRegAssign({
        mode: row ? 'custom' : 'all',
        selected: [],
        original: [],
        options: [],
        optionsLoaded: false,
        loading: false,
        existingLoaded: false,
        initialModeSet: false,
      });
    }
  };

  const closeModal = () => setModal({ entityKey: null, editRow: null, context: {} });

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
              academic_name_sp: row.academic ?? row.academic_name ?? '',
              started_sp: row.started ?? '',
              ended_sp: row.ended ?? '',
              u_br_id_sp: row.u_br_id ?? getSessionUBrIdNum() ?? 1,
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

  // Assign Class Exam: actionka kaliya ee la oggol yahay waa beddelka state-ka
  // (Active ↔ Inactive) safka kasta. Confirm dialog ayaa lagu xaqiijiyaa, ka
  // dibna `assign_class_exam_set_state_sp(p_a_c_ex_sp, p_state_sp, oper)`
  // ayaa lagu updateyaa hal a_c_ex. Refetch-ku wuxuu maraa entityTabRef.refresh()
  // si filters-ka hadda firfircoon (academic/class/batch) loo isticmaalo
  // dispatch(loadData) ka beddelkii oo aan filter-yada haysan.
  const toggleAssignClassExamState = useCallback(async (row) => {
    const aCEx = Number(row?.ID ?? row?.id ?? 0);
    if (!aCEx) return;
    const cur = String(row?.State ?? row?.state ?? '').toLowerCase();
    const isActive = cur === 'active';
    const next = isActive ? 'Inactive' : 'Active';
    await swalConfirmAction({
      title: t('assignClassExamToggle.confirmTitle', 'Beddel Xaaladda Imtixaanka?'),
      text: isActive
        ? t('assignClassExamToggle.confirmDeactivate', 'Diiwaangelinta waa la joojin doonaa (Inactive).')
        : t('assignClassExamToggle.confirmActivate', 'Diiwaangelinta waa la firfircoonayn doonaa (Active).'),
      confirmText: isActive
        ? t('examStateForm.inactive', 'Aan firfircoonayn')
        : t('examStateForm.active', 'Firfircoon'),
      cancelText: t('common.cancel', 'Jooji'),
      onConfirm: async () => {
        const result = await crud({
          operation: 'update',
          fn: 'assign_class_exam_set_state_sp',
          params: { p_a_c_ex_sp: aCEx, p_state_sp: next },
        });
        entityTabRef.current?.refresh();
        return result; // swalConfirmAction renders result.message via translateMessage
      },
    });
  }, [t]);

  const assignClassExamRowActions = useCallback((row) => {
    const cur = String(row?.State ?? row?.state ?? '').toLowerCase();
    const isActive = cur === 'active';
    return (
      <ActionButton
        variant={isActive ? 'warning' : 'success'}
        aria-label={isActive ? 'Set Inactive' : 'Set Active'}
        title={isActive ? t('examStateForm.inactive', 'Aan firfircoonayn') : t('examStateForm.active', 'Firfircoon')}
        onClick={() => toggleAssignClassExamState(row)}
      >
        {isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      </ActionButton>
    );
  }, [toggleAssignClassExamState, t]);

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
    if (activeTab === 'StudentAttendance' && location.pathname === '/student_attendence') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <StudentAttendanceTab />
        </motion.div>
      );
    }
    if (activeTab === 'StudentAbsents' && location.pathname === '/student_attendence') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <StudentAbsentsTab />
        </motion.div>
      );
    }
    if (activeTab === 'AttendanceEdit' && location.pathname === '/student_attendence') {
      return (
        <motion.div key={activeTab} {...motionProps} className="px-2 py-2">
          <AttendanceEditTab />
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
            hideDelete={cfg.hideDelete}
            hideAddNew={cfg.hideAddNew}
            hiddenColumns={cfg.hiddenColumns}
            extraRowActions={
              cfg.entityKey === 'academicYeartab'
                ? academicYearRowActions
                : cfg.entityKey === 'AssignClassExam'
                ? assignClassExamRowActions
                : undefined
            }
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
            onSuccess={async (form) => {
              // StudentPerformance is gated on a Student selection; auto-reload
              // after save would re-run the SP with stale/missing context. The
              // user wants to click "Show Data" themselves to refresh.
              if (entityKey === 'StudentPerformance') return;
              reloadEntity(entityKey);

              // ExamRegister: after exam_reg_sp finishes, sync the
              // assign_class_exam rows for this er_id in ONE bulk transaction
              // (atomic + single round-trip). Insert path resolves the new
              // ex_reg_id via exam_reg_lookup; edit path uses editRow.id.
              if (entityKey === 'ExamRegister') {
                try {
                  const ayId = Number(form?.a_y_id_sp) || 0;
                  const exId = Number(form?.ex_id_sp) || 0;
                  if (!ayId || !exId) return;
                  // u_br_id at index 4 is overridden from JWT by the bulk
                  // controller; the 0 placeholder is safe.
                  const keyOf = (x) => `${x.cl_id}-${x.b_id}`;

                  // Build the list of intended (cl_id, b_id) target pairs.
                  let targetPairs = [];
                  if (examRegAssign.mode === 'all') {
                    targetPairs = (examRegAssign.options || []).map((o) => ({
                      cl_id: o.cl_id,
                      b_id: o.b_id,
                    }));
                    // Insert mode + no preloaded options (user never opened
                    // Custom) → fetch them inline so 'All' still works.
                    if (!editRow && !targetPairs.length) {
                      const res = await fetchDataPaginated({
                        queryName: 'add_assing_class_exam_show',
                        page: 1,
                        limit: 1000,
                        academicYearId: ayId,
                      });
                      targetPairs = (res?.data || [])
                        .filter((r) => r.cl_id != null && r.Result == null)
                        .map((r) => ({ cl_id: r.cl_id, b_id: r.b_id }));
                    }
                  } else {
                    targetPairs = (examRegAssign.selected || []).map((o) => ({
                      cl_id: o.cl_id,
                      b_id: o.b_id,
                    }));
                  }

                  const original = examRegAssign.original || [];
                  const origByKey = new Map(original.map((o) => [keyOf(o), o]));
                  const targetKeys = new Set(targetPairs.map(keyOf));
                  // Delete originals not in target (edit only — insert mode
                  // has no original rows).
                  const toDelete = editRow
                    ? original.filter((o) => !targetKeys.has(keyOf(o)))
                    : [];
                  // Insert targets not already present.
                  const toInsert = targetPairs.filter((p) => !origByKey.has(keyOf(p)));
                  if (!toDelete.length && !toInsert.length) return;

                  const steps = [];
                  let erRef = null;
                  if (editRow) {
                    erRef = Number(editRow.id) || 0;
                    if (!erRef) return;
                  } else {
                    // Resolve the new ex_reg_id inside the same bulk
                    // transaction so it stays consistent with the insert.
                    steps.push({
                      type: 'select',
                      query: 'exam_reg_lookup',
                      queryParams: { academicYearId: ayId, ex_id: exId },
                      pick: 'ex_reg_id',
                      saveAs: 'new_er_id',
                    });
                  }
                  if (toDelete.length) {
                    steps.push({
                      type: 'forEach',
                      source: toDelete.map((o) => ({
                        a_c_ex: o.a_c_ex,
                        cl_id: o.cl_id,
                        b_id: o.b_id,
                      })),
                      step: {
                        type: 'sp',
                        fn: 'assign_class_exam_sp',
                        params: [
                          { refIter: 'a_c_ex' },
                          erRef ?? { ref: 'new_er_id' },
                          { refIter: 'cl_id' },
                          { refIter: 'b_id' },
                          0,
                          'delete',
                        ],
                      },
                    });
                  }
                  if (toInsert.length) {
                    steps.push({
                      type: 'forEach',
                      source: toInsert.map((p) => ({ cl_id: p.cl_id, b_id: p.b_id })),
                      step: {
                        type: 'sp',
                        fn: 'assign_class_exam_sp',
                        params: [
                          0,
                          erRef ?? { ref: 'new_er_id' },
                          { refIter: 'cl_id' },
                          { refIter: 'b_id' },
                          0,
                          'insert',
                        ],
                      },
                    });
                  }
                  if (steps.length) await runBulk(steps);
                } catch (_) {
                  // Haddii bulk-ka fashilmo, ma muujineyno qalad gaar ah —
                  // exam_reg-ka ayaa horeey loo kaydiyay. User-ku waxa uu
                  // mar kale isku dayi karaa edit.
                }
              }
            }}
          >
            {entityKey === 'ExamRegister' && (
              <ExamRegClassAssignSection
                academicYearId={
                  Number(editRow?.a_y_id_sp) ||
                  Number(modal.context?.academicYearId) ||
                  null
                }
                examRegId={editRow ? Number(editRow.id) || null : null}
                value={examRegAssign}
                onChange={setExamRegAssign}
              />
            )}
          </CrudModal>
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

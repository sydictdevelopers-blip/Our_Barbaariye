import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, CheckCheck, ArrowRightLeft, XCircle, Send, GraduationCap, Layers, Building2, ArrowRight, Filter } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { makeOptionLoader } from '../../../services/api';

/**
 * Labeled filter field — small icon + caption above each Select2 so the
 * toolbar reads as a group of clearly-grouped controls instead of a row of
 * floating dropdowns. Used for all four selects in the toolbar card below.
 */
function FieldGroup({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-400" />}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}

/** Hook helper: pair of [id,label] state with a setter that takes a Select2 onChange event. */
function useSelect(initial = '') {
  const [val, setVal] = useState({ id: initial, label: '' });
  const setFromEvent = (e) => setVal({ id: e.target.value, label: e.target.label || '' });
  const reset = () => setVal({ id: '', label: '' });
  return [val.id, val.label, setFromEvent, reset];
}

/**
 * BranchTransferTab — UI shell-ka Branch Transfer.
 * Backend functions waxa diyaarinaayo user-ka. Halkan kaliya UI iyo selects.
 */
export default function BranchTransferTab() {
  const { t } = useTranslation();
  /* ── 4 main filter selects ── */
  const [classFromId, classFromLabel, setClassFrom] = useSelect();
  const [batchId,     batchLabel,     setBatch]     = useSelect();
  const [branchToId,  branchToLabel,  setBranchTo]  = useSelect();
  const [classToId,   classToLabel,   setClassTo]   = useSelect();

  /* ── Lazy loaders (server-side: 25 default + search) ── */
  const classLoader   = useMemo(() => makeOptionLoader('class_options'), []);
  const batchLoader   = useMemo(() => makeOptionLoader('batch_options'), []);
  const branchLoader  = useMemo(() => makeOptionLoader('branch_options'), []);
  const studentLoader = useMemo(() => makeOptionLoader('student_options'), []);

  /* ── Students table data (TODO: backend) ── */
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  /* ── Branch Transfer modal ── */
  const [transferOpen, setTransferOpen] = useState(false);
  const [tStudentId, tStudentLabel, setTStudent, resetTStudent] = useSelect();
  const [tBranchId,  tBranchLabel,  setTBranch,  resetTBranch]  = useSelect();
  const [tClassId,   tClassLabel,   setTClass,   resetTClass]   = useSelect();

  /* ── Action handlers (placeholders — backend la xidhaayo) ── */
  const handleShow = async () => {
    // TODO: fetch students by classFromId + batchId + classToId
    setLoadingStudents(true);
    try {
      // Placeholder: backend la xidhaayo
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAcceptTransfered = async () => {
    // TODO: accept_transfered_students_sp
  };

  const openTransferModal = () => {
    resetTStudent();
    resetTBranch();
    resetTClass();
    setTransferOpen(true);
    // Modal Select2s are lazy — no pre-fetch needed.
  };

  const closeTransferModal = () => setTransferOpen(false);

  const handleTransfer = async () => {
    // TODO: branch_transfer_sp
    closeTransferModal();
  };

  return (
    <div className="space-y-4">
      {/* ── Filter card: header + grouped selects + actions row ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        {/* Subtle accent bar */}
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />

        {/* Selects grid — labelled fields, responsive 1→4 columns */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FieldGroup icon={GraduationCap} label={t('select.classFrom', { defaultValue: 'Class (from)' })}>
            <Select2
              name="classFrom"
              value={classFromId}
              selectedLabel={classFromLabel}
              onChange={setClassFrom}
              loadOptions={classLoader}
              placeholder={t('select.class')}
            />
          </FieldGroup>
          <FieldGroup icon={Layers} label={t('select.batch', { defaultValue: 'Batch' })}>
            <Select2
              name="batch"
              value={batchId}
              selectedLabel={batchLabel}
              onChange={setBatch}
              loadOptions={batchLoader}
              placeholder={t('select.batch')}
            />
          </FieldGroup>
          <FieldGroup icon={Building2} label={t('select.branchTo', { defaultValue: 'Branch (to)' })}>
            <Select2
              name="branchTo"
              value={branchToId}
              selectedLabel={branchToLabel}
              onChange={setBranchTo}
              loadOptions={branchLoader}
              placeholder={t('select.branch')}
            />
          </FieldGroup>
          <FieldGroup icon={ArrowRight} label={t('select.classTo', { defaultValue: 'Class (to)' })}>
            <Select2
              name="classTo"
              value={classToId}
              selectedLabel={classToLabel}
              onChange={setClassTo}
              loadOptions={classLoader}
              placeholder={t('select.classTo')}
            />
          </FieldGroup>
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={handleShow}
            disabled={loadingStudents}
          >
            {t('action.show')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            onClick={handleAcceptTransfered}
          >
            {t('branchTransfer.accept')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<ArrowRightLeft className="w-4 h-4" />}
            onClick={openTransferModal}
          >
            {t('branchTransfer.branchTransfer')}
          </Button>
        </div>
      </div>

      {/* ── Students table ── */}
      <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden bg-white dark:bg-slate-900/40">
        {students.length === 0 ? (
          <div className="py-10">
            <EmptyState
              title={t('empty.noData')}
              description={t('empty.selectFilters')}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0B3C5D] text-white">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t('branchTransfer.cols.studentName')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('branchTransfer.cols.phone')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('branchTransfer.cols.gender')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('branchTransfer.cols.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.std_id ?? i} className="border-t border-slate-200/60 dark:border-slate-700/60">
                  <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{s.std_name ?? ''}</td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.phone ?? ''}</td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.gender ?? ''}</td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.balance ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Branch Transfer Modal ── */}
      <Modal
        isOpen={transferOpen}
        onClose={closeTransferModal}
        title={t('branchTransfer.branchTransferForm')}
        size="lg"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeTransferModal}>
              {t('common.close')}
            </Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleTransfer}
              disabled={!tStudentId || !tBranchId || !tClassId}
            >
              {t('action.transfer')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('select.student')}</label>
            <Select2
              name="tStudent"
              value={tStudentId}
              selectedLabel={tStudentLabel}
              onChange={setTStudent}
              loadOptions={studentLoader}
              placeholder={t('select.student')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('select.branch')}</label>
            <Select2
              name="tBranch"
              value={tBranchId}
              selectedLabel={tBranchLabel}
              onChange={setTBranch}
              loadOptions={branchLoader}
              placeholder={t('select.branch')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('select.class')}</label>
            <Select2
              name="tClass"
              value={tClassId}
              selectedLabel={tClassLabel}
              onChange={setTClass}
              loadOptions={classLoader}
              placeholder={t('select.class')}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

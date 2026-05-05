import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowDown, ArrowRightLeft, Send, XCircle, GraduationCap, UserMinus, Workflow } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import Modal from '../../../components/ui/Modal';
import { makeOptionLoader } from '../../../services/api';

/**
 * AcademicTransferTab — UI shell ee tab Academic Transfer.
 * 4 buttons → 4 modals. Backend functions waxa diyaarinaayo user-ka.
 */
/** Hook helper: pair of [id,label] state with a setter that takes a Select2 onChange event. */
function useSelect(initial = '') {
  const [val, setVal] = useState({ id: initial, label: '' });
  const setFromEvent = (e) => setVal({ id: e.target.value, label: e.target.label || '' });
  const reset = () => setVal({ id: '', label: '' });
  return [val.id, val.label, setFromEvent, reset];
}

export default function AcademicTransferTab() {
  const { t } = useTranslation();
  const transferOptions = useMemo(() => ([
    { value: 'all', label: t('transferTab.optAll') },
    { value: 'passed', label: t('transferTab.optPassed') },
    { value: 'failed', label: t('transferTab.optFailed') },
  ]), [t]);

  /* ── Lazy loaders (server-side: 25 default + search) ── */
  const classLoader   = useMemo(() => makeOptionLoader('class_options'), []);
  const academicLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);
  const studentLoader = useMemo(() => makeOptionLoader('student_options'), []);

  /* ── Banner: warning when no new academic year ── */
  // TODO: u xidh state-ka backend-ka. Hada hard-coded.
  const academicYearReady = false;

  /* ── 4 modal opens ── */
  const [openModal, setOpenModal] = useState(null); // 'studentDowngrade' | 'academicDowngrade' | 'studentTransfer' | 'academicTransfer' | null

  /* ── Student Downgrade form ── */
  const [sdStudentId, sdStudentLabel, setSdStudent, resetSdStudent] = useSelect();
  const [sdClassId,   sdClassLabel,   setSdClass,   resetSdClass]   = useSelect();
  const [sdAcademicId, sdAcademicLabel, setSdAcademic, resetSdAcademic] = useSelect();

  /* ── Academic Downgrade form ── */
  const [adClassFrom,    adClassFromLabel,    setAdClassFrom,    resetAdClassFrom]    = useSelect();
  const [adAcademicFrom, adAcademicFromLabel, setAdAcademicFrom, resetAdAcademicFrom] = useSelect();
  const [adClassTo,      adClassToLabel,      setAdClassTo,      resetAdClassTo]      = useSelect();
  const [adAcademicTo,   adAcademicToLabel,   setAdAcademicTo,   resetAdAcademicTo]   = useSelect();

  /* ── Student Transfer form ── */
  const [stStudentId,    stStudentLabel,    setStStudent,    resetStStudent]    = useSelect();
  const [stAcademicFrom, stAcademicFromLabel, setStAcademicFrom, resetStAcademicFrom] = useSelect();

  /* ── Academic Transfer form ── */
  const [atClassFrom,      atClassFromLabel,      setAtClassFrom,      resetAtClassFrom]      = useSelect();
  const [atClassTo,        atClassToLabel,        setAtClassTo,        resetAtClassTo]        = useSelect();
  const [atTransferOption, atTransferOptionLabel, setAtTransferOption, resetAtTransferOption] = useSelect();

  /* ── Modal close + reset ── */
  const closeModal = () => {
    setOpenModal(null);
    resetSdStudent(); resetSdClass(); resetSdAcademic();
    resetAdClassFrom(); resetAdAcademicFrom(); resetAdClassTo(); resetAdAcademicTo();
    resetStStudent(); resetStAcademicFrom();
    resetAtClassFrom(); resetAtClassTo(); resetAtTransferOption();
  };

  /* ── Action handlers (placeholders — backend la xidhaayo) ── */
  const handleStudentDowngrade = async () => {
    // TODO: student_downgrade_sp
    closeModal();
  };
  const handleAcademicDowngrade = async () => {
    // TODO: academic_downgrade_sp
    closeModal();
  };
  const handleStudentTransfer = async () => {
    // TODO: student_transfer_sp
    closeModal();
  };
  const handleAcademicTransfer = async () => {
    // TODO: academic_transfer_sp
    closeModal();
  };

  return (
    <div className="space-y-4">
      {/* ── Actions card: header + 4 transfer triggers ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/40">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0B3C5D]/10 dark:bg-[#0B3C5D]/30 text-[#0B3C5D] dark:text-teal-300">
            <Workflow className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('transferTab.actionsTitle', { defaultValue: 'Transfer actions' })}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 bg-slate-50/60 dark:bg-slate-800/30">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<UserMinus className="w-4 h-4" />}
            onClick={() => setOpenModal('studentDowngrade')}
          >
            {t('transferTab.studentDowngrade')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<ArrowDown className="w-4 h-4" />}
            onClick={() => setOpenModal('academicDowngrade')}
          >
            {t('transferTab.academicDowngrade')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<ArrowRightLeft className="w-4 h-4" />}
            onClick={() => setOpenModal('studentTransfer')}
          >
            {t('transferTab.studentTransfer')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<GraduationCap className="w-4 h-4" />}
            onClick={() => setOpenModal('academicTransfer')}
          >
            {t('transferTab.academicTransfer')}
          </Button>
        </div>
      </div>

      {/* ── Warning banner ── */}
      {!academicYearReady && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">{t('transferTab.warning')}</p>
            <p className="text-sm text-amber-800/90 dark:text-amber-200/80">{t('transferTab.warningDesc')}</p>
          </div>
        </div>
      )}

      {/* ── Student Downgrade Modal ── */}
      <Modal
        isOpen={openModal === 'studentDowngrade'}
        onClose={closeModal}
        title={t('transferTab.studentDowngradeForm')}
        size="md"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>{t('common.close')}</Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleStudentDowngrade}
              disabled={!sdStudentId || !sdClassId || !sdAcademicId}
            >
              {t('action.transfer')}
            </Button>
          </>
        }
      >
        <Select2
          name="sdStudent"
          value={sdStudentId}
          selectedLabel={sdStudentLabel}
          onChange={setSdStudent}
          loadOptions={studentLoader}
          placeholder={t('select.student')}
        />
        <Select2
          name="sdClass"
          value={sdClassId}
          selectedLabel={sdClassLabel}
          onChange={setSdClass}
          loadOptions={classLoader}
          placeholder={t('select.class')}
        />
        <Select2
          name="sdAcademic"
          value={sdAcademicId}
          selectedLabel={sdAcademicLabel}
          onChange={setSdAcademic}
          loadOptions={academicLoader}
          placeholder={t('select.academic')}
        />
      </Modal>

      {/* ── Academic Downgrade Modal ── */}
      <Modal
        isOpen={openModal === 'academicDowngrade'}
        onClose={closeModal}
        title={t('transferTab.academicDowngradeForm')}
        size="lg"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>{t('common.close')}</Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleAcademicDowngrade}
              disabled={!adClassFrom || !adAcademicFrom || !adClassTo || !adAcademicTo}
            >
              {t('action.transfer')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select2
            name="adClassFrom"
            value={adClassFrom}
            selectedLabel={adClassFromLabel}
            onChange={setAdClassFrom}
            loadOptions={classLoader}
            placeholder={t('select.class')}
          />
          <Select2
            name="adAcademicFrom"
            value={adAcademicFrom}
            selectedLabel={adAcademicFromLabel}
            onChange={setAdAcademicFrom}
            loadOptions={academicLoader}
            placeholder={t('select.academicFrom')}
          />
          <Select2
            name="adClassTo"
            value={adClassTo}
            selectedLabel={adClassToLabel}
            onChange={setAdClassTo}
            loadOptions={classLoader}
            placeholder={t('select.classTo')}
          />
          <Select2
            name="adAcademicTo"
            value={adAcademicTo}
            selectedLabel={adAcademicToLabel}
            onChange={setAdAcademicTo}
            loadOptions={academicLoader}
            placeholder={t('select.academicTo')}
          />
        </div>
      </Modal>

      {/* ── Student Transfer Modal ── */}
      <Modal
        isOpen={openModal === 'studentTransfer'}
        onClose={closeModal}
        title={t('transferTab.studentTransferForm')}
        size="lg"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>{t('common.close')}</Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleStudentTransfer}
              disabled={!stStudentId || !stAcademicFrom}
            >
              {t('action.transfer')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select2
            name="stStudent"
            value={stStudentId}
            selectedLabel={stStudentLabel}
            onChange={setStStudent}
            loadOptions={studentLoader}
            placeholder={t('select.student')}
          />
          <Select2
            name="stAcademicFrom"
            value={stAcademicFrom}
            selectedLabel={stAcademicFromLabel}
            onChange={setStAcademicFrom}
            loadOptions={academicLoader}
            placeholder={t('select.academicFrom')}
          />
        </div>
      </Modal>

      {/* ── Academic Transfer Modal ── */}
      <Modal
        isOpen={openModal === 'academicTransfer'}
        onClose={closeModal}
        title={t('transferTab.academicTransferForm')}
        size="lg"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>{t('common.close')}</Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleAcademicTransfer}
              disabled={!atClassFrom || !atClassTo || !atTransferOption}
            >
              {t('action.transfer')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select2
            name="atClassFrom"
            value={atClassFrom}
            selectedLabel={atClassFromLabel}
            onChange={setAtClassFrom}
            loadOptions={classLoader}
            placeholder={t('select.classFrom')}
          />
          <Select2
            name="atClassTo"
            value={atClassTo}
            selectedLabel={atClassToLabel}
            onChange={setAtClassTo}
            loadOptions={classLoader}
            placeholder={t('select.classTo')}
          />
          <div className="sm:col-span-2">
            <Select2
              name="atTransferOption"
              value={atTransferOption}
              selectedLabel={atTransferOptionLabel}
              onChange={setAtTransferOption}
              options={transferOptions}
              placeholder={t('select.transferOption')}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

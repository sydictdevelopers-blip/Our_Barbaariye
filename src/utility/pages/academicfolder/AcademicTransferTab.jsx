import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowRightLeft, Send, XCircle, GraduationCap, UserMinus } from 'lucide-react';
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
  const [transferOptions] = useState([
    { value: 'all', label: 'All Students' },
    { value: 'passed', label: 'Passed Only' },
    { value: 'failed', label: 'Failed Only' },
  ]);

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
      {/* ── Toolbar: 4 buttons (top-right) ── */}
      <div className="flex flex-wrap justify-end gap-2 px-3 py-3">
        <Button
          size="sm"
          variant="primary"
          leftIcon={<UserMinus className="w-4 h-4" />}
          onClick={() => setOpenModal('studentDowngrade')}
        >
          Student Downgrade
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<ArrowDown className="w-4 h-4" />}
          onClick={() => setOpenModal('academicDowngrade')}
        >
          Academic Downgrade
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<ArrowRightLeft className="w-4 h-4" />}
          onClick={() => setOpenModal('studentTransfer')}
        >
          Student Transfer
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<GraduationCap className="w-4 h-4" />}
          onClick={() => setOpenModal('academicTransfer')}
        >
          Academic Transfer
        </Button>
      </div>

      {/* ── Warning banner ── */}
      {!academicYearReady && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">New academic year is not created.</p>
            <p className="text-sm text-amber-800/90">Please create the academic year before transferring students.</p>
          </div>
        </div>
      )}

      {/* ── Student Downgrade Modal ── */}
      <Modal
        isOpen={openModal === 'studentDowngrade'}
        onClose={closeModal}
        title="Student Downgrade Form"
        size="md"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>Close</Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleStudentDowngrade}
              disabled={!sdStudentId || !sdClassId || !sdAcademicId}
            >
              Transfer
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
          placeholder="Select Student"
        />
        <Select2
          name="sdClass"
          value={sdClassId}
          selectedLabel={sdClassLabel}
          onChange={setSdClass}
          loadOptions={classLoader}
          placeholder="Select Class"
        />
        <Select2
          name="sdAcademic"
          value={sdAcademicId}
          selectedLabel={sdAcademicLabel}
          onChange={setSdAcademic}
          loadOptions={academicLoader}
          placeholder="Select Academic"
        />
      </Modal>

      {/* ── Academic Downgrade Modal ── */}
      <Modal
        isOpen={openModal === 'academicDowngrade'}
        onClose={closeModal}
        title="Academic Downgrade Form"
        size="lg"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>Close</Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleAcademicDowngrade}
              disabled={!adClassFrom || !adAcademicFrom || !adClassTo || !adAcademicTo}
            >
              Transfer
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
            placeholder="Select Class"
          />
          <Select2
            name="adAcademicFrom"
            value={adAcademicFrom}
            selectedLabel={adAcademicFromLabel}
            onChange={setAdAcademicFrom}
            loadOptions={academicLoader}
            placeholder="Select academic From"
          />
          <Select2
            name="adClassTo"
            value={adClassTo}
            selectedLabel={adClassToLabel}
            onChange={setAdClassTo}
            loadOptions={classLoader}
            placeholder="Select Class To"
          />
          <Select2
            name="adAcademicTo"
            value={adAcademicTo}
            selectedLabel={adAcademicToLabel}
            onChange={setAdAcademicTo}
            loadOptions={academicLoader}
            placeholder="Select Academic To"
          />
        </div>
      </Modal>

      {/* ── Student Transfer Modal ── */}
      <Modal
        isOpen={openModal === 'studentTransfer'}
        onClose={closeModal}
        title="Student Transfer Form"
        size="lg"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>Close</Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleStudentTransfer}
              disabled={!stStudentId || !stAcademicFrom}
            >
              Transfer
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
            placeholder="Select Student"
          />
          <Select2
            name="stAcademicFrom"
            value={stAcademicFrom}
            selectedLabel={stAcademicFromLabel}
            onChange={setStAcademicFrom}
            loadOptions={academicLoader}
            placeholder="Select academic From"
          />
        </div>
      </Modal>

      {/* ── Academic Transfer Modal ── */}
      <Modal
        isOpen={openModal === 'academicTransfer'}
        onClose={closeModal}
        title="Academic Transfer Form"
        size="lg"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>Close</Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleAcademicTransfer}
              disabled={!atClassFrom || !atClassTo || !atTransferOption}
            >
              Transfer
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
            placeholder="Select Class From"
          />
          <Select2
            name="atClassTo"
            value={atClassTo}
            selectedLabel={atClassToLabel}
            onChange={setAtClassTo}
            loadOptions={classLoader}
            placeholder="Select Class To"
          />
          <div className="sm:col-span-2">
            <Select2
              name="atTransferOption"
              value={atTransferOption}
              selectedLabel={atTransferOptionLabel}
              onChange={setAtTransferOption}
              options={transferOptions}
              placeholder="Select Transfer option"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

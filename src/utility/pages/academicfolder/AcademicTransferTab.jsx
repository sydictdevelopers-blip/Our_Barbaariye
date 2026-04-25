import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowRightLeft, Send, XCircle, GraduationCap, UserMinus } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import Modal from '../../../components/ui/Modal';
import { fetchSelectOptions } from '../../../services/api';

/**
 * AcademicTransferTab — UI shell ee tab Academic Transfer.
 * 4 buttons → 4 modals. Backend functions waxa diyaarinaayo user-ka.
 */
export default function AcademicTransferTab() {
  /* ── Shared option lists ── */
  const [classOptions, setClassOptions] = useState([]);
  const [academicOptions, setAcademicOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [transferOptions] = useState([
    { value: 'all', label: 'All Students' },
    { value: 'passed', label: 'Passed Only' },
    { value: 'failed', label: 'Failed Only' },
  ]);

  /* ── Banner: warning when no new academic year ── */
  // TODO: u xidh state-ka backend-ka. Hada hard-coded.
  const academicYearReady = false;

  /* ── 4 modal opens ── */
  const [openModal, setOpenModal] = useState(null); // 'studentDowngrade' | 'academicDowngrade' | 'studentTransfer' | 'academicTransfer' | null

  /* ── Student Downgrade form ── */
  const [sdStudentId, setSdStudentId] = useState('');
  const [sdClassId, setSdClassId] = useState('');
  const [sdAcademicId, setSdAcademicId] = useState('');

  /* ── Academic Downgrade form ── */
  const [adClassFrom, setAdClassFrom] = useState('');
  const [adAcademicFrom, setAdAcademicFrom] = useState('');
  const [adClassTo, setAdClassTo] = useState('');
  const [adAcademicTo, setAdAcademicTo] = useState('');

  /* ── Student Transfer form ── */
  const [stStudentId, setStStudentId] = useState('');
  const [stAcademicFrom, setStAcademicFrom] = useState('');

  /* ── Academic Transfer form ── */
  const [atClassFrom, setAtClassFrom] = useState('');
  const [atClassTo, setAtClassTo] = useState('');
  const [atTransferOption, setAtTransferOption] = useState('');

  /* Load options on mount */
  useEffect(() => {
    let cancelled = false;
    const mapPair = (rows, vKey, lKey) =>
      rows.map((r) => ({ value: String(r[vKey] ?? ''), label: String(r[lKey] ?? r[vKey] ?? '') }));

    fetchSelectOptions('class_options', 500, '')
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data ?? res?.rows ?? [];
        setClassOptions(mapPair(rows, 'cl_id', 'class'));
      })
      .catch(() => setClassOptions([]));

    fetchSelectOptions('academicYeartab', 200, '')
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data ?? res?.rows ?? [];
        const valueKey = rows[0] && ('id' in rows[0] ? 'id' : Object.keys(rows[0])[0]);
        const labelKey = rows[0] && ('name' in rows[0] ? 'name' : Object.keys(rows[0])[1] || valueKey);
        setAcademicOptions(rows.map((r) => ({ value: String(r[valueKey] ?? ''), label: String(r[labelKey] ?? '') })));
      })
      .catch(() => setAcademicOptions([]));

    fetchSelectOptions('student_options', 500, '')
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data ?? res?.rows ?? [];
        const valueKey = rows[0] && ('std_id' in rows[0] ? 'std_id' : Object.keys(rows[0])[0]);
        const labelKey = rows[0] && ('std_name' in rows[0] ? 'std_name' : Object.keys(rows[0])[1] || valueKey);
        setStudentOptions(rows.map((r) => ({ value: String(r[valueKey] ?? ''), label: String(r[labelKey] ?? '') })));
      })
      .catch(() => setStudentOptions([]));

    return () => { cancelled = true; };
  }, []);

  /* ── Modal close + reset ── */
  const closeModal = () => {
    setOpenModal(null);
    setSdStudentId(''); setSdClassId(''); setSdAcademicId('');
    setAdClassFrom(''); setAdAcademicFrom(''); setAdClassTo(''); setAdAcademicTo('');
    setStStudentId(''); setStAcademicFrom('');
    setAtClassFrom(''); setAtClassTo(''); setAtTransferOption('');
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
          onChange={(e) => setSdStudentId(e.target.value)}
          options={studentOptions}
          placeholder="Select Student"
        />
        <Select2
          name="sdClass"
          value={sdClassId}
          onChange={(e) => setSdClassId(e.target.value)}
          options={classOptions}
          placeholder="Select Class"
        />
        <Select2
          name="sdAcademic"
          value={sdAcademicId}
          onChange={(e) => setSdAcademicId(e.target.value)}
          options={academicOptions}
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
            onChange={(e) => setAdClassFrom(e.target.value)}
            options={classOptions}
            placeholder="Select Class"
          />
          <Select2
            name="adAcademicFrom"
            value={adAcademicFrom}
            onChange={(e) => setAdAcademicFrom(e.target.value)}
            options={academicOptions}
            placeholder="Select academic From"
          />
          <Select2
            name="adClassTo"
            value={adClassTo}
            onChange={(e) => setAdClassTo(e.target.value)}
            options={classOptions}
            placeholder="Select Class To"
          />
          <Select2
            name="adAcademicTo"
            value={adAcademicTo}
            onChange={(e) => setAdAcademicTo(e.target.value)}
            options={academicOptions}
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
            onChange={(e) => setStStudentId(e.target.value)}
            options={studentOptions}
            placeholder="Select Student"
          />
          <Select2
            name="stAcademicFrom"
            value={stAcademicFrom}
            onChange={(e) => setStAcademicFrom(e.target.value)}
            options={academicOptions}
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
            onChange={(e) => setAtClassFrom(e.target.value)}
            options={classOptions}
            placeholder="Select Class From"
          />
          <Select2
            name="atClassTo"
            value={atClassTo}
            onChange={(e) => setAtClassTo(e.target.value)}
            options={classOptions}
            placeholder="Select Class To"
          />
          <div className="sm:col-span-2">
            <Select2
              name="atTransferOption"
              value={atTransferOption}
              onChange={(e) => setAtTransferOption(e.target.value)}
              options={transferOptions}
              placeholder="Select Transfer option"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

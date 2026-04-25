import { useEffect, useState } from 'react';
import { Eye, CheckCheck, ArrowRightLeft, XCircle, Send } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { fetchSelectOptions } from '../../../services/api';

/**
 * BranchTransferTab — UI shell-ka Branch Transfer.
 * Backend functions waxa diyaarinaayo user-ka. Halkan kaliya UI iyo selects.
 */
export default function BranchTransferTab() {
  /* ── 4 main filter selects ── */
  const [classFromId, setClassFromId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [branchToId, setBranchToId] = useState('');
  const [classToId, setClassToId] = useState('');

  /* ── Options ── */
  const [classOptions, setClassOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);

  /* ── Students table data (TODO: backend) ── */
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  /* ── Branch Transfer modal ── */
  const [transferOpen, setTransferOpen] = useState(false);
  const [studentOptions, setStudentOptions] = useState([]);
  const [tStudentId, setTStudentId] = useState('');
  const [tBranchId, setTBranchId] = useState('');
  const [tClassId, setTClassId] = useState('');

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
        setBatchOptions(rows.map((r) => ({ value: String(r[valueKey] ?? ''), label: String(r[labelKey] ?? '') })));
      })
      .catch(() => setBatchOptions([]));

    fetchSelectOptions('branch_options', 200, '')
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data ?? res?.rows ?? [];
        setBranchOptions(mapPair(rows, 'br_id', 'br_name'));
      })
      .catch(() => setBranchOptions([]));

    return () => { cancelled = true; };
  }, []);

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

  const openTransferModal = async () => {
    setTransferOpen(true);
    setTStudentId('');
    setTBranchId('');
    setTClassId('');
    // Fetch student options for the modal (TODO: confirm query name)
    try {
      const res = await fetchSelectOptions('student_options', 500, '');
      const rows = res?.data ?? res?.rows ?? [];
      const valueKey = rows[0] && ('std_id' in rows[0] ? 'std_id' : Object.keys(rows[0])[0]);
      const labelKey = rows[0] && ('std_name' in rows[0] ? 'std_name' : Object.keys(rows[0])[1] || valueKey);
      setStudentOptions(rows.map((r) => ({ value: String(r[valueKey] ?? ''), label: String(r[labelKey] ?? '') })));
    } catch {
      setStudentOptions([]);
    }
  };

  const closeTransferModal = () => setTransferOpen(false);

  const handleTransfer = async () => {
    // TODO: branch_transfer_sp
    closeTransferModal();
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar: 4 selects + 3 buttons ── */}
      <div className="flex flex-wrap items-end gap-2 px-3 py-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
        <div className="min-w-[160px] flex-1">
          <Select2
            name="classFrom"
            value={classFromId}
            onChange={(e) => setClassFromId(e.target.value)}
            options={classOptions}
            placeholder="Select Class"
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <Select2
            name="batch"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            options={batchOptions}
            placeholder="Select Batch"
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <Select2
            name="branchTo"
            value={branchToId}
            onChange={(e) => setBranchToId(e.target.value)}
            options={branchOptions}
            placeholder="Select Branch"
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <Select2
            name="classTo"
            value={classToId}
            onChange={(e) => setClassToId(e.target.value)}
            options={classOptions}
            placeholder="Select Class To"
          />
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Eye className="w-4 h-4" />}
          onClick={handleShow}
          disabled={loadingStudents}
        >
          Show
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<CheckCheck className="w-4 h-4" />}
          onClick={handleAcceptTransfered}
        >
          Accept Transfered Students
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<ArrowRightLeft className="w-4 h-4" />}
          onClick={openTransferModal}
        >
          Branch Transfer
        </Button>
      </div>

      {/* ── Students table ── */}
      <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden bg-white dark:bg-slate-900/40">
        {students.length === 0 ? (
          <div className="py-10">
            <EmptyState
              title="Wax xog ah ma jiraan"
              description="Dooro filter-yada kor ku yaal, kadibna riix Show."
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0B3C5D] text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Student Name</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Gender</th>
                <th className="px-4 py-3 text-left font-semibold">Balance</th>
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
        title="Branch Transfer Form"
        size="lg"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeTransferModal}>
              Close
            </Button>
            <Button
              variant="primary"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleTransfer}
              disabled={!tStudentId || !tBranchId || !tClassId}
            >
              Transfer
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Student</label>
            <Select2
              name="tStudent"
              value={tStudentId}
              onChange={(e) => setTStudentId(e.target.value)}
              options={studentOptions}
              placeholder="Select Student"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Branch</label>
            <Select2
              name="tBranch"
              value={tBranchId}
              onChange={(e) => setTBranchId(e.target.value)}
              options={branchOptions}
              placeholder="Select Branch"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Class</label>
            <Select2
              name="tClass"
              value={tClassId}
              onChange={(e) => setTClassId(e.target.value)}
              options={classOptions}
              placeholder="Select Class"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

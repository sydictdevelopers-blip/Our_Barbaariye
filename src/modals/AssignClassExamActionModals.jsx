import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncSelect from 'react-select/async';
import Modal from '../components/ui/Modal';
import Select2 from '../components/ui/Select2';
import Button from '../components/ui/Button';
import {
  crud,
  makeOptionLoader,
  fetchDataPaginated,
  getSessionUBrIdNum,
  getSessionBrIdNum,
} from '../services/api';
import { swalSuccess, swalError } from '../utils/swal';

// Style oo lala socda multi-select-ka modal-ka — la mid Select2.
const multiSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '12px',
    borderColor: state.isFocused ? '#0f3d5e' : 'rgb(226 232 240)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(15, 61, 94, 0.2)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#0f3d5e' : 'rgb(203 213 225)' },
  }),
  menu: (base) => ({ ...base, zIndex: 9999, borderRadius: '12px' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'rgb(241 245 249)',
    border: '1px solid rgb(226 232 240)',
    borderRadius: '6px',
  }),
  multiValueLabel: (base) => ({ ...base, color: 'rgb(30 41 59)' }),
};

// Custom action modals for the "Assign Class Exam" tab.
// Generate / Exam State / Remove By Class / Remove By Exam — sida sawirka.
// Dhammaantood waxay isticmaalaan SP-yada hore u jira:
//   - assign_class_exam_sp(a_c_e_id, er_id, cl_id, b_id, u_br_id, op)  → insert/update/delete
//   - add_assing_class_exam_show(academic, branch)                     → list classes
// Hawl-galka run-time-ka waxay ku salaysan tahay loop-yo aside-ka SP-yada hore u jira.

const FieldLabel = ({ children }) => (
  <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
    {children}
  </label>
);

const ModalShell = ({ isOpen, onClose, title, footer, children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    header={
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight truncate">
        {title}
      </h2>
    }
    size="md"
    footer={footer}
  >
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4"
    >
      {children}
    </form>
  </Modal>
);

/* ─────────────────── Generate Exam Form ─────────────────── */
// Generate dhowr exam (multi-select) → dhammaan class-yada batch + academic-ka
// la doortay. Per (cl_id, b_id, er_id) waxaa la wacaa
// assign_class_exam_sp(0, er_id, cl_id, b_id, u_br_id, 'insert').
// Ka dib guul, parent-ku wuxuu muujiyaa table-ka Show All si user-ku u arko
// natiijada cusub.
export function GenerateExamFormModal({ isOpen, onClose, onSuccess, context }) {
  const { t } = useTranslation();
  const [ay, setAy] = useState({ id: '', label: '' });
  const [exams, setExams] = useState([]); // multi-select: array of {value,label}
  const [b, setB] = useState({ id: '', label: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAy({ id: context?.academicYearId || '', label: '' });
    setExams([]);
    setB({ id: '', label: '' });
  }, [isOpen, context]);

  // Marka academic-ku beddelo, ka saar exam-yada iyo batch-ga hore — way
  // suuragal noqon kartaa inay stale yihiin (ku xidh academic kale).
  useEffect(() => {
    setExams([]);
    setB({ id: '', label: '' });
  }, [ay.id]);

  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);
  const examLoader = useMemo(
    () => makeOptionLoader('exam_reg_options', () => ({ ...(ay.id && { academicYearId: ay.id }) })),
    [ay.id]
  );
  // Batch loader-ku kaliya wuxuu soo celiyaa batches-ka academic-ka la doortay
  // ee leh students. Ku xidh ay.id si markii uu academic-ku beddelo, batches-ka
  // dropdown-ka uu si toos ah u cusbooneysiiyo.
  const batchLoader = useMemo(
    () =>
      makeOptionLoader('batch_by_academic_options', () => ({
        ...(ay.id && { academicYearId: ay.id }),
      })),
    [ay.id]
  );

  const handleGenerate = async () => {
    if (!ay.id) return swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
    if (!exams.length) return swalError('Fadlan dooro ugu yaraan hal Exam', '');
    if (!b.id) return swalError('Fadlan dooro Batch', '');
    setBusy(true);
    try {
      const res = await fetchDataPaginated({
        queryName: 'add_assing_class_exam_show',
        page: 1,
        limit: 1000,
        academicYearId: ay.id,
      });
      const classes = (res?.data || []).filter(
        (r) =>
          r.cl_id != null &&
          r.Result == null &&
          String(r.b_id) === String(b.id)
      );
      if (!classes.length) {
        swalError('Wax classes ah lama helin', 'Academic + Batch-kaas ma jiraan students.');
        return;
      }
      const u_br_id = getSessionUBrIdNum();
      const totalPairs = classes.length * exams.length;
      let ok = 0;
      let firstErr = '';
      for (const c of classes) {
        for (const ex of exams) {
          const erId = Number(ex?.value) || 0;
          if (!erId) continue;
          try {
            await crud({
              operation: 'insert',
              fn: 'assign_class_exam_sp',
              params: {
                a_c_e_id_sp: 0,
                er_id_sp: erId,
                cl_id_sp: Number(c.cl_id) || 0,
                b_id_sp: Number(c.b_id) || 0,
                u_br_id_sp: u_br_id,
              },
            });
            ok += 1;
          } catch (e) {
            if (!firstErr) firstErr = e?.message || String(e);
          }
        }
      }
      if (ok > 0) {
        await swalSuccess(
          'Waa la guulaystey',
          `${ok} / ${totalPairs} (class × exam) ayaa loo abuuray`
        );
        onSuccess?.({ academicYearId: ay.id, academicYearLabel: ay.label });
        onClose?.();
      } else {
        swalError(firstErr || 'Khalad ayaa dhacay', '');
      }
    } catch (err) {
      swalError(err?.message || 'Khalad ayaa dhacay', '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Exam Form"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" onClick={handleGenerate} disabled={busy}>
            {busy ? '...' : 'Generate'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div>
        <FieldLabel>Academic Year</FieldLabel>
        <Select2
          value={ay.id}
          selectedLabel={ay.label}
          onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={acadLoader}
          placeholder="Select Academic Year"
        />
      </div>
      <div>
        <FieldLabel>Exam</FieldLabel>
        <AsyncSelect
          // key remount-yaa marka academic uu beddelo, sidaas darteed
          // defaultOptions waxay ka soo qaadaan filter-ka cusub.
          key={`er-${ay.id || 'none'}`}
          isMulti
          cacheOptions={false}
          defaultOptions
          loadOptions={examLoader}
          value={exams}
          onChange={(arr) => setExams(arr || [])}
          placeholder="Select Exam"
          isDisabled={!ay.id}
          styles={multiSelectStyles}
          classNamePrefix="select2"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          menuPosition="fixed"
          menuPlacement="auto"
          getOptionValue={(opt) => opt?.value}
          getOptionLabel={(opt) =>
            opt?.label != null ? String(opt.label) : String(opt?.value ?? '')
          }
        />
      </div>
      <div key={`b-${ay.id || 'none'}`}>
        <FieldLabel>Batch</FieldLabel>
        <Select2
          value={b.id}
          selectedLabel={b.label}
          onChange={(e) => setB({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={batchLoader}
          placeholder="Select Batch"
          isDisabled={!ay.id}
        />
      </div>
    </ModalShell>
  );
}

/* ─────────────────── Exam State Form ─────────────────── */
// Cusbooneysiinta state-ka (Active/Inactive) ee dhammaan assign-yada exam-ka
// la doortay ee academic-kaas. Backend-ka wuxuu u baahan yahay SP cusub
// (assign_class_exam_state_sp) — haatan waxa la sameeyaa fetch + loop update
// loo isticmaalo assign_class_exam_sp(id, er_id, cl_id, b_id, u_br_id, 'update').
export function ExamStateFormModal({ isOpen, onClose, onSuccess, context }) {
  const { t } = useTranslation();
  const [ay, setAy] = useState({ id: '', label: '' });
  const [er, setEr] = useState({ id: '', label: '' });
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAy({ id: context?.academicYearId || '', label: '' });
    setEr({ id: '', label: '' });
    setState('');
  }, [isOpen, context]);

  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);
  const examLoader = useMemo(
    () => makeOptionLoader('exam_reg_options', () => ({ ...(ay.id && { academicYearId: ay.id }) })),
    [ay.id]
  );

  const handleUpdate = async () => {
    if (!ay.id) return swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
    if (!er.id) return swalError('Fadlan dooro Exam', '');
    if (!state) return swalError('Fadlan dooro State', '');
    swalError(
      'Backend SP ma jiro',
      'Si state-ka loogu cusbooneysiiyo, abuur "assign_class_exam_state_sp(a_y_id, er_id, state, u_br_id)" oo ku xidh frontend-kan.'
    );
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Exam state Form"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" onClick={handleUpdate} disabled={busy}>
            {busy ? '...' : 'Update'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div>
        <FieldLabel>Academic</FieldLabel>
        <Select2
          value={ay.id}
          selectedLabel={ay.label}
          onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={acadLoader}
          placeholder="Select academic"
        />
      </div>
      <div>
        <FieldLabel>Exam</FieldLabel>
        <Select2
          value={er.id}
          selectedLabel={er.label}
          onChange={(e) => setEr({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={examLoader}
          placeholder="Select Exam"
          isDisabled={!ay.id}
        />
      </div>
      <div>
        <FieldLabel>State</FieldLabel>
        <Select2
          value={state}
          onChange={(e) => setState(e.target.value)}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
          placeholder="Select State"
          isSearchable={false}
        />
      </div>
    </ModalShell>
  );
}

/* ─────────────────── Remove By Class ─────────────────── */
// Tirtir dhammaan assign-yada class+batch+academic+exam-ka la doortay
// adoo isticmaalaya remove_assign_class_byclass_sp(cl, b, a_y, ex, u_br).
// Batch dropdown-ka waxaa filter-yay class-ka, Exam-na waxaa filter-yay
// (cl, b, a_y) — kaliya exams-ka u dhigma ayaa muuqda.
export function RemoveByClassModal({ isOpen, onClose, onSuccess, context }) {
  const { t } = useTranslation();
  const [cl, setCl] = useState({ id: '', label: '' });
  const [b, setB] = useState({ id: '', label: '' });
  const [ay, setAy] = useState({ id: '', label: '' });
  const [ex, setEx] = useState({ id: '', label: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCl({ id: context?.cl_id || '', label: '' });
    setB({ id: context?.b_id || '', label: '' });
    setAy({ id: context?.academicYearId || '', label: '' });
    setEx({ id: '', label: '' });
  }, [isOpen, context]);

  // Marka class-ku beddelo, ka saar batch + exam — way kala duwan yihiin.
  useEffect(() => {
    setB({ id: '', label: '' });
    setEx({ id: '', label: '' });
  }, [cl.id]);
  // Marka batch ama academic uu beddelo, ka saar exam.
  useEffect(() => {
    setEx({ id: '', label: '' });
  }, [b.id, ay.id]);

  const classLoader = useMemo(() => makeOptionLoader('class_simple_options'), []);
  const batchLoader = useMemo(
    () =>
      makeOptionLoader('batch_options', () => ({
        ...(cl.id && { cl_id: cl.id }),
      })),
    [cl.id]
  );
  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);
  // Exam loader: (cl_id, b_id, academicYearId) — kaliya exams-ka u assigned
  // class-kan + batch-kan + academic-kan ayaa muuqda.
  const examLoader = useMemo(
    () =>
      makeOptionLoader('exam_by_class_options', () => ({
        ...(cl.id && { cl_id: cl.id }),
        ...(b.id && { b_id: b.id }),
        ...(ay.id && { academicYearId: ay.id }),
      })),
    [cl.id, b.id, ay.id]
  );

  const handleRemove = async () => {
    if (!cl.id) return swalError('Fadlan dooro Class', '');
    if (!b.id) return swalError('Fadlan dooro Batch', '');
    if (!ay.id) return swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
    if (!ex.id) return swalError('Fadlan dooro Exam', '');
    setBusy(true);
    try {
      const u_br_id = getSessionUBrIdNum();
      const br_id = getSessionBrIdNum();
      const result = await crud({
        operation: 'delete',
        fn: 'remove_assign_class_byclass_sp',
        params: {
          cl_id_sp: Number(cl.id) || 0,
          b_id_sp: Number(b.id) || 0,
          a_y_id_sp: Number(ay.id) || 0,
          ex_id_sp: Number(ex.id) || 0,
          u_br_id_sp: u_br_id,
          br_id_sp: br_id,
        },
      });
      await swalSuccess('Waa la guulaystey', result?.message || '');
      onSuccess?.({ academicYearId: ay.id, academicYearLabel: ay.label });
      onClose?.();
    } catch (err) {
      swalError(err?.message || 'Khalad ayaa dhacay', '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Remove Assign Class Exam By Class"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" onClick={handleRemove} disabled={busy}>
            {busy ? '...' : 'Remove'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div>
        <FieldLabel>Class</FieldLabel>
        <Select2
          value={cl.id}
          selectedLabel={cl.label}
          onChange={(e) => setCl({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={classLoader}
          placeholder="Select Class"
        />
      </div>
      <div key={`b-${cl.id || 'none'}`}>
        <FieldLabel>Batch</FieldLabel>
        <Select2
          value={b.id}
          selectedLabel={b.label}
          onChange={(e) => setB({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={batchLoader}
          placeholder="Select Batch"
          isDisabled={!cl.id}
        />
      </div>
      <div>
        <FieldLabel>Academic Year</FieldLabel>
        <Select2
          value={ay.id}
          selectedLabel={ay.label}
          onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={acadLoader}
          placeholder="Select Academic Year"
        />
      </div>
      <div key={`ex-${cl.id}-${b.id}-${ay.id}`}>
        <FieldLabel>Exam</FieldLabel>
        <Select2
          value={ex.id}
          selectedLabel={ex.label}
          onChange={(e) => setEx({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={examLoader}
          placeholder="Select Exam"
          isDisabled={!cl.id || !b.id || !ay.id}
        />
      </div>
    </ModalShell>
  );
}

/* ─────────────────── Remove By Exam ─────────────────── */
// Tirtir dhammaan class-yada lagu xidhay exam la doortay (academic-kaas)
// adoo isticmaalaya remove_assign_class_byexam_sp(a_y_id, ex_id, u_br_id).
// Exam dropdown-ka waxaa filter-yay academic-ka — kaliya exams-ka leh
// exam_reg academic-kaas + branch-ka user-ka ayaa muuqda.
export function RemoveByExamModal({ isOpen, onClose, onSuccess, context }) {
  const { t } = useTranslation();
  const [ay, setAy] = useState({ id: '', label: '' });
  const [ex, setEx] = useState({ id: '', label: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAy({ id: context?.academicYearId || '', label: '' });
    setEx({ id: '', label: '' });
  }, [isOpen, context]);

  // Academic uu beddelo → ka saar exam.
  useEffect(() => {
    setEx({ id: '', label: '' });
  }, [ay.id]);

  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);
  const examLoader = useMemo(
    () =>
      makeOptionLoader('exam_by_academic_options', () => ({
        ...(ay.id && { academicYearId: ay.id }),
      })),
    [ay.id]
  );

  const handleRemove = async () => {
    if (!ay.id) return swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
    if (!ex.id) return swalError('Fadlan dooro Exam', '');
    setBusy(true);
    try {
      const u_br_id = getSessionUBrIdNum();
      const br_id = getSessionBrIdNum();
      const result = await crud({
        operation: 'delete',
        fn: 'remove_assign_class_byexam_sp',
        params: {
          a_y_id_sp: Number(ay.id) || 0,
          ex_id_sp: Number(ex.id) || 0,
          u_br_id_sp: u_br_id,
          br_id_sp: br_id,
        },
      });
      await swalSuccess('Waa la guulaystey', result?.message || '');
      onSuccess?.({ academicYearId: ay.id, academicYearLabel: ay.label });
      onClose?.();
    } catch (err) {
      swalError(err?.message || 'Khalad ayaa dhacay', '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Remove Assign Class Exam By Exam"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" onClick={handleRemove} disabled={busy}>
            {busy ? '...' : 'Remove'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div>
        <FieldLabel>Academic Year</FieldLabel>
        <Select2
          value={ay.id}
          selectedLabel={ay.label}
          onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={acadLoader}
          placeholder="Select Academic Year"
        />
      </div>
      <div key={`ex-${ay.id || 'none'}`}>
        <FieldLabel>Exam</FieldLabel>
        <Select2
          value={ex.id}
          selectedLabel={ex.label}
          onChange={(e) => setEx({ id: e.target.value, label: e.target.label || '' })}
          loadOptions={examLoader}
          placeholder="Select Exam"
          isDisabled={!ay.id}
        />
      </div>
    </ModalShell>
  );
}

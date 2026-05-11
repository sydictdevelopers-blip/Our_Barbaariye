import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, GraduationCap, Layers, User } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Select2 from '../components/ui/Select2';
import { makeOptionLoader, crud, getSessionUBrIdNum } from '../services/api';
import { swalSuccess, swalError } from '../utils/swal';

/**
 * ClassUpdateModal — change a single student's class.
 *
 * Backed by `student_class_change_sp(p_std_id, p_cl_id, p_b_id, p_u_br_id)`,
 * which UPDATES the student's existing `student_class` row in place (state =
 * 'Continue') instead of inserting a new one. That keeps the table at one row
 * per active student while still letting the user move them to any class.
 *
 * Only "Continue" students are eligible. The dropdown uses
 * `all_student_options` (already filtered to active students by SP).
 */
export default function ClassUpdateModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const initial = {
    std_id: '', std_label: '',
    cl_id: '',  cl_label: '',
    b_id: '',   b_label: '',
  };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initial);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const studentLoader = useMemo(
    () => makeOptionLoader('all_student_options', null, { valueKey: 'std_id', labelKey: 'p_name' }),
    []
  );
  const classLoader = useMemo(() => makeOptionLoader('class_options'), []);
  // Batch dropdown is keyed on the picked class so we always re-fetch when
  // the target class changes (a stale list from the previous class would
  // include batches that don't belong to the new one).
  const batchLoader = useMemo(
    () => makeOptionLoader('batch_options', () => ({ cl_id: form.cl_id })),
    [form.cl_id]
  );

  const setStudent = (e) => {
    setForm((p) => ({ ...p, std_id: e.target.value ?? '', std_label: e.target.label ?? '' }));
    if (errors.std_id) setErrors((p) => ({ ...p, std_id: '' }));
  };
  const setClass = (e) => {
    // Class change clears the batch — the new class likely has different batches.
    setForm((p) => ({
      ...p,
      cl_id: e.target.value ?? '',
      cl_label: e.target.label ?? '',
      b_id: '',
      b_label: '',
    }));
    if (errors.cl_id) setErrors((p) => ({ ...p, cl_id: '' }));
  };
  const setBatch = (e) => {
    setForm((p) => ({ ...p, b_id: e.target.value ?? '', b_label: e.target.label ?? '' }));
    if (errors.b_id) setErrors((p) => ({ ...p, b_id: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.std_id) e.std_id = t('classUpdateModal.errStudentRequired');
    if (!form.cl_id)  e.cl_id  = t('classUpdateModal.errClassRequired');
    if (!form.b_id)   e.b_id   = t('classUpdateModal.errBatchRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await crud({
        operation: 'update',
        fn: 'student_class_change_sp',
        params: {
          p_std_id:  Number(form.std_id) || 0,
          p_cl_id:   Number(form.cl_id)  || 0,
          p_b_id:    Number(form.b_id)   || 0,
          p_u_br_id: getSessionUBrIdNum(),
        },
      });
      await swalSuccess('', res?.message || t('classUpdateModal.success'));
      onSuccess?.();
      onClose();
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || t('classUpdateModal.errSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(initial);
    setErrors({});
    onClose();
  };

  const FieldWrap = ({ icon: Icon, label, htmlFor, error, children }) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0B3C5D] dark:text-teal-300">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header={
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight truncate">
            {t('classUpdateModal.title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {t('classUpdateModal.subtitle')}
          </p>
        </div>
      }
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full flex-wrap">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            {t('common.close')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? '…' : t('common.save')}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        className="space-y-4"
      >
        <FieldWrap icon={User} label={t('classUpdateModal.student')} htmlFor="cu-std" error={errors.std_id}>
          <Select2
            inputId="cu-std"
            name="std_id"
            value={form.std_id}
            selectedLabel={form.std_label}
            loadOptions={studentLoader}
            onChange={setStudent}
            placeholder={t('classUpdateModal.selectStudent')}
            isClearable={false}
          />
        </FieldWrap>

        {/* Visual hint: target = new class assignment */}
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 pt-1">
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <ArrowRight className="w-3.5 h-3.5" />
          <span>{t('classUpdateModal.target')}</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldWrap icon={GraduationCap} label={t('classUpdateModal.newClass')} htmlFor="cu-cl" error={errors.cl_id}>
            <Select2
              inputId="cu-cl"
              name="cl_id"
              value={form.cl_id}
              selectedLabel={form.cl_label}
              loadOptions={classLoader}
              onChange={setClass}
              placeholder={t('classUpdateModal.selectClass')}
              isClearable={false}
            />
          </FieldWrap>
          <FieldWrap icon={Layers} label={t('classUpdateModal.newBatch')} htmlFor="cu-b" error={errors.b_id}>
            <Select2
              key={`cu-b-${form.cl_id}`}
              inputId="cu-b"
              name="b_id"
              value={form.b_id}
              selectedLabel={form.b_label}
              loadOptions={batchLoader}
              onChange={setBatch}
              isDisabled={!form.cl_id}
              placeholder={form.cl_id ? t('classUpdateModal.selectBatch') : t('classUpdateModal.pickClassFirst')}
              isClearable={false}
            />
          </FieldWrap>
        </div>
      </form>
    </Modal>
  );
}

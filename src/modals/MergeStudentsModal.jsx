import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Select2 from '../components/ui/Select2';
import { makeOptionLoader } from '../services/api';
import { swalSuccess, swalError, swalConfirm } from '../utils/swal';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export default function MergeStudentsModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const initialForm = {
    std_frm: '',
    std_frm_label: '',
    std_to: '',
    std_to_label: '',
  };
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setErrors({});
    }
  }, [isOpen]);

  const loadFromStudentOptions = useMemo(
    () => makeOptionLoader('all_student_options', null, { valueKey: 'std_id', labelKey: 'p_name' }),
    []
  );
  const loadToStudentOptions = useMemo(
    () => makeOptionLoader('all_students_options', null, { valueKey: 'std_id', labelKey: 'p_name' }),
    []
  );

  const validate = () => {
    const e = {};
    if (!form.std_frm) e.std_frm = t('mergeStudents.studentRequired');
    if (!form.std_to) e.std_to = t('mergeStudents.targetRequired');
    if (form.std_frm && form.std_to && form.std_frm === form.std_to) {
      e.std_to = t('mergeStudents.sameStudent');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const ok = await swalConfirm({
      title: t('mergeStudents.confirmTitle'),
      text: t('mergeStudents.confirmText'),
      confirmText: t('swal.buttons.yesDelete'),
    });
    if (!ok) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fn: 'student_marge_sp',
          std_frm: Number(form.std_frm),
          std_to: Number(form.std_to),
          oper: 'update',
        }),
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(text || 'Failed');
      await swalSuccess('', text || 'OK');
      onSuccess?.();
      onClose();
    } catch (err) {
      swalError(t('swal.titles.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setErrors({});
    onClose();
  };

  const FieldWrap = ({ label, htmlFor, error, children }) => (
    <div className="space-y-1">
      {label && <label htmlFor={htmlFor} className="block text-sm font-medium text-emerald-700 dark:text-emerald-400">{label}</label>}
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header={
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight truncate">
          {t('mergeStudents.title')}
        </h2>
      }
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full flex-wrap">
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? '...' : t('mergeStudents.save')}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('mergeStudents.close')}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <FieldWrap label={t('mergeStudents.student')} htmlFor="merge-std-frm" error={errors.std_frm}>
          <Select2
            inputId="merge-std-frm"
            name="std_frm"
            value={form.std_frm}
            selectedLabel={form.std_frm_label}
            loadOptions={loadFromStudentOptions}
            onChange={(e) => setForm((p) => ({ ...p, std_frm: e.target.value ?? '', std_frm_label: e.target.label ?? '' }))}
            placeholder={t('mergeStudents.selectStudent')}
            isClearable={false}
          />
        </FieldWrap>

        <FieldWrap label={t('mergeStudents.target')} htmlFor="merge-std-to" error={errors.std_to}>
          <Select2
            inputId="merge-std-to"
            name="std_to"
            value={form.std_to}
            selectedLabel={form.std_to_label}
            loadOptions={loadToStudentOptions}
            onChange={(e) => setForm((p) => ({ ...p, std_to: e.target.value ?? '', std_to_label: e.target.label ?? '' }))}
            placeholder={t('mergeStudents.selectTarget')}
            isClearable={false}
          />
        </FieldWrap>
      </form>
    </Modal>
  );
}

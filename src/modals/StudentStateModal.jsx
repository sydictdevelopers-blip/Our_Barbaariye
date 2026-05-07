import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import DateInput from '../components/ui/DateInput';
import Button from '../components/ui/Button';
import Select2 from '../components/ui/Select2';
import { fetchSelectOptions, makeOptionLoader } from '../services/api';
import { swalSuccess, swalError } from '../utils/swal';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'brabaariye_user';

function getSessionUBrId() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return 0;
    return Number(JSON.parse(stored)?.u_br_id ?? 0);
  } catch {
    return 0;
  }
}

const todayIso = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function StudentStateModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const initialForm = {
    std_id: '',
    std_label: '',
    cl_id: '',
    cl_name: '',
    a_y_id: '',
    academic_name: '',
    state: '',
    option: 'None',
    amount: 0,
    account_pr: '',
    account_label: '',
    to_class: '',
    to_class_label: '',
    description: '',
    date: todayIso(),
  };
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const stdIdRef = useRef('');

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setErrors({});
      stdIdRef.current = '';
    }
  }, [isOpen]);

  const isActive = form.state === 'Active';
  const showAmount = isActive && (form.option === 'Charged' || form.option === 'Full Payment');
  const showAccount = isActive && form.option === 'Full Payment';
  const showOptionRow = isActive;
  const showToClass = isActive;

  const loadStudentOptions = useMemo(
    () => makeOptionLoader('all_student_options', null, { valueKey: 'std_id', labelKey: 'p_name' }),
    []
  );
  const loadAccountOptions = useMemo(
    () => makeOptionLoader('account_options', null, { valueKey: 'acc_id', labelKey: 'acc_name' }),
    []
  );
  const loadClassOptions = useMemo(
    () => makeOptionLoader('class_options', null, { valueKey: 'cl_id', labelKey: 'class' }),
    []
  );

  const fetchStudentClassInfo = useCallback(async (stdId) => {
    if (!stdId) return;
    try {
      const res = await fetchSelectOptions('student_class_info', 5, '', { std_id: String(stdId) });
      const rows = res?.data ?? [];
      const first = rows[0];
      if (first) {
        setForm((prev) => ({
          ...prev,
          cl_id: String(first.cl_id ?? ''),
          cl_name: String(first.name ?? ''),
          a_y_id: String(first.a_y_id ?? ''),
          academic_name: String(first.academic_name ?? ''),
        }));
      } else {
        setForm((prev) => ({ ...prev, cl_id: '', cl_name: '', a_y_id: '', academic_name: '' }));
      }
    } catch {
      setForm((prev) => ({ ...prev, cl_id: '', cl_name: '', a_y_id: '', academic_name: '' }));
    }
  }, []);

  const handleStudentChange = (e) => {
    const v = e.target.value ?? '';
    const lbl = e.target.label ?? '';
    setForm((prev) => ({ ...prev, std_id: v, std_label: lbl }));
    if (v && v !== stdIdRef.current) {
      stdIdRef.current = v;
      fetchStudentClassInfo(v);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.std_id) e.std_id = t('studentState.student');
    if (!form.cl_id) e.cl_id = t('studentState.class');
    if (!form.a_y_id) e.a_y_id = t('studentState.academic');
    if (!form.state) e.state = t('studentState.state');
    if (isActive && !form.to_class) e.to_class = t('studentState.toClass');
    if (showAmount && !(Number(form.amount) > 0)) e.amount = t('studentState.amount');
    if (showAccount && !form.account_pr) e.account_pr = t('studentState.account');
    if (!form.date) e.date = t('studentState.date');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const u_br_id = getSessionUBrId();
      const body = {
        fn: 'student_state_sp',
        ids: Number(form.std_id),
        clas: Number(form.cl_id),
        academic: Number(form.a_y_id),
        reason: form.state,
        oper_fee: isActive ? form.option : 'None',
        fee_amount: showAmount ? Number(form.amount) : 0,
        account_pr: showAccount ? String(form.account_pr) : '',
        to_class: isActive ? String(form.to_class) : '',
        description_sp: form.description ?? '',
        date_sp: form.date,
        user_id: u_br_id,
      };
      const resp = await fetch(`${API_BASE}/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(text || 'Failed');
      await swalSuccess('', text || 'OK');
      onSuccess?.();
      onClose();
    } catch (err) {
      swalError('Khalad', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setErrors({});
    onClose();
  };

  const inputCls = (name) =>
    `w-full px-4 py-2 rounded-xl border text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e] focus:border-transparent ${errors[name] ? 'border-red-500' : ''}`;

  const FieldWrap = ({ label, error, children }) => (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400">{label}</label>}
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );

  const stateOptions = [
    { value: 'Active', label: t('studentState.active') },
    { value: 'Inactive', label: t('studentState.inactive') },
  ];
  const optionChoices = [
    { value: 'None', label: t('studentState.none') },
    { value: 'Charged', label: t('studentState.charged') },
    { value: 'Full Payment', label: t('studentState.fullPayment') },
  ];

  const asyncSelectExtras = {
    isOptionDisabled: (opt) => opt?.isHint,
    formatOptionLabel: (opt) =>
      opt?.isHint ? <span className="text-slate-500 italic">{opt.label}</span> : opt?.label,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header={
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight truncate">
          {t('studentState.title')}
        </h2>
      }
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full flex-wrap">
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? '...' : t('studentState.save')}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('studentState.close')}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <FieldWrap label={t('studentState.student')} error={errors.std_id}>
          <Select2
            name="std_id"
            value={form.std_id}
            selectedLabel={form.std_label}
            loadOptions={loadStudentOptions}
            onChange={handleStudentChange}
            placeholder={t('studentState.selectStudent')}
            isClearable={false}
            {...asyncSelectExtras}
          />
        </FieldWrap>

        <FieldWrap label={t('studentState.class')} error={errors.cl_id}>
          <input type="text" readOnly value={form.cl_name} className={`${inputCls('cl_id')} bg-slate-100 dark:bg-slate-800 cursor-not-allowed`} />
        </FieldWrap>

        <FieldWrap label={t('studentState.academic')} error={errors.a_y_id}>
          <input type="text" readOnly value={form.academic_name} className={`${inputCls('a_y_id')} bg-slate-100 dark:bg-slate-800 cursor-not-allowed`} />
        </FieldWrap>

        <FieldWrap label={t('studentState.state')} error={errors.state}>
          <Select2
            name="state"
            value={form.state}
            onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
            options={stateOptions}
            placeholder={t('studentState.selectState')}
            isClearable={false}
            isSearchable={false}
          />
        </FieldWrap>

        {showOptionRow && (
          <FieldWrap label={t('studentState.option')} error={errors.option}>
            <Select2
              name="option"
              value={form.option}
              onChange={(e) => setForm((p) => ({ ...p, option: e.target.value }))}
              options={optionChoices}
              isClearable={false}
              isSearchable={false}
            />
          </FieldWrap>
        )}

        {showAmount && (
          <FieldWrap label={t('studentState.amount')} error={errors.amount}>
            <Input
              name="amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              error={errors.amount}
              props={{ min: 0, step: 0.01 }}
            />
          </FieldWrap>
        )}

        {showAccount && (
          <FieldWrap label={t('studentState.account')} error={errors.account_pr}>
            <Select2
              name="account_pr"
              value={form.account_pr}
              selectedLabel={form.account_label}
              loadOptions={loadAccountOptions}
              onChange={(e) => setForm((p) => ({ ...p, account_pr: e.target.value ?? '', account_label: e.target.label ?? '' }))}
              placeholder={t('studentState.selectAccount')}
              isClearable={false}
              {...asyncSelectExtras}
            />
          </FieldWrap>
        )}

        {showToClass && (
          <FieldWrap label={t('studentState.toClass')} error={errors.to_class}>
            <Select2
              name="to_class"
              value={form.to_class}
              selectedLabel={form.to_class_label}
              loadOptions={loadClassOptions}
              onChange={(e) => setForm((p) => ({ ...p, to_class: e.target.value ?? '', to_class_label: e.target.label ?? '' }))}
              placeholder={t('studentState.selectToClass')}
              isClearable={false}
              {...asyncSelectExtras}
            />
          </FieldWrap>
        )}

        <FieldWrap label={t('studentState.comment')} error={errors.description}>
          <textarea
            name="description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder={t('studentState.enterComment')}
            rows={3}
            className={inputCls('description')}
          />
        </FieldWrap>

        <FieldWrap label={t('studentState.date')} error={errors.date}>
          <DateInput
            name="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className={inputCls('date')}
          />
        </FieldWrap>

        {isActive && (
          <p className="md:col-span-2 text-sm text-red-600 leading-relaxed">
            {t('studentState.warning')}
          </p>
        )}
      </form>
    </Modal>
  );
}

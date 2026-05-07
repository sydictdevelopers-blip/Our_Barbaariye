import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Save, Database, ArrowRight, Filter, GraduationCap, Layers } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DateInput from '../../../components/ui/DateInput';
import { makeOptionLoader } from '../../../services/api';

/** Labelled filter field — uniform with the other tabs' toolbars. */
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

const emptySel = { id: '', label: '' };
const emptyRow = () => ({
  subject: { ...emptySel },
  chapters: '',
  questions: '',
  marks: '',
  start: '',
  end: '',
  date: new Date().toISOString().slice(0, 10),
});

export default function CreateOnlineExamTab() {
  const { t } = useTranslation();
  const [classSel, setClassSel] = useState(emptySel);
  const [batchSel, setBatchSel] = useState(emptySel);
  const onSelChange = (setter) => (e) => setter({ id: e.target.value, label: e.target.label || '' });

  const classLoader = useMemo(() => makeOptionLoader('class_options'), []);
  const batchLoader = useMemo(() => makeOptionLoader('batch_options'), []);
  const subjectLoader = useMemo(() => makeOptionLoader('subject_options'), []);

  const [rows, setRows] = useState([emptyRow()]);
  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (i) =>
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : [emptyRow()]));
  const updateRowField = (i, field, value) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  const updateRowSelect = (i, field) => (e) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: { id: e.target.value, label: e.target.label || '' } } : row)));

  return (
    <div className="space-y-4 px-2 py-3">
      {/* ── Filter card ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldGroup icon={GraduationCap} label={t('select.class')}>
            <Select2 name="classSel" value={classSel.id} selectedLabel={classSel.label} onChange={onSelChange(setClassSel)} loadOptions={classLoader} placeholder={t('select.class')} isClearable={false} />
          </FieldGroup>
          <FieldGroup icon={Layers} label={t('select.batch')}>
            <Select2 name="batchSel" value={batchSel.id} selectedLabel={batchSel.label} onChange={onSelChange(setBatchSel)} loadOptions={batchLoader} placeholder={t('select.batch')} isClearable={false} />
          </FieldGroup>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
          <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={() => {}}>
            {t('createOnlineExam.goTable', { defaultValue: 'Go Table' })}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<ArrowRight className="w-4 h-4" />} onClick={() => {}}>
            {t('action.go')}
          </Button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-md overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_0.8fr_0.8fr_1fr_1fr_1fr_3rem] bg-[#0B3C5D] text-white text-sm font-semibold">
          <div className="px-4 py-2 border-r border-white/20">Subject</div>
          <div className="px-4 py-2 border-r border-white/20">Chapters</div>
          <div className="px-4 py-2 border-r border-white/20">Questions</div>
          <div className="px-4 py-2 border-r border-white/20">Marks</div>
          <div className="px-4 py-2 border-r border-white/20">Start</div>
          <div className="px-4 py-2 border-r border-white/20">End</div>
          <div className="px-4 py-2 border-r border-white/20">Date</div>
          <div className="flex items-center justify-center p-1">
            <button type="button" onClick={addRow} className="bg-emerald-500 hover:bg-emerald-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Add row">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_0.8fr_0.8fr_1fr_1fr_1fr_3rem] items-center">
              <div className="px-2 py-2 border-r border-slate-200">
                <Select2 name={`subject_${i}`} value={row.subject.id} selectedLabel={row.subject.label} onChange={updateRowSelect(i, 'subject')} loadOptions={subjectLoader} placeholder="Select Subject" isClearable={false} />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="text" value={row.chapters} onChange={(e) => updateRowField(i, 'chapters', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0B3C5D]" />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="number" min="0" value={row.questions} onChange={(e) => updateRowField(i, 'questions', e.target.value)} className="w-full border-b border-slate-300 outline-none focus:border-[#0B3C5D] bg-transparent px-1 py-1" />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="number" min="0" step="0.01" value={row.marks} onChange={(e) => updateRowField(i, 'marks', e.target.value)} className="w-full border-b border-slate-300 outline-none focus:border-[#0B3C5D] bg-transparent px-1 py-1" />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="time" value={row.start} onChange={(e) => updateRowField(i, 'start', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0B3C5D]" />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="time" value={row.end} onChange={(e) => updateRowField(i, 'end', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0B3C5D]" />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <DateInput value={row.date} onChange={(e) => updateRowField(i, 'date', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0B3C5D]" />
              </div>
              <div className="flex items-center justify-center p-1">
                <button type="button" onClick={() => removeRow(i)} className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Remove row">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Button size="md" variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={() => {}} className="px-12">
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}

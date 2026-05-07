import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Save, FileText, Database, Printer, Filter, GraduationCap, Layers, BookOpen, CalendarDays } from 'lucide-react';
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
  chapter: '',
  category: { ...emptySel },
  instruction: '',
  noOfQuestion: '',
  marks: '',
});

export default function GenerateExamTab() {
  const { t } = useTranslation();
  const [classSel, setClassSel] = useState(emptySel);
  const [batchSel, setBatchSel] = useState(emptySel);
  const [examReg, setExamReg] = useState(emptySel);
  const [subjectSel, setSubjectSel] = useState(emptySel);
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));

  const onSelChange = (setter) => (e) => setter({ id: e.target.value, label: e.target.label || '' });

  const classLoader = useMemo(() => makeOptionLoader('class_options'), []);
  const batchLoader = useMemo(() => makeOptionLoader('batch_options'), []);
  const examRegLoader = useMemo(() => makeOptionLoader('exam_reg_options'), []);
  const subjectLoader = useMemo(() => makeOptionLoader('subject_options'), []);
  const categoryLoader = useMemo(() => makeOptionLoader('category_options'), []);

  const [rows, setRows] = useState([emptyRow(), emptyRow()]);
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
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FieldGroup icon={GraduationCap} label={t('select.class')}>
            <Select2 name="classSel" value={classSel.id} selectedLabel={classSel.label} onChange={onSelChange(setClassSel)} loadOptions={classLoader} placeholder={t('select.class')} isClearable={false} />
          </FieldGroup>
          <FieldGroup icon={Layers} label={t('select.batch')}>
            <Select2 name="batchSel" value={batchSel.id} selectedLabel={batchSel.label} onChange={onSelChange(setBatchSel)} loadOptions={batchLoader} placeholder={t('select.batch')} isClearable={false} />
          </FieldGroup>
          <FieldGroup icon={FileText} label={t('select.exam')}>
            <Select2 name="examRegSel" value={examReg.id} selectedLabel={examReg.label} onChange={onSelChange(setExamReg)} loadOptions={examRegLoader} placeholder={t('select.exam')} isClearable={false} />
          </FieldGroup>
          <FieldGroup icon={BookOpen} label={t('select.subject')}>
            <Select2 name="subjectSel" value={subjectSel.id} selectedLabel={subjectSel.label} onChange={onSelChange(setSubjectSel)} loadOptions={subjectLoader} placeholder={t('select.subject')} isClearable={false} />
          </FieldGroup>
          <FieldGroup icon={CalendarDays} label={t('generateExam.examDate', { defaultValue: 'Exam Date' })}>
            <DateInput
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full h-[42px] border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-[#0f3d5e] focus:ring-2 focus:ring-[#0f3d5e]/20"
            />
          </FieldGroup>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
          <Button size="sm" variant="primary" leftIcon={<FileText className="w-4 h-4" />} onClick={() => {}}>
            {t('generateExam.addExam', { defaultValue: 'Add Exam' })}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={() => {}}>
            {t('generateExam.showExam', { defaultValue: 'Show Exam' })}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={() => {}}>
            {t('generateExam.printExam', { defaultValue: 'Print Exam' })}
          </Button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-md overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_2fr_1fr_0.7fr_3rem] bg-[#0B3C5D] text-white text-sm font-semibold">
          <div className="px-4 py-2 border-r border-white/20">Subject</div>
          <div className="px-4 py-2 border-r border-white/20">Chapter</div>
          <div className="px-4 py-2 border-r border-white/20">Category</div>
          <div className="px-4 py-2 border-r border-white/20">Instruction</div>
          <div className="px-4 py-2 border-r border-white/20">No Of Question</div>
          <div className="px-4 py-2 border-r border-white/20">Marks</div>
          <div className="flex items-center justify-center p-1">
            <button type="button" onClick={addRow} className="bg-emerald-500 hover:bg-emerald-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Add row">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2fr_1fr_0.7fr_3rem] items-center">
              <div className="px-2 py-2 border-r border-slate-200">
                <Select2 name={`subject_${i}`} value={row.subject.id} selectedLabel={row.subject.label} onChange={updateRowSelect(i, 'subject')} loadOptions={subjectLoader} placeholder="Select Subject" isClearable={false} />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="text" value={row.chapter} onChange={(e) => updateRowField(i, 'chapter', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0B3C5D]" />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <Select2 name={`category_${i}`} value={row.category.id} selectedLabel={row.category.label} onChange={updateRowSelect(i, 'category')} loadOptions={categoryLoader} placeholder="Select Category" isClearable={false} />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="text" value={row.instruction} onChange={(e) => updateRowField(i, 'instruction', e.target.value)} className="w-full border-b border-slate-300 outline-none focus:border-[#0B3C5D] bg-transparent px-1 py-1" />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="number" min="0" value={row.noOfQuestion} onChange={(e) => updateRowField(i, 'noOfQuestion', e.target.value)} className="w-full border-b border-slate-300 outline-none focus:border-[#0B3C5D] bg-transparent px-1 py-1" />
              </div>
              <div className="px-2 py-2 border-r border-slate-200">
                <input type="number" min="0" step="0.01" value={row.marks} onChange={(e) => updateRowField(i, 'marks', e.target.value)} className="w-full border-b border-slate-300 outline-none focus:border-[#0B3C5D] bg-transparent px-1 py-1" />
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

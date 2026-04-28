import { useMemo, useState } from 'react';
import { Plus, X, Save, FileText, Database, Printer } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import { makeOptionLoader } from '../../../services/api';

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
  const [classSel, setClassSel] = useState(emptySel);
  const [batchSel, setBatchSel] = useState(emptySel);
  const [examReg, setExamReg] = useState(emptySel);
  const [subjectSel, setSubjectSel] = useState(emptySel);
  const [examDate, setExamDate] = useState('');

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
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[180px]">
          <Select2 name="classSel" value={classSel.id} selectedLabel={classSel.label} onChange={onSelChange(setClassSel)} loadOptions={classLoader} placeholder="Select Class" isClearable={false} />
        </div>
        <div className="min-w-[180px]">
          <Select2 name="batchSel" value={batchSel.id} selectedLabel={batchSel.label} onChange={onSelChange(setBatchSel)} loadOptions={batchLoader} placeholder="Select Batch" isClearable={false} />
        </div>
        <div className="min-w-[180px]">
          <Select2 name="examRegSel" value={examReg.id} selectedLabel={examReg.label} onChange={onSelChange(setExamReg)} loadOptions={examRegLoader} placeholder="Select Exam" isClearable={false} />
        </div>
        <div className="min-w-[180px]">
          <Select2 name="subjectSel" value={subjectSel.id} selectedLabel={subjectSel.label} onChange={onSelChange(setSubjectSel)} loadOptions={subjectLoader} placeholder="Select Subject" isClearable={false} />
        </div>
        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#0f3d5e] focus:ring-2 focus:ring-[#0f3d5e]/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" leftIcon={<FileText className="w-4 h-4" />} onClick={() => {}}>
          ADD EXAM
        </Button>
        <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={() => {}}>
          SHOW EXAM
        </Button>
        <Button size="sm" variant="primary" leftIcon={<Printer className="w-4 h-4" />} onClick={() => {}}>
          PRINT EXAM
        </Button>
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
          SAVE
        </Button>
      </div>
    </div>
  );
}

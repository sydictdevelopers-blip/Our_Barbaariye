import { useMemo, useState } from 'react';
import { Plus, X, Save, Database, ArrowRight } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import { makeOptionLoader } from '../../../services/api';

const emptySel = { id: '', label: '' };
const emptyRow = () => ({
  subject: { ...emptySel },
  chapters: '',
  questions: '',
  marks: '',
  start: '',
  end: '',
  date: '',
});

export default function CreateOnlineExamTab() {
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <Select2 name="classSel" value={classSel.id} selectedLabel={classSel.label} onChange={onSelChange(setClassSel)} loadOptions={classLoader} placeholder="Select Class" isClearable={false} />
        </div>
        <div className="min-w-[220px] flex-1">
          <Select2 name="batchSel" value={batchSel.id} selectedLabel={batchSel.label} onChange={onSelChange(setBatchSel)} loadOptions={batchLoader} placeholder="Select Batch" isClearable={false} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={() => {}}>
            GO TABLE
          </Button>
          <Button size="sm" variant="primary" leftIcon={<ArrowRight className="w-4 h-4" />} onClick={() => {}}>
            GO
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
                <input type="date" value={row.date} onChange={(e) => updateRowField(i, 'date', e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0B3C5D]" />
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

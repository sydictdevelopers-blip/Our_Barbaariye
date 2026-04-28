import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Database, X, Save, Pencil, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import { makeOptionLoader, fetchSelectOptions } from '../../../services/api';
import { swalSuccess, swalError, swalConfirm } from '../../../utils/swal';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const LANGUAGE_ID = 1;
const STATE_OPTIONS = [
  { value: 'Correct', label: 'Correct' },
  { value: 'Wrong', label: 'Wrong' },
];

function getCategoryMode(label) {
  if (!label) return null;
  const s = label.toLowerCase();
  if (/direct|fill/.test(s)) return 'direct';
  if (/circle|true|false/.test(s)) return 'circle';
  return null;
}

async function postBulk(steps) {
  const res = await fetch(`${API_BASE}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch (_) { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || 'Bulk failed');
  return data;
}

const emptySel = { id: '', label: '' };

export default function QuestionsTableTab() {
  const user = useSelector((state) => state.ui.user);
  const uBrId = user?.u_br_id ?? user?.br_id ?? 0;

  const [grade, setGrade] = useState(emptySel);
  const [subject, setSubject] = useState(emptySel);
  const [chapter, setChapter] = useState(emptySel);
  const [category, setCategory] = useState(emptySel);
  const onSelChange = (setter) => (e) => setter({ id: e.target.value, label: e.target.label || '' });

  const gradeLoader = useMemo(() => makeOptionLoader('grade_options'), []);
  const subjectLoader = useMemo(() => makeOptionLoader('subject_options'), []);
  const chapterLoader = useMemo(() => makeOptionLoader('chapter_options'), []);
  const categoryLoader = useMemo(() => makeOptionLoader('category_options'), []);

  const mode = useMemo(() => getCategoryMode(category.label), [category.label]);

  const [view, setView] = useState('form'); // 'form' | 'data'
  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId != null;

  const [directRows, setDirectRows] = useState(['']);
  const [questionText, setQuestionText] = useState('');
  const [circleRows, setCircleRows] = useState([{ answer: '', state: '' }]);
  const [saving, setSaving] = useState(false);

  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsRows, setResultsRows] = useState([]);

  const addDirectRow = () => setDirectRows((rows) => [...rows, '']);
  const removeDirectRow = (i) =>
    setDirectRows((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : ['']));
  const updateDirectRow = (i, value) =>
    setDirectRows((rows) => rows.map((r, idx) => (idx === i ? value : r)));

  const addCircleRow = () => setCircleRows((rows) => [...rows, { answer: '', state: '' }]);
  const removeCircleRow = (i) =>
    setCircleRows((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ answer: '', state: '' }]));
  const updateCircleRow = (i, field, value) =>
    setCircleRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const resetForm = () => {
    setDirectRows(['']);
    setQuestionText('');
    setCircleRows([{ answer: '', state: '' }]);
    setEditingId(null);
  };

  const handleAddNew = () => { resetForm(); setView('form'); };

  const validateBaseSelections = () => {
    if (!grade.id) return 'Dooro Grade';
    if (!subject.id) return 'Dooro Subject';
    if (!chapter.id) return 'Dooro Chapter';
    if (!category.id) return 'Dooro Category';
    return null;
  };

  const buildSaveSteps = () => {
    const ec = category.id, ch = chapter.id, su = subject.id, gr = grade.id, ub = uBrId;
    const qbId = isEditing ? editingId : 0;

    if (mode === 'direct') {
      if (isEditing) {
        const q = (directRows[0] || '').trim();
        if (!q) throw new Error("Geli su'aalka");
        return [{
          type: 'sp', fn: 'question_bank_sp',
          params: [qbId, ec, ch, su, gr, q, ub, LANGUAGE_ID, 'update'],
        }];
      }
      const list = directRows.map((q) => q.trim()).filter(Boolean);
      if (list.length === 0) throw new Error("Geli ugu yaraan hal su'aal");
      return list.map((q) => ({
        type: 'sp', fn: 'question_bank_sp',
        params: [0, ec, ch, su, gr, q, ub, LANGUAGE_ID, 'insert'],
      }));
    }

    // circle / true-false
    const q = questionText.trim();
    if (!q) throw new Error("Geli su'aalka");
    const ans = circleRows
      .map((r) => ({ answer: r.answer.trim(), state: r.state.trim() }))
      .filter((r) => r.answer && r.state);
    if (ans.length === 0) throw new Error('Geli ugu yaraan hal jawaab oo state leh');

    if (isEditing) {
      return [
        { type: 'sp', fn: 'question_bank_sp',
          params: [qbId, ec, ch, su, gr, q, ub, LANGUAGE_ID, 'update'] },
        { type: 'select', query: 'question_answers_by_qbid',
          queryParams: { q_b_id: qbId }, saveAs: 'old' },
        { type: 'forEach', source: { ref: 'old' }, step: {
            type: 'sp', fn: 'question_answers_sp',
            params: [{ refIter: 'qu_a_id' }, qbId, '', 'X', ub, LANGUAGE_ID, 'delete'],
        }},
        ...ans.map((r) => ({
          type: 'sp', fn: 'question_answers_sp',
          params: [0, qbId, r.answer, r.state, ub, LANGUAGE_ID, 'insert'],
        })),
      ];
    }
    return [
      { type: 'sp', fn: 'question_bank_sp',
        params: [0, ec, ch, su, gr, q, ub, LANGUAGE_ID, 'insert'] },
      { type: 'select', query: 'question_bank_last_id',
        queryParams: { ex_c_id: ec, chap_id: ch, su_id: su, question: q },
        pick: 'q_b_id', saveAs: 'qbId' },
      ...ans.map((r) => ({
        type: 'sp', fn: 'question_answers_sp',
        params: [0, { ref: 'qbId' }, r.answer, r.state, ub, LANGUAGE_ID, 'insert'],
      })),
    ];
  };

  const handleSave = async () => {
    const err = validateBaseSelections();
    if (err) { swalError('Khalad', err); return; }
    if (!mode) {
      swalError('Khalad', 'Category-ga lama aqoonsan (waa inuu noqdaa Direct, Fill, Circle, ama True/False).');
      return;
    }
    setSaving(true);
    try {
      const steps = buildSaveSteps();
      await postBulk(steps);
      swalSuccess('Wa la guulaystey', isEditing ? 'Waa la cusbooneysiiyay' : "Su'aalaha waa la kaydiyay");
      resetForm();
    } catch (e) {
      swalError('Khalad ayaa dhacay', e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const refreshResults = async () => {
    setResultsLoading(true);
    try {
      const resp = await fetchSelectOptions('question_bank_show', 200, '', {
        gr_id: grade.id || 0,
        su_id: subject.id || 0,
        chap_id: chapter.id || 0,
        ex_c_id: category.id || 0,
      });
      setResultsRows(Array.isArray(resp?.data) ? resp.data : []);
    } catch (e) {
      swalError('Khalad', e?.message || 'Show failed');
      setResultsRows([]);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleShow = async () => { setView('data'); await refreshResults(); };

  const handleEdit = async (row) => {
    setGrade({ id: row.gr_id, label: row.grade || '' });
    setSubject({ id: row.su_id, label: row.subject || '' });
    setChapter({ id: row.chap_id, label: row.chapter || '' });
    setCategory({ id: row.ex_c_id, label: row.category || '' });
    const m = getCategoryMode(row.category);
    if (m === 'direct') {
      setDirectRows([row.question || '']);
      setQuestionText('');
      setCircleRows([{ answer: '', state: '' }]);
    } else if (m === 'circle') {
      setQuestionText(row.question || '');
      setDirectRows(['']);
      try {
        const resp = await fetchSelectOptions('question_answers_by_qbid', 100, '', { q_b_id: row.q_b_id });
        const list = (resp?.data || []).map((a) => ({ answer: a.answer || '', state: a.state || '' }));
        setCircleRows(list.length ? list : [{ answer: '', state: '' }]);
      } catch (e) {
        swalError('Khalad', e?.message || 'Failed to load answers');
        setCircleRows([{ answer: '', state: '' }]);
      }
    }
    setEditingId(row.q_b_id);
    setView('form');
  };

  const handleDelete = async (row) => {
    const ok = await swalConfirm();
    if (!ok) return;
    const m = getCategoryMode(row.category);
    const steps = m === 'circle'
      ? [
          { type: 'select', query: 'question_answers_by_qbid',
            queryParams: { q_b_id: row.q_b_id }, saveAs: 'old' },
          { type: 'forEach', source: { ref: 'old' }, step: {
              type: 'sp', fn: 'question_answers_sp',
              params: [{ refIter: 'qu_a_id' }, row.q_b_id, '', 'X', uBrId, LANGUAGE_ID, 'delete'],
          }},
          { type: 'sp', fn: 'question_bank_sp',
            params: [row.q_b_id, 0, 0, 0, 0, '', 0, LANGUAGE_ID, 'delete'] },
        ]
      : [
          { type: 'sp', fn: 'question_bank_sp',
            params: [row.q_b_id, 0, 0, 0, 0, '', 0, LANGUAGE_ID, 'delete'] },
        ];
    try {
      await postBulk(steps);
      swalSuccess('Wa la guulaystey', 'La tirtirey');
      await refreshResults();
    } catch (e) {
      swalError('Khalad', e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4 px-2 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[180px]">
          <Select2 name="gradeSelect" value={grade.id} selectedLabel={grade.label} onChange={onSelChange(setGrade)} loadOptions={gradeLoader} placeholder="Select Grade" isClearable={false} />
        </div>
        <div className="min-w-[180px]">
          <Select2 name="subjectSelect" value={subject.id} selectedLabel={subject.label} onChange={onSelChange(setSubject)} loadOptions={subjectLoader} placeholder="Select Subject" isClearable={false} />
        </div>
        <div className="min-w-[180px]">
          <Select2 name="chapterSelect" value={chapter.id} selectedLabel={chapter.label} onChange={onSelChange(setChapter)} loadOptions={chapterLoader} placeholder="Select Chapter" isClearable={false} />
        </div>
        <div className="min-w-[180px]">
          <Select2 name="categorySelect" value={category.id} selectedLabel={category.label} onChange={onSelChange(setCategory)} loadOptions={categoryLoader} placeholder="Select Category" isClearable={false} />
        </div>
        <div className="flex flex-col items-stretch gap-2 ml-auto">
          <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShow} disabled={resultsLoading}>
            {resultsLoading ? 'Loading…' : 'SHOW DATA'}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddNew}>
            ADD NEW
          </Button>
        </div>
      </div>

      {view === 'form' && mode === 'direct' && (
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-md overflow-hidden">
            <div className="flex items-center bg-[#0B3C5D] text-white px-4 py-2">
              <span className="font-semibold flex-1">{isEditing ? 'Edit Question' : 'Questions'}</span>
              {!isEditing && (
                <button type="button" onClick={addDirectRow} className="bg-emerald-500 hover:bg-emerald-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Add row">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-200">
              {(isEditing ? directRows.slice(0, 1) : directRows).map((q, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2">
                  <input type="text" value={q} onChange={(e) => updateDirectRow(i, e.target.value)} className="flex-1 border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-1 py-1 bg-transparent" />
                  {!isEditing && (
                    <button type="button" onClick={() => removeDirectRow(i)} className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Remove row">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <Button size="md" variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} disabled={saving} className="px-12">
              {saving ? 'Saving…' : isEditing ? 'UPDATE' : 'SAVE'}
            </Button>
          </div>
        </div>
      )}

      {view === 'form' && mode === 'circle' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-emerald-600 font-medium">Question</label>
            <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={2} className="w-full border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-1 py-1 bg-transparent resize-y" />
          </div>
          <div className="border border-slate-200 rounded-md overflow-hidden">
            <div className="flex items-center bg-[#0B3C5D] text-white">
              <span className="font-semibold flex-1 px-4 py-2 border-r border-white/20">Answer</span>
              <span className="font-semibold w-48 px-4 py-2 border-r border-white/20">State</span>
              <div className="px-2 py-1">
                <button type="button" onClick={addCircleRow} className="bg-emerald-500 hover:bg-emerald-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Add row">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {circleRows.map((row, i) => (
                <div key={i} className="flex items-center">
                  <input type="text" value={row.answer} onChange={(e) => updateCircleRow(i, 'answer', e.target.value)} className="flex-1 border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-4 py-2 bg-transparent" />
                  <select value={row.state} onChange={(e) => updateCircleRow(i, 'state', e.target.value)} className="w-48 border-l border-slate-200 px-4 py-2 outline-none bg-white">
                    <option value="">Select State</option>
                    {STATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="px-2 py-1">
                    <button type="button" onClick={() => removeCircleRow(i)} className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Remove row">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <Button size="md" variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} disabled={saving} className="px-12">
              {saving ? 'Saving…' : isEditing ? 'UPDATE' : 'SAVE'}
            </Button>
          </div>
        </div>
      )}

      {view === 'data' && (
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <div className="flex items-center bg-[#0B3C5D] text-white px-4 py-2">
            <span className="font-semibold flex-1">Saved Questions ({resultsRows.length})</span>
          </div>
          {resultsLoading ? (
            <div className="p-4 text-center text-slate-500">Loading…</div>
          ) : resultsRows.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No questions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-2">Grade</th>
                    <th className="text-left px-4 py-2">Subject</th>
                    <th className="text-left px-4 py-2">Chapter</th>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-left px-4 py-2">Question</th>
                    <th className="text-center px-4 py-2 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {resultsRows.map((r) => (
                    <tr key={r.q_b_id}>
                      <td className="px-4 py-2">{r.grade}</td>
                      <td className="px-4 py-2">{r.subject}</td>
                      <td className="px-4 py-2">{r.chapter}</td>
                      <td className="px-4 py-2">{r.category}</td>
                      <td className="px-4 py-2">{r.question}</td>
                      <td className="px-4 py-2">
                        <div className="flex justify-center gap-2">
                          <button type="button" onClick={() => handleEdit(r)} className="bg-amber-500 hover:bg-amber-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(r)} className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center" aria-label="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

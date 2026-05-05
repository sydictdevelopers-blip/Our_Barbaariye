import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Database, X, Save, Pencil, Trash2, Filter, GraduationCap, BookOpen, Layers, Tag } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import ActionButton from '../../../components/ui/ActionButton';
import DataTableCard from '../../../components/DataTableCard';
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

export default function QuestionsTableTab() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.ui.user);
  const uBrId = user?.u_br_id ?? user?.br_id ?? 0;
  const brId  = user?.br_id ?? 0;

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
  const [resultsMessage, setResultsMessage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search/pagination operate on the in-memory result set: filter first, then slice.
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resultsRows;
    return resultsRows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [resultsRows, search]);
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Snap back to page 1 whenever the underlying result set or page size changes,
  // so users don't end up stranded on an out-of-range page after a refresh.
  useEffect(() => { setPage(1); }, [resultsRows, pageSize]);

  const COLUMNS = useMemo(() => {
    const cols = [{ key: 'question', label: 'Question' }];
    if (mode === 'circle') {
      cols.push({ key: 'answer', label: 'Answer' });
      cols.push({ key: 'state',  label: 'State' });
    }
    cols.push({ key: 'username', label: 'User' });
    cols.push({ key: 'reg_date', label: 'Reg Date' });
    return cols;
  }, [mode]);

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
    setResultsMessage('');
    try {
      const oper = mode === 'direct' ? 'Direct' : 'Multiple';
      const resp = await fetchSelectOptions('question_bank_view', 200, '', {
        gr_id:   grade.id    || 0,
        su_id:   subject.id  || 0,
        chap_id: chapter.id  || 0,
        ex_c_id: category.id || 0,
        br_id:   brId        || 0,
        oper,
      });
      const rows = Array.isArray(resp?.data) ? resp.data : [];
      // vw_question_bank emits a single (id=0, message=alert.body) row when
      // the filter set returns nothing — surface that text and clear the table.
      if (rows.length === 1 && Number(rows[0]?.id) === 0) {
        setResultsMessage(rows[0]?.message || '');
        setResultsRows([]);
      } else {
        setResultsRows(rows);
      }
    } catch (e) {
      swalError('Khalad', e?.message || 'Show failed');
      setResultsRows([]);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleShow = async () => {
    const err = validateBaseSelections();
    if (err) { swalError('Khalad', err); return; }
    if (!mode) {
      swalError('Khalad', 'Category-ga lama aqoonsan (waa inuu noqdaa Direct, Fill, Circle, ama True/False).');
      return;
    }
    setView('data');
    await refreshResults();
  };

  const renderActions = useCallback((row) => (
    <div className="inline-flex gap-2">
      <ActionButton variant="edit" aria-label="Edit" onClick={() => handleEdit(row)}>
        <Pencil className="w-4 h-4" />
      </ActionButton>
      <ActionButton variant="delete" aria-label="Delete" onClick={() => handleDelete(row)}>
        <Trash2 className="w-4 h-4" />
      </ActionButton>
    </div>
    // handleEdit/handleDelete close over `mode` (current category dropdown);
    // declared below — fine because callbacks resolve them at click time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [mode]);

  // vw_question_bank rows only carry: id, question, answer, state, username, reg_date.
  // The grade/subject/chapter/category dropdowns are already set (filters), so we
  // reuse them for both edit-prefill and delete-mode dispatch.
  const handleEdit = async (row) => {
    const qbId = row.id;
    if (mode === 'direct') {
      setDirectRows([row.question || '']);
      setQuestionText('');
      setCircleRows([{ answer: '', state: '' }]);
    } else if (mode === 'circle') {
      setQuestionText(row.question || '');
      setDirectRows(['']);
      try {
        const resp = await fetchSelectOptions('question_answers_by_qbid', 100, '', { q_b_id: qbId });
        const list = (resp?.data || []).map((a) => ({ answer: a.answer || '', state: a.state || '' }));
        setCircleRows(list.length ? list : [{ answer: '', state: '' }]);
      } catch (e) {
        swalError('Khalad', e?.message || 'Failed to load answers');
        setCircleRows([{ answer: '', state: '' }]);
      }
    }
    setEditingId(qbId);
    setView('form');
  };

  const handleDelete = async (row) => {
    const ok = await swalConfirm();
    if (!ok) return;
    const qbId = row.id;
    const steps = mode === 'circle'
      ? [
          { type: 'select', query: 'question_answers_by_qbid',
            queryParams: { q_b_id: qbId }, saveAs: 'old' },
          { type: 'forEach', source: { ref: 'old' }, step: {
              type: 'sp', fn: 'question_answers_sp',
              params: [{ refIter: 'qu_a_id' }, qbId, '', 'X', uBrId, LANGUAGE_ID, 'delete'],
          }},
          { type: 'sp', fn: 'question_bank_sp',
            params: [qbId, 0, 0, 0, 0, '', 0, LANGUAGE_ID, 'delete'] },
        ]
      : [
          { type: 'sp', fn: 'question_bank_sp',
            params: [qbId, 0, 0, 0, 0, '', 0, LANGUAGE_ID, 'delete'] },
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
      {/* ── Filter card: header + grouped selects + actions row ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-800/40">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0B3C5D]/10 dark:bg-[#0B3C5D]/30 text-[#0B3C5D] dark:text-teal-300">
            <Filter className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('questionsTable.filtersTitle')}
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FieldGroup icon={GraduationCap} label={t('questionsTable.ph.grade')}>
            <Select2 name="gradeSelect" value={grade.id} selectedLabel={grade.label} onChange={onSelChange(setGrade)} loadOptions={gradeLoader} placeholder={t('questionsTable.ph.grade')} isClearable={false} />
          </FieldGroup>
          <FieldGroup icon={BookOpen} label={t('questionsTable.ph.subject')}>
            <Select2 name="subjectSelect" value={subject.id} selectedLabel={subject.label} onChange={onSelChange(setSubject)} loadOptions={subjectLoader} placeholder={t('questionsTable.ph.subject')} isClearable={false} />
          </FieldGroup>
          <FieldGroup icon={Layers} label={t('questionsTable.ph.chapter')}>
            <Select2 name="chapterSelect" value={chapter.id} selectedLabel={chapter.label} onChange={onSelChange(setChapter)} loadOptions={chapterLoader} placeholder={t('questionsTable.ph.chapter')} isClearable={false} />
          </FieldGroup>
          <FieldGroup icon={Tag} label={t('questionsTable.ph.category')}>
            <Select2 name="categorySelect" value={category.id} selectedLabel={category.label} onChange={onSelChange(setCategory)} loadOptions={categoryLoader} placeholder={t('questionsTable.ph.category')} isClearable={false} />
          </FieldGroup>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/30">
          <Button size="sm" variant="primary" leftIcon={<Database className="w-4 h-4" />} onClick={handleShow} disabled={resultsLoading}>
            {resultsLoading ? t('questionsTable.loading') : t('questionsTable.showData')}
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddNew}>
            {t('questionsTable.addNew')}
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
        <DataTableCard
          columns={COLUMNS}
          data={pagedRows}
          isLoading={resultsLoading}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          itemsPerPage={pageSize}
          onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
          onPageClick={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          searchValue={search}
          onSearchChange={(e) => { setSearch(e?.target?.value ?? ''); setPage(1); }}
          searchPlaceholder="Search questions…"
          emptyTitle="No questions found"
          emptyDescription={resultsMessage || 'Wax su’aalo ah lama helin filter-yadan.'}
          renderActions={renderActions}
          rowKey={(row) => row.id}
        />
      )}
    </div>
  );
}

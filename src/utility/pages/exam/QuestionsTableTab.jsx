import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Database, X, Save, Pencil, Trash2, Filter, GraduationCap, BookOpen, Layers, Tag } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Select2 from '../../../components/ui/Select2';
import ActionButton from '../../../components/ui/ActionButton';
import DataTableCard from '../../../components/DataTableCard';
import { makeOptionLoader, fetchSelectOptions, runBulk } from '../../../services/api';
import { swalSuccess, swalError, swalConfirm } from '../../../utils/swal';
import { confirmDelete } from '../../../utils/confirmDelete';

const LANGUAGE_ID = 1;

function getCategoryMode(label) {
  if (!label) return null;
  const s = label.toLowerCase();
  if (/direct|fill/.test(s)) return 'direct';
  if (/circle|true|false/.test(s)) return 'circle';
  return null;
}

/**
 * Pull the first non-empty SP message from a /bulk response. Each SP step
 * returns rows shaped like `[{ <fn_name>: '<varchar return>' }]`; we walk the
 * results in order and grab the first single-column scalar string. forEach /
 * select results are ignored so the message comes from the leading SP step
 * (e.g. the 'update' / 'delete' call).
 */
function extractBulkMessage(data) {
  const results = Array.isArray(data?.results) ? data.results : [];
  for (const stepResult of results) {
    if (!Array.isArray(stepResult) || stepResult.length === 0) continue;
    const row = stepResult[0];
    if (!row || typeof row !== 'object') continue;
    const values = Object.values(row);
    if (values.length !== 1) continue;
    const v = values[0];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
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

  // `mode` is intentionally NOT derived from category.label. Changing the
  // Select Category dropdown alone must not re-render the form/data view —
  // mode is only re-applied on deliberate actions (Add New / Show Data /
  // Save / Update / Delete refresh). Read current category's mode via
  // `getCategoryMode(category.label)` at action time.
  const [mode, setMode] = useState(null);

  // DB stores literal 'Correct'/'Wrong'; only the labels are localised.
  const STATE_OPTIONS = useMemo(() => [
    { value: 'Correct', label: t('questionsTable.stateOptions.correct') },
    { value: 'Wrong',   label: t('questionsTable.stateOptions.wrong') },
  ], [t]);

  const [view, setView] = useState('form'); // 'form' | 'data'

  // ── ADD state (inline form, supports multiple rows) ───────────────────────
  const [directRows, setDirectRows] = useState(['']);
  const [questionText, setQuestionText] = useState('');
  const [circleRows, setCircleRows] = useState([{ answer: '', state: '' }]);
  const [saving, setSaving] = useState(false);

  // ── EDIT state (modal, single row) ───────────────────────────────────────
  // Held in its own object so the inline Add form is never mutated by Edit,
  // and the row we received from the table is never written back to.
  const emptyEditForm = { qbId: null, question: '', answers: [{ answer: '', state: '' }] };
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

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
    const cols = [{ key: 'question', label: t('questionsTable.table.colQuestion') }];
    if (mode === 'circle') {
      cols.push({ key: 'answer', label: t('questionsTable.table.colAnswer') });
      cols.push({ key: 'state',  label: t('questionsTable.table.colState') });
    }
    cols.push({ key: 'username', label: t('questionsTable.table.colUser') });
    cols.push({ key: 'reg_date', label: t('questionsTable.table.colRegDate') });
    return cols;
  }, [mode, t]);

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

  const resetAddForm = () => {
    setDirectRows(['']);
    setQuestionText('');
    setCircleRows([{ answer: '', state: '' }]);
  };

  const handleAddNew = () => {
    // Apply mode now (deliberate click) — not on every category change.
    setMode(getCategoryMode(category.label));
    resetAddForm();
    setView('form');
  };

  const validateBaseSelections = () => {
    if (!grade.id) return t('questionsTable.msg.pickGrade');
    if (!subject.id) return t('questionsTable.msg.pickSubject');
    if (!chapter.id) return t('questionsTable.msg.pickChapter');
    if (!category.id) return t('questionsTable.msg.pickCategory');
    return null;
  };

  // ── ADD: build steps for inserting new questions (multi-row supported) ──
  // Backed by question_full_insert_sp(ex_c_id, chap_id, su_id, gr_id, question,
  // answer, state, u_br_id, mode). The SP itself dedups the question row in
  // 'multiple' mode, so we no longer need a separate question_bank_last_id
  // lookup — each (question, answer) pair is one SP call. `effectiveMode` is
  // passed from the caller so we use the freshly-derived mode on save (the
  // `mode` state hasn't been flushed yet by React when called from handleSave).
  const buildAddSteps = (effectiveMode) => {
    const ec = category.id, ch = chapter.id, su = subject.id, gr = grade.id, ub = uBrId;

    if (effectiveMode === 'direct') {
      const list = directRows.map((q) => q.trim()).filter(Boolean);
      if (list.length === 0) throw new Error(t('questionsTable.msg.needAtLeastOneQuestion'));
      return list.map((q) => ({
        type: 'sp', fn: 'question_full_insert_sp',
        params: [ec, ch, su, gr, q, '', '', ub, 'direct'],
      }));
    }

    const q = questionText.trim();
    if (!q) throw new Error(t('questionsTable.msg.needQuestion'));
    const ans = circleRows
      .map((r) => ({ answer: r.answer.trim(), state: r.state.trim() }))
      .filter((r) => r.answer && r.state);
    if (ans.length === 0) throw new Error(t('questionsTable.msg.needAnswerWithState'));

    return ans.map((r) => ({
      type: 'sp', fn: 'question_full_insert_sp',
      params: [ec, ch, su, gr, q, r.answer, r.state, ub, 'multiple'],
    }));
  };

  const handleSave = async () => {
    const err = validateBaseSelections();
    if (err) { swalError(t('questionsTable.msg.errTitle'), err); return; }
    // Re-derive mode from the current category at click time. Mode no longer
    // updates automatically when the dropdown changes, so we capture it here.
    const newMode = getCategoryMode(category.label);
    if (!newMode) {
      swalError(t('questionsTable.msg.errTitle'), t('questionsTable.msg.unknownCategory'));
      return;
    }
    setMode(newMode);
    setSaving(true);
    try {
      const steps = buildAddSteps(newMode);
      const data = await runBulk(steps);
      resetAddForm();
      // Re-run the Show Data flow so the table reflects what was just saved.
      await reloadShowData(newMode);
      const dbMsg = extractBulkMessage(data);
      swalSuccess(t('questionsTable.msg.successTitle'), dbMsg || t('questionsTable.msg.saveSuccess'));
    } catch (e) {
      swalError(t('questionsTable.msg.errOccurred'), e?.message || t('questionsTable.msg.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // ── EDIT: immutable state setters; form lives in `editForm`, untouched
  //          by the Add inline form. The original table row is never mutated.
  // The modal exposes only inline edits to existing answers — there is no
  // add-row / remove-row affordance, so we don't need handlers for those.
  const updateEditQuestion = (val) =>
    setEditForm((p) => ({ ...p, question: val }));
  const updateEditAnswer = (i, field, val) =>
    setEditForm((p) => ({
      ...p,
      answers: p.answers.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)),
    }));

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditForm(emptyEditForm); // reset state when modal closes
  };

  // Backed by question_bank_edit_sp(q_b_id, question, answer, state, qu_a_id,
  // language, oper). For circle mode we still need question_full_insert_sp to
  // add new answer rows (the edit SP only updates / deletes existing ones).
  // `effectiveMode` is passed in because mode is no longer derived — caller
  // re-derives at click time and passes it to avoid stale-state reads.
  const buildEditSteps = (effectiveMode) => {
    const ec = category.id, ch = chapter.id, su = subject.id, gr = grade.id, ub = uBrId;
    const qbId = editForm.qbId;
    if (qbId == null) throw new Error(t('questionsTable.msg.unknownQuestion'));

    const q = editForm.question.trim();
    if (!q) throw new Error(t('questionsTable.msg.needQuestion'));

    if (effectiveMode === 'direct') {
      // Single update; state='' so the SP skips the answer branch.
      return [{
        type: 'sp', fn: 'question_bank_edit_sp',
        params: [qbId, q, '', '', 0, LANGUAGE_ID, 'update'],
      }];
    }

    const ans = editForm.answers
      .map((r) => ({ answer: r.answer.trim(), state: r.state.trim() }))
      .filter((r) => r.answer && r.state);
    if (ans.length === 0) throw new Error(t('questionsTable.msg.needAnswerWithState'));

    return [
      // 1) Update question text only.
      { type: 'sp', fn: 'question_bank_edit_sp',
        params: [qbId, q, '', '', 0, LANGUAGE_ID, 'update'] },
      // 2) Pull existing answers so we can wipe them individually.
      { type: 'select', query: 'question_answers_by_qbid',
        queryParams: { q_b_id: qbId }, saveAs: 'old' },
      // 3) Delete each old answer (state non-empty → single-answer delete branch).
      { type: 'forEach', source: { ref: 'old' }, step: {
          type: 'sp', fn: 'question_bank_edit_sp',
          params: [qbId, '', '', 'X', { refIter: 'qu_a_id' }, LANGUAGE_ID, 'delete'],
      }},
      // 4) Insert the new answer set via the unified insert SP.
      ...ans.map((r) => ({
        type: 'sp', fn: 'question_full_insert_sp',
        params: [ec, ch, su, gr, q, r.answer, r.state, ub, 'multiple'],
      })),
    ];
  };

  const handleEditSave = async () => {
    const err = validateBaseSelections();
    if (err) { swalError(t('questionsTable.msg.errTitle'), err); return; }
    // Mode is no longer derived from category — re-derive at click time.
    const newMode = getCategoryMode(category.label);
    if (!newMode) {
      swalError(t('questionsTable.msg.errTitle'), t('questionsTable.msg.unknownCategory'));
      return;
    }
    setMode(newMode);
    setEditSaving(true);
    try {
      const steps = buildEditSteps(newMode);
      const data = await runBulk(steps);
      closeEditModal();
      // Re-run the Show Data flow after a successful update so the table is
      // refreshed with the latest server state before the success alert.
      await reloadShowData(newMode);
      const dbMsg = extractBulkMessage(data);
      swalSuccess(t('questionsTable.msg.successTitle'), dbMsg || t('questionsTable.msg.updateSuccess'));
    } catch (e) {
      swalError(t('questionsTable.msg.errOccurred'), e?.message || t('questionsTable.msg.updateFailed'));
    } finally {
      setEditSaving(false);
    }
  };

  // `currentMode` defaults to the state mode but callers pass it explicitly
  // when they've just re-derived it (so we don't read a stale state value
  // before React flushes setMode).
  const refreshResults = async (currentMode = mode) => {
    setResultsLoading(true);
    setResultsMessage('');
    try {
      const oper = currentMode === 'direct' ? 'Direct' : 'Multiple';
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
      swalError(t('questionsTable.msg.errTitle'), e?.message || t('questionsTable.msg.showFailed'));
      setResultsRows([]);
    } finally {
      setResultsLoading(false);
    }
  };

  // Re-runs the "Show Data" flow without the swalError validation gate, so it
  // is safe to call from update/delete success paths. Caller may pass an
  // explicit mode (already re-derived) to avoid stale state.
  const reloadShowData = async (effectiveMode) => {
    const newMode = effectiveMode ?? getCategoryMode(category.label) ?? mode;
    if (!newMode) return;
    setMode(newMode);
    setView('data');
    await refreshResults(newMode);
  };

  const handleShow = async () => {
    const err = validateBaseSelections();
    if (err) { swalError(t('questionsTable.msg.errTitle'), err); return; }
    const newMode = getCategoryMode(category.label);
    if (!newMode) {
      swalError(t('questionsTable.msg.errTitle'), t('questionsTable.msg.unknownCategory'));
      return;
    }
    setMode(newMode);
    setView('data');
    await refreshResults(newMode);
  };

  const renderActions = useCallback((row) => (
    <div className="inline-flex gap-2">
      <ActionButton variant="edit" aria-label={t('questionsTable.table.editRow')} onClick={() => handleEdit(row)}>
        <Pencil className="w-4 h-4" />
      </ActionButton>
      <ActionButton variant="delete" aria-label={t('questionsTable.table.deleteRow')} onClick={() => handleDelete(row)}>
        <Trash2 className="w-4 h-4" />
      </ActionButton>
    </div>
    // handleEdit/handleDelete close over `mode` (the applied mode state, set
    // by the most recent Show Data / Add New click — not the live dropdown);
    // declared below — fine because callbacks resolve them at click time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [mode, t]);

  // vw_question_bank rows only carry: id, question, answer, state, username, reg_date.
  // The grade/subject/chapter/category dropdowns are already set (filters), so we
  // reuse them for both edit-prefill and delete-mode dispatch.
  // We read scalar values out of `row` (no destructuring of mutable refs, no
  // assignment back to it) so the table's row object is never mutated.
  const handleEdit = async (row) => {
    const qbId = row?.id;
    const questionStr = String(row?.question ?? '');

    if (mode === 'direct') {
      setEditForm({ qbId, question: questionStr, answers: [] });
      setEditModalOpen(true);
      return;
    }

    if (mode === 'circle') {
      try {
        const resp = await fetchSelectOptions('question_answers_by_qbid', 100, '', { q_b_id: qbId });
        const answers = (resp?.data || []).map((a) => ({
          answer: String(a?.answer ?? ''),
          state: String(a?.state ?? ''),
        }));
        setEditForm({
          qbId,
          question: questionStr,
          answers: answers.length ? answers : [{ answer: '', state: '' }],
        });
        setEditModalOpen(true);
      } catch (e) {
        swalError(t('questionsTable.msg.errTitle'), e?.message || t('questionsTable.msg.loadAnswersFailed'));
      }
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirmDelete({ id: row.id, label: 'Question', recordPreview: row.question || row.q_text });
    if (!ok) return;
    const qbId = row.id;
    // question_bank_edit_sp 'delete' with empty state cascades: it removes all
    // question_answers rows for this q_b_id and then the question_bank row,
    // so a single call covers both direct and circle modes.
    const steps = [{
      type: 'sp', fn: 'question_bank_edit_sp',
      params: [qbId, '', '', '', 0, LANGUAGE_ID, 'delete'],
    }];
    try {
      const data = await runBulk(steps);
      // Re-run the Show Data flow so the deleted row disappears before the
      // success alert pops up.
      await reloadShowData();
      const dbMsg = extractBulkMessage(data);
      swalSuccess(t('questionsTable.msg.successTitle'), dbMsg || t('questionsTable.msg.deleteSuccess'));
    } catch (e) {
      swalError(t('questionsTable.msg.errTitle'), e?.message || t('questionsTable.msg.deleteFailed'));
    }
  };

  return (
    <div className="space-y-4 px-2 py-3">
      {/* ── Filter card: header + grouped selects + actions row ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
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
              <span className="font-semibold flex-1">{t('questionsTable.form.questionsHeader')}</span>
              <button
                type="button"
                onClick={addDirectRow}
                className="bg-emerald-500 hover:bg-emerald-600 text-white w-8 h-8 rounded flex items-center justify-center"
                aria-label={t('questionsTable.form.addRow')}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-200">
              {directRows.map((q, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => updateDirectRow(i, e.target.value)}
                    placeholder={t('questionsTable.form.directRowPh')}
                    className="flex-1 border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-1 py-1 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeDirectRow(i)}
                    className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center"
                    aria-label={t('questionsTable.form.removeRow')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <Button size="md" variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} disabled={saving} className="px-12">
              {saving ? t('questionsTable.saving') : t('questionsTable.save')}
            </Button>
          </div>
        </div>
      )}

      {view === 'form' && mode === 'circle' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('questionsTable.form.questionLabel')}</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder={t('questionsTable.form.questionPh')}
              rows={2}
              className="w-full border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-1 py-1 bg-transparent resize-y"
            />
          </div>
          <div className="border border-slate-200 rounded-md overflow-hidden">
            <div className="flex items-center bg-[#0B3C5D] text-white">
              <span className="font-semibold flex-1 px-4 py-2 border-r border-white/20">{t('questionsTable.form.answer')}</span>
              <span className="font-semibold w-48 px-4 py-2 border-r border-white/20">{t('questionsTable.form.state')}</span>
              <div className="px-2 py-1">
                <button
                  type="button"
                  onClick={addCircleRow}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white w-8 h-8 rounded flex items-center justify-center"
                  aria-label={t('questionsTable.form.addRow')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {circleRows.map((row, i) => (
                <div key={i} className="flex items-center">
                  <input
                    type="text"
                    value={row.answer}
                    onChange={(e) => updateCircleRow(i, 'answer', e.target.value)}
                    placeholder={t('questionsTable.form.answerPh')}
                    className="flex-1 border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-4 py-2 bg-transparent"
                  />
                  <select value={row.state} onChange={(e) => updateCircleRow(i, 'state', e.target.value)} className="w-48 border-l border-slate-200 px-4 py-2 outline-none bg-white">
                    <option value="">{t('questionsTable.form.selectState')}</option>
                    {STATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => removeCircleRow(i)}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center"
                      aria-label={t('questionsTable.form.removeRow')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <Button size="md" variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} disabled={saving} className="px-12">
              {saving ? t('questionsTable.saving') : t('questionsTable.save')}
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
          searchPlaceholder={t('questionsTable.table.searchPh')}
          emptyTitle={t('questionsTable.table.emptyTitle')}
          emptyDescription={resultsMessage || t('questionsTable.table.emptyDescription')}
          renderActions={renderActions}
          rowKey={(row) => row.id}
        />
      )}

      <Modal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        title={t('questionsTable.editModal.title')}
        size="lg"
        footer={
          <>
            <Button size="sm" variant="secondary" onClick={closeEditModal} disabled={editSaving}>
              {t('questionsTable.editModal.cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleEditSave}
              disabled={editSaving}
            >
              {editSaving ? t('questionsTable.saving') : t('questionsTable.update')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('questionsTable.editModal.questionLabel')}
            </label>
            <textarea
              value={editForm.question}
              onChange={(e) => updateEditQuestion(e.target.value)}
              placeholder={t('questionsTable.editModal.questionPh')}
              rows={2}
              className="w-full border border-slate-300 focus:border-[#0B3C5D] outline-none px-2 py-1.5 rounded-md bg-white dark:bg-slate-800 resize-y"
            />
          </div>

          {mode === 'circle' && (
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <div className="flex items-center bg-[#0B3C5D] text-white">
                <span className="font-semibold flex-1 px-4 py-2 border-r border-white/20">
                  {t('questionsTable.editModal.answer')}
                </span>
                <span className="font-semibold w-48 px-4 py-2">
                  {t('questionsTable.editModal.state')}
                </span>
              </div>
              <div className="divide-y divide-slate-200">
                {editForm.answers.map((row, i) => (
                  <div key={i} className="flex items-center">
                    <input
                      type="text"
                      value={row.answer}
                      onChange={(e) => updateEditAnswer(i, 'answer', e.target.value)}
                      placeholder={t('questionsTable.editModal.answerPh')}
                      className="flex-1 border-b border-slate-300 focus:border-[#0B3C5D] outline-none px-4 py-2 bg-transparent"
                    />
                    <select
                      value={row.state}
                      onChange={(e) => updateEditAnswer(i, 'state', e.target.value)}
                      className="w-48 border-l border-slate-200 px-4 py-2 outline-none bg-white"
                    >
                      <option value="">{t('questionsTable.editModal.selectState')}</option>
                      {STATE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

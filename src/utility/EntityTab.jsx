import { useState, useCallback, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { swalSuccess, swalConfirm, swalError, swalConfirmAction } from '../utils/swal';
import { Plus, Pencil, Trash2, Save, Check, X } from 'lucide-react';
import Button from '../components/ui/Button';
import ActionButton from '../components/ui/ActionButton';
import Select2 from '../components/ui/Select2';
import DataTableCard from '../components/DataTableCard';
import Card from '../components/ui/Card';
import { CRUD_CONFIG } from '../config/crudConfig';
import { makeOptionLoader, crud, runBulk, getSessionUBrIdNum } from '../services/api';
import {
  loadData,
  clearEntityData,
  setSearchQuery,
  setCurrentPage,
  setItemsPerPage,
  selectEntity,
  selectColumns,
  selectPaginatedData,
  selectTotalPages,
  selectTotalRows,
} from '../slices/dataSlice';
import { deleteRow } from '../utils/crud';

const toLabel = (key) => key.charAt(0).toUpperCase() + key.slice(1, -1);

// Halkaan ka qeexo query-ka academic year – automatic loo isticmaalo haddii tab kuu pass gudbin
const DEFAULT_ACADEMIC_YEAR_OPTIONS_QUERY = 'academicYeartab';

// Persist filter selections per-tab in sessionStorage so they survive the tab
// remount caused by AcademicSetup's `<motion.div key={activeTab}>`. Same API as
// useState, just hydrates from / writes to a string key.
function usePersistedState(key, defaultValue) {
  const [val, setVal] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = window.sessionStorage.getItem(key);
      return stored != null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.sessionStorage.setItem(key, JSON.stringify(val)); } catch { /* quota or disabled */ }
  }, [key, val]);
  return [val, setVal];
}

/** Server-side: api/data supports page, limit, search. Pagination + search waa API. */
const loadPayload = (entityKey, page, limit, search, extra = {}) => ({
  queryName: entityKey,
  page,
  limit: limit || 10,
  ...(search != null && String(search).trim() && { search: String(search).trim() }),
  ...extra,
});

const CHEVRON_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231F2937'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E";

function EntityTab({
  entityKey,
  modalKey,
  icon: Icon,
  loadButtons,
  dispatch,
  onEdit,
  showAcademicYearSelect = false,
  academicYearOptionsQuery,
  showClassSelect = false,
  classOptionsQuery,
  showBatchSelect = false,
  batchOptionsQuery,
  showLevelSelect = false,
  levelOptionsQuery,
  showExamSelect = false,
  examOptionsQuery,
  showSubjectSelect = false,
  subjectOptionsQuery,
  showResponsibleSelect = false,
  responsibleOptionsQuery,
  showStudentSelect = false,
  studentOptionsQuery,
  hideEdit = false,
  hideAddNew = false,
  hiddenColumns,
  extraRowActions,
  extraHeaderActions,
  extraLoadParams,
  bulkForm,
  onCustomAction,
}, ref) {
  const { t } = useTranslation();
  const tr = (btn) => {
    if (btn.labelKey) return t(btn.labelKey, btn.label);
    if (btn.id === 'addNew') return t('entity.addNew');
    return btn.label;
  };
  const [activeEntityKey, setActiveEntityKey] = useState(entityKey);
  const [activeExtra, setActiveExtra] = useState({});
  // Filter selections persist per-tab via sessionStorage (key prefixed with entityKey).
  const fkey = (f) => `filters:${entityKey}:${f}`;
  const [selectedResponsibleId, setSelectedResponsibleId] = usePersistedState(fkey('respId'), '');
  const [selectedResponsibleLabel, setSelectedResponsibleLabel] = usePersistedState(fkey('respLabel'), '');
  const [selectedStudentId, setSelectedStudentId] = usePersistedState(fkey('studentId'), '');
  const [selectedStudentLabel, setSelectedStudentLabel] = usePersistedState(fkey('studentLabel'), '');

  const entity = useSelector(selectEntity(activeEntityKey)) ?? {};
  const rawColumns = useSelector(selectColumns(activeEntityKey));
  // Stable ref: tanstack-table treats `columns` change as a column rebuild,
  // which can remount editable cells (loses input focus mid-typing).
  const columns = useMemo(
    () => (hiddenColumns?.length ? (rawColumns || []).filter((c) => !hiddenColumns.includes(c.key)) : rawColumns),
    [rawColumns, hiddenColumns]
  );
  const rawPaginatedData = useSelector(selectPaginatedData(activeEntityKey));
  // SP fallback row pattern: 1 row with no PK → treat as empty + extract message from
  // the first non-null string field (e.g. SP returns "This Information Was Not Found!").
  const isEmptyFallback = Array.isArray(rawPaginatedData) && rawPaginatedData.length === 1 && !rawPaginatedData[0]?.id;
  const fallbackMessage = isEmptyFallback
    ? Object.values(rawPaginatedData[0]).find((v) => typeof v === 'string' && v.trim() !== '' && v.trim() !== '-')
    : null;
  const paginatedData = isEmptyFallback ? [] : rawPaginatedData;
  const totalPages = useSelector(selectTotalPages(activeEntityKey));
  const rawTotalRows = useSelector(selectTotalRows(activeEntityKey)) ?? rawPaginatedData?.length ?? 0;
  const totalRows = isEmptyFallback ? 0 : rawTotalRows;

  const config = CRUD_CONFIG[modalKey];
  const label = toLabel(entityKey);
  const loadBtns = loadButtons ?? [{ id: entityKey, label: `Load ${label}` }];
  const limit = entity.itemsPerPage || 10;
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [viewMode, setViewMode] = useState('data'); // 'data' | 'form'
  const [editValues, setEditValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-show data panel after external loadData (e.g. reloadEntity post-CRUD).
  // suppressAutoShowRef lets handleGenerate hide the panel without it bouncing
  // back open just because entity.data still has the previous rows in memory.
  const suppressAutoShowRef = useRef(false);
  useEffect(() => {
    if (suppressAutoShowRef.current) return;
    if (!showDataPanel && Array.isArray(entity.data) && entity.data.length > 0) {
      setShowDataPanel(true);
    }
  }, [entity.data, showDataPanel]);

  // Result tab → ADD NEW (insert) and EDIT EXAM (update): both use inline marks entry.
  const isResultAddNew = activeEntityKey === 'ResultAddNew';
  const isEditExam = activeEntityKey === 'EditExam';
  const isMarksEntry = isResultAddNew || isEditExam;
  // Approve Exam tab uses approve/cancel per-row buttons instead of edit/delete.
  const isApproveExam = activeEntityKey === 'ApproveExam';
  // Stable ref so DataTableCard's column rebuild doesn't remount the input each keystroke.
  const editableColumns = useMemo(() => (isMarksEntry ? ['marks'] : undefined), [isMarksEntry]);
  // Per-column max source: btn_insert_exam returns max_mark on each row, so the
  // input on the `marks` column caps at that value (also enforced server-side in result_sp).
  const editableMaxField = useMemo(() => (isMarksEntry ? { marks: 'max_mark' } : undefined), [isMarksEntry]);
  const onEditChange = useCallback((rowId, colKey, value) => {
    setEditValues((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [colKey]: value } }));
  }, []);
  // Reset edits when query/filters change
  useEffect(() => { setEditValues({}); }, [activeEntityKey, activeExtra]);

  const handleGenerate = useCallback(async () => {
    // editValues is keyed by row.id — for ResultAddNew that's std_cl_id (insert),
    // for EditExam that's r_id (update). Same shape, different SP semantics.
    const items = Object.entries(editValues)
      .map(([id, vals]) => ({ id: Number(id), marks: Number(vals?.marks) }))
      .filter((it) => Number.isFinite(it.id) && Number.isFinite(it.marks));
    if (!items.length) {
      swalError('Marks lama gelin', 'Fadlan gali marks ugu yaraan hal arday.');
      return;
    }
    const e_r_id = Number(activeExtra.ex_id) || 0;
    const su_id = Number(activeExtra.sub_id) || 0;
    const u_br_id = getSessionUBrIdNum();
    if (!e_r_id || !su_id) {
      swalError('Filterka lama dhamaystirin', 'Fadlan dooro Exam iyo Subject.');
      return;
    }
    setIsSubmitting(true);
    try {
      // For 'update' the SP convention puts r_id in p_student (and also p_id);
      // for 'insert' p_id is unused so we pass 0 and put std_cl_id in p_student.
      const oper = isEditExam ? 'update' : 'insert';
      await runBulk([
        {
          type: 'forEach',
          source: items,
          step: {
            type: 'sp',
            fn: 'result_sp',
            params: [
              isEditExam ? { refIter: 'id' } : 0,   // p_id
              { refIter: 'id' },                     // p_student (std_cl_id or r_id)
              e_r_id,                                 // p_exam
              su_id,                                  // p_subject
              { refIter: 'marks' },                   // p_mark (varchar)
              u_br_id,                                // p_user_id
              oper,                                   // p_operation
            ],
          },
        },
      ]);
      swalSuccess('Waa la guulaystey', `${items.length} marks ayaa la kaydiyay.`);
      setEditValues({});
      // Hide the data panel after Generate. User must click the load button
      // (Add New / Edit Exam) again to re-fetch and re-show the table.
      suppressAutoShowRef.current = true;
      setShowDataPanel(false);
    } catch (e) {
      swalError('Khalad ayaa dhacay', e.message || '');
    } finally {
      setIsSubmitting(false);
    }
  }, [editValues, activeExtra, activeEntityKey, limit, dispatch, isEditExam]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = usePersistedState(fkey('acadId'), '');
  const [selectedAcademicYearLabel, setSelectedAcademicYearLabel] = usePersistedState(fkey('acadLabel'), '');
  const [selectedClassId, setSelectedClassId] = usePersistedState(fkey('classId'), '');
  const [selectedClassLabel, setSelectedClassLabel] = usePersistedState(fkey('classLabel'), '');
  const [selectedBatchId, setSelectedBatchId] = usePersistedState(fkey('batchId'), '');
  const [selectedBatchLabel, setSelectedBatchLabel] = usePersistedState(fkey('batchLabel'), '');
  const [selectedLevelId, setSelectedLevelId] = usePersistedState(fkey('levelId'), '');
  const [selectedLevelLabel, setSelectedLevelLabel] = usePersistedState(fkey('levelLabel'), '');
  const [selectedExamId, setSelectedExamId] = usePersistedState(fkey('examId'), '');
  const [selectedExamLabel, setSelectedExamLabel] = usePersistedState(fkey('examLabel'), '');
  const [selectedSubjectId, setSelectedSubjectId] = usePersistedState(fkey('subjectId'), '');
  const [selectedSubjectLabel, setSelectedSubjectLabel] = usePersistedState(fkey('subjectLabel'), '');

  // Automatic: haddii academicYearOptionsQuery la gudbin waayo, default waa academicYeartab
  const optionsQuery = academicYearOptionsQuery ?? DEFAULT_ACADEMIC_YEAR_OPTIONS_QUERY;
  const clsOptionsQuery = classOptionsQuery ?? 'class_options';
  const batOptionsQuery = batchOptionsQuery ?? 'batch_options';
  const lvlOptionsQuery = levelOptionsQuery ?? 'levels';
  const examOptQuery = examOptionsQuery ?? 'exam_options';
  const subOptionsQuery = subjectOptionsQuery ?? 'result_subject_options';
  const resOptionsQuery = responsibleOptionsQuery ?? 'responsible_options';
  const stuOptionsQuery = studentOptionsQuery ?? 'student_performance_select';

  // Lazy loaders — dropdown opens / user types → server fetches first 25 (search beyond that).
  // Loaders that depend on other selects (batch→class, subject→class+academic, exam→class+academic)
  // read live state via getExtra so chained dropdowns refresh on selection change.
  const acadLoader = useMemo(
    () => makeOptionLoader(optionsQuery, () => ({ cl_id: selectedClassId })),
    [optionsQuery, selectedClassId]
  );
  const classLoader = useMemo(() => makeOptionLoader(clsOptionsQuery), [clsOptionsQuery]);
  const batchLoader = useMemo(
    () => makeOptionLoader(batOptionsQuery, () => ({ cl_id: selectedClassId })),
    [batOptionsQuery, selectedClassId]
  );
  const levelLoader = useMemo(() => makeOptionLoader(lvlOptionsQuery), [lvlOptionsQuery]);
  const examLoader = useMemo(
    () => makeOptionLoader(examOptQuery, () => ({ cl_id: selectedClassId, a_y_id: selectedAcademicYearId })),
    [examOptQuery, selectedClassId, selectedAcademicYearId]
  );
  const subjectLoader = useMemo(
    () => makeOptionLoader(subOptionsQuery, () => ({ cl_id: selectedClassId, a_y_id: selectedAcademicYearId })),
    [subOptionsQuery, selectedClassId, selectedAcademicYearId]
  );
  const respLoader = useMemo(() => makeOptionLoader(resOptionsQuery), [resOptionsQuery]);
  const studentLoader = useMemo(() => makeOptionLoader(stuOptionsQuery), [stuOptionsQuery]);

  const academicYearIdForLoad = showAcademicYearSelect ? selectedAcademicYearId : undefined;
  const classIdForLoad = showClassSelect ? selectedClassId : undefined;
  const batchIdForLoad = showBatchSelect ? selectedBatchId : undefined;
  const levelIdForLoad = showLevelSelect ? selectedLevelId : undefined;
  const examIdForLoad = showExamSelect ? selectedExamId : undefined;
  const subjectIdForLoad = showSubjectSelect ? selectedSubjectId : undefined;
  const responsibleIdForLoad = showResponsibleSelect ? selectedResponsibleId : undefined;
  const studentIdForLoad = showStudentSelect ? selectedStudentId : undefined;

  const buildExtra = useCallback(
    (academicYearId, classId, batchId, levelId, examId, responsibleId, studentId, subjectId) => ({
      ...(academicYearId != null && String(academicYearId).trim() && { academicYearId: String(academicYearId).trim() }),
      ...(classId != null && String(classId).trim() && { cl_id: String(classId).trim() }),
      ...(batchId != null && String(batchId).trim() && { b_id: String(batchId).trim() }),
      ...(levelId != null && String(levelId).trim() && { lev_id: String(levelId).trim() }),
      ...(examId != null && String(examId).trim() && { ex_id: String(examId).trim() }),
      ...(subjectId != null && String(subjectId).trim() && { sub_id: String(subjectId).trim() }),
      ...(responsibleId != null && String(responsibleId).trim() && { res_id: String(responsibleId).trim() }),
      ...(studentId != null && String(studentId).trim() && { std_cl_id: String(studentId).trim() }),
      ...extraLoadParams,
    }),
    [extraLoadParams]
  );

  const onShowData = useCallback(
    (btnId, academicYearId, classId, batchId, levelId, examId, responsibleId, studentId, subjectId) => {
      const extra = buildExtra(academicYearId, classId, batchId, levelId, examId, responsibleId, studentId, subjectId);
      setViewMode('data');
      // Re-arm auto-show so the panel reopens once fresh data arrives.
      suppressAutoShowRef.current = false;
      setShowDataPanel(true);
      // Tirtir slice-ka cusub si rows-ka hore (haddii ay jiraan) aanay u soo
      // bandhigin marka query cusub uu socdo. Sidoo kale tirtir slice-ka hore
      // marka key cusub uu yahay (e.g. SHOW DATA → ALL) si markii loo soo
      // noqdo aanay xog laga galay laga sii hayn.
      if (activeEntityKey && activeEntityKey !== btnId) {
        dispatch(clearEntityData(activeEntityKey));
      }
      dispatch(clearEntityData(btnId));
      setActiveEntityKey(btnId);
      setActiveExtra(extra);
      // Marks-entry views (Add New & Edit Exam): default 50/page so teachers see most
      // of a class without paging through small pages.
      const isMarksEntryBtn = btnId === 'ResultAddNew' || btnId === 'EditExam';
      const effectiveLimit = isMarksEntryBtn ? 50 : limit;
      dispatch(loadData(loadPayload(btnId, 1, effectiveLimit, '', extra)));
      if (isMarksEntryBtn) {
        dispatch(setItemsPerPage({ entityKey: btnId, value: 50 }));
      }
    },
    [limit, dispatch, buildExtra, activeEntityKey]
  );

  // Imperative API: AcademicSetup-ka (parent) wuxuu adeegsadaa ref-ka si uu
  // EntityTab uga shaqaysiiyo button gaar ah si dhaqsi ah — tusaale: ka dib
  // marka modal Generate uu guul gaadho, parent-ku wuxuu wacaa
  // showAs('AssignClassExamShowAll', { academicYearId }) si table-ka uu u
  // muujiyo natiijada cusub.
  useImperativeHandle(
    ref,
    () => ({
      showAs(queryName, params = {}) {
        const ay = params.academicYearId;
        if (ay && showAcademicYearSelect) {
          setSelectedAcademicYearId(String(ay));
          if (params.academicYearLabel) setSelectedAcademicYearLabel(String(params.academicYearLabel));
        }
        if (params.cl_id && showClassSelect) setSelectedClassId(String(params.cl_id));
        if (params.b_id && showBatchSelect) setSelectedBatchId(String(params.b_id));
        if (params.ex_id && showExamSelect) setSelectedExamId(String(params.ex_id));
        if (params.lev_id && showLevelSelect) setSelectedLevelId(String(params.lev_id));
        onShowData(
          queryName,
          ay,
          params.cl_id,
          params.b_id,
          params.lev_id,
          params.ex_id,
          params.res_id,
          params.std_cl_id,
          params.sub_id
        );
      },
    }),
    [
      onShowData,
      showAcademicYearSelect,
      showClassSelect,
      showBatchSelect,
      showExamSelect,
      showLevelSelect,
    ]
  );

  const doDelete = useCallback(
    async (row) => {
      try {
        await deleteRow(row, config, (result) => {
          dispatch(loadData(loadPayload(activeEntityKey, entity.currentPage, limit, entity.searchQuery, activeExtra)));
          swalSuccess('Wa la guulaystey', result?.message || '');
        });
      } catch (err) {
        swalError('Khalad ayaa dhacay', err.message || '');
      }
    },
    [config, activeEntityKey, limit, dispatch, activeExtra, entity.currentPage, entity.searchQuery, buildExtra]
  );

  // Approve Exam — per-row approve (commit `approve` → `marks`) / cancel (clear `approve`).
  const doApproveRow = useCallback(
    async (row, op) => {
      try {
        const result = await crud({
          operation: op,
          fn: 'result_approve_sp',
          params: { p_id: Number(row.id), p_user_id: getSessionUBrIdNum() },
        });
        swalSuccess('Waa la guulaystey', result?.message || '');
        dispatch(loadData(loadPayload(activeEntityKey, entity.currentPage || 1, limit, entity.searchQuery, activeExtra)));
      } catch (err) {
        swalError('Khalad ayaa dhacay', err.message || '');
      }
    },
    [activeEntityKey, limit, dispatch, activeExtra, entity.currentPage, entity.searchQuery]
  );

  // isFullyLoaded: dhammaan rows-ka backend-ka horeba waa la helay (prePaginated
  // queries-yada). Marka, pagination iyo search waxaa lagu sameeyaa client-side
  // — ma jiro request cusub oo loo dirayo DB-ga.
  const isFullyLoaded = totalRows > 0 && Array.isArray(rawPaginatedData) && rawPaginatedData.length === totalRows;

  // Client-side filter + pagination — kaliya marka isFullyLoaded.
  const clientFilteredData = useMemo(() => {
    if (!isFullyLoaded) return paginatedData;
    const q = (entity.searchQuery || '').toString().trim().toLowerCase();
    if (!q) return paginatedData;
    const keys = (columns || []).map((c) => c.key).filter(Boolean);
    return paginatedData.filter((row) =>
      keys.some((key) => {
        const v = row[key];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [isFullyLoaded, paginatedData, entity.searchQuery, columns]);

  const displayedData = useMemo(() => {
    if (!isFullyLoaded) return paginatedData;
    const start = (Math.max(1, entity.currentPage || 1) - 1) * limit;
    return clientFilteredData.slice(start, start + limit);
  }, [isFullyLoaded, paginatedData, clientFilteredData, entity.currentPage, limit]);

  const displayedTotal = isFullyLoaded ? clientFilteredData.length : totalRows;
  const displayedTotalPages = isFullyLoaded
    ? Math.max(1, Math.ceil(displayedTotal / limit))
    : totalPages;

  const goToPage = useCallback(
    (page) => {
      dispatch(setCurrentPage({ entityKey: activeEntityKey, value: page }));
      if (!isFullyLoaded) {
        dispatch(loadData(loadPayload(activeEntityKey, page, limit, entity.searchQuery, activeExtra)));
      }
    },
    [activeEntityKey, limit, dispatch, activeExtra, entity.searchQuery, isFullyLoaded]
  );

  const handlePageSizeChange = useCallback(
    (newSize) => {
      dispatch(setItemsPerPage({ entityKey: activeEntityKey, value: newSize }));
      dispatch(setCurrentPage({ entityKey: activeEntityKey, value: 1 }));
      if (!isFullyLoaded) {
        dispatch(loadData(loadPayload(activeEntityKey, 1, newSize, entity.searchQuery, activeExtra)));
      }
    },
    [activeEntityKey, dispatch, activeExtra, entity.searchQuery, isFullyLoaded]
  );

  const renderActions = useCallback(
    (row) => {
      if (isApproveExam) {
        return (
          <div className="flex justify-center gap-1">
            <ActionButton
              variant="success"
              aria-label="Approve"
              onClick={async () => { if (await swalConfirm()) doApproveRow(row, 'approve'); }}
            >
              <Check className="w-4 h-4" />
            </ActionButton>
            <ActionButton
              variant="delete"
              aria-label="Cancel"
              onClick={async () => { if (await swalConfirm()) doApproveRow(row, 'cancel'); }}
            >
              <X className="w-4 h-4" />
            </ActionButton>
          </div>
        );
      }
      return (
        <div className="flex justify-center gap-1">
          {extraRowActions && extraRowActions(row)}
          {!hideEdit && (
            <ActionButton variant="edit" aria-label="Edit" onClick={() => onEdit(modalKey)(row, { cl_id: classIdForLoad, b_id: batchIdForLoad, lev_id: levelIdForLoad, ex_id: examIdForLoad, academicYearId: academicYearIdForLoad })}>
              <Pencil className="w-4 h-4" />
            </ActionButton>
          )}
          <ActionButton
            variant="delete"
            aria-label="Delete"
            onClick={async () => {
              if (await swalConfirm()) doDelete(row);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </ActionButton>
        </div>
      );
    },
    [isApproveExam, doApproveRow, modalKey, onEdit, doDelete, extraRowActions, classIdForLoad, batchIdForLoad, levelIdForLoad, examIdForLoad, academicYearIdForLoad, hideEdit]
  );

  const headerActions = (
    <>
      {showClassSelect && (
        <div className="min-w-[180px]">
          <Select2
            name="classSelect"
            value={selectedClassId}
            selectedLabel={selectedClassLabel}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedClassLabel(e.target.label || '');
              setSelectedBatchId(''); setSelectedBatchLabel('');
              setSelectedAcademicYearId(''); setSelectedAcademicYearLabel('');
              setSelectedSubjectId(''); setSelectedSubjectLabel('');
              setSelectedExamId(''); setSelectedExamLabel('');
            }}
            loadOptions={classLoader}
            placeholder={t('entity.selectClass', 'Select Class')}
            isClearable={false}
          />
        </div>
      )}
      {showBatchSelect && (
        <div className="min-w-[150px]">
          <Select2
            name="batchSelect"
            value={selectedBatchId}
            selectedLabel={selectedBatchLabel}
            onChange={(e) => { setSelectedBatchId(e.target.value); setSelectedBatchLabel(e.target.label || ''); }}
            loadOptions={batchLoader}
            placeholder={t('entity.selectBatch', 'Select Batch')}
            isClearable={false}
          />
        </div>
      )}
      {showAcademicYearSelect && (
        <div className="min-w-[200px]">
          <Select2
            name="academicYear"
            value={selectedAcademicYearId}
            selectedLabel={selectedAcademicYearLabel}
            onChange={(e) => {
              setSelectedAcademicYearId(e.target.value);
              setSelectedAcademicYearLabel(e.target.label || '');
              setSelectedSubjectId(''); setSelectedSubjectLabel('');
              setSelectedExamId(''); setSelectedExamLabel('');
            }}
            loadOptions={acadLoader}
            placeholder={t('entity.selectAcademic')}
            isClearable={false}
          />
        </div>
      )}
      {showSubjectSelect && (
        <div className="min-w-[180px]">
          <Select2
            name="subjectSelect"
            value={selectedSubjectId}
            selectedLabel={selectedSubjectLabel}
            onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedSubjectLabel(e.target.label || ''); }}
            loadOptions={subjectLoader}
            placeholder={t('entity.selectSubject', 'Select Subject')}
            isClearable={false}
          />
        </div>
      )}
      {showExamSelect && (
        <div className="min-w-[200px]">
          <Select2
            name="examSelect"
            value={selectedExamId}
            selectedLabel={selectedExamLabel}
            onChange={(e) => { setSelectedExamId(e.target.value); setSelectedExamLabel(e.target.label || ''); }}
            loadOptions={examLoader}
            placeholder={t('entity.selectExam', 'Select Exam')}
            isClearable={false}
          />
        </div>
      )}
      {showLevelSelect && (
        <div className="min-w-[180px]">
          <Select2
            name="levelSelect"
            value={selectedLevelId}
            selectedLabel={selectedLevelLabel}
            onChange={(e) => { setSelectedLevelId(e.target.value); setSelectedLevelLabel(e.target.label || ''); }}
            loadOptions={levelLoader}
            placeholder={t('entity.selectLevel', 'Select Level')}
            isClearable={false}
          />
        </div>
      )}
      {showResponsibleSelect && (
        <div className="min-w-[200px]">
          <Select2
            name="responsibleSelect"
            value={selectedResponsibleId}
            selectedLabel={selectedResponsibleLabel}
            onChange={(e) => { setSelectedResponsibleId(e.target.value); setSelectedResponsibleLabel(e.target.label || ''); }}
            loadOptions={respLoader}
            placeholder={t('entity.selectResponsible', 'Select Responsible')}
            isClearable={false}
          />
        </div>
      )}
      {showStudentSelect && (
        <div className="min-w-[220px]">
          <Select2
            name="studentSelect"
            value={selectedStudentId}
            selectedLabel={selectedStudentLabel}
            onChange={(e) => { setSelectedStudentId(e.target.value); setSelectedStudentLabel(e.target.label || ''); }}
            loadOptions={studentLoader}
            placeholder={t('entity.selectStudent', 'Dooro Arday')}
            isClearable
          />
        </div>
      )}
      {loadBtns.map((btn) => {
        const BtnIcon = btn.icon ?? Icon;
        const isBulkAction = !!btn.isBulkAction;
        const isAddNew = !!btn.modalKey;
        const isDeleteAction = !!btn.deleteAction;
        const isBulkApproveAction = btn.bulkAction === 'approve' || btn.bulkAction === 'cancel';
        const handleClick = () => {
          if (btn.inDevelopment) {
            swalError('Function-ka diyaar uma ahan', `${btn.label} weli lama dhammaystirin.`);
            return;
          }
          if (isBulkApproveAction) {
            // Approve/Cancel All & Approve By Class — call result_approve_bulk_sp.
            if (btn.requiresClass && !selectedClassId) {
              swalError('Fadlan dooro Class', '');
              return;
            }
            swalConfirmAction({
              title: t('swal.titles.confirm', 'Hubi'),
              text: btn.confirmText || t('entity.confirmAction', 'Are you sure?'),
              confirmText: t('swal.buttons.yesContinue', 'Sii wad'),
              confirmColor: btn.bulkAction === 'cancel' ? '#dc2626' : '#16a34a',
              onConfirm: async () => {
                const params = {
                  p_class: btn.requiresClass ? Number(selectedClassId) : 0,
                  p_user_id: getSessionUBrIdNum(),
                };
                const result = await crud({ operation: btn.bulkAction, fn: 'result_approve_bulk_sp', params });
                if (showDataPanel) {
                  dispatch(loadData(loadPayload(activeEntityKey, 1, limit, entity.searchQuery, activeExtra)));
                }
                return { message: result?.message };
              },
            });
            return;
          }
          if (isDeleteAction) {
            // Bulk-delete buttons (e.g. Class/Subject Exam Delete) need the same
            // filter context as a load: validate selections, then forward them as
            // p_* params to the SP. btn.withSubject also requires Subject.
            if (showClassSelect && !selectedClassId) { swalError('Fadlan dooro Class', ''); return; }
            if (showAcademicYearSelect && !selectedAcademicYearId) { swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), ''); return; }
            if (showExamSelect && !selectedExamId) { swalError('Fadlan dooro Exam', ''); return; }
            if (showBatchSelect && !selectedBatchId) { swalError('Fadlan dooro Batch', ''); return; }
            if (btn.withSubject && !selectedSubjectId) { swalError('Fadlan dooro Subject', ''); return; }
            swalConfirmAction({
              title: t('swal.titles.confirmDelete'),
              text: btn.confirmText || t('entity.confirmDeleteRecord', 'Are you sure you want to delete this record?'),
              confirmText: t('swal.buttons.yesDelete'),
              confirmColor: '#dc2626',
              onConfirm: async () => {
                const params = {
                  p_class: Number(selectedClassId) || 0,
                  p_academic: Number(selectedAcademicYearId) || 0,
                  p_exam: Number(selectedExamId) || 0,
                  p_batch: Number(selectedBatchId) || 0,
                  p_user_id: getSessionUBrIdNum(),
                  ...(btn.withSubject && { p_subject: Number(selectedSubjectId) || 0 }),
                };
                const result = await crud({ operation: 'delete', fn: btn.deleteAction, params });
                if (showDataPanel) {
                  dispatch(loadData(loadPayload(activeEntityKey, entity.currentPage || 1, limit, entity.searchQuery, activeExtra)));
                }
                return { message: result?.message };
              },
            });
          } else if (isBulkAction && bulkForm) {
            // Hubi filter-yada looga baahan yahay si bulk form-ku u helo context buuxa
            // (e.g. "Add New" ee Assign Class Exam ayaa u baahan academicYearId).
            if (btn.requiresAcademic && (!selectedAcademicYearId || String(selectedAcademicYearId).trim() === '')) {
              swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
              return;
            }
            setViewMode('form');
          } else if (btn.actionModal) {
            // Custom modal action — onCustomAction-ka waxaa lagu kala soo dhigaa
            // AcademicSetup.jsx, kaas oo soo bandhiga modal saxda ah.
            if (btn.requiresAcademic && (!selectedAcademicYearId || String(selectedAcademicYearId).trim() === '')) {
              swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
              return;
            }
            onCustomAction?.(btn.actionModal, {
              academicYearId: academicYearIdForLoad,
              cl_id: classIdForLoad,
              b_id: batchIdForLoad,
              ex_id: examIdForLoad,
              lev_id: levelIdForLoad,
            });
          } else if (isAddNew) {
            onEdit(btn.modalKey)(null, { cl_id: classIdForLoad, b_id: batchIdForLoad, lev_id: levelIdForLoad, ex_id: examIdForLoad, academicYearId: academicYearIdForLoad });
          } else if (btn.skipFilterValidation) {
            // "Show Data All" style — load with whatever filters happen to be set, but
            // don't refuse on missing selections.
            onShowData(btn.id, academicYearIdForLoad, classIdForLoad, batchIdForLoad, levelIdForLoad, examIdForLoad, responsibleIdForLoad, studentIdForLoad, subjectIdForLoad);
          } else {
            // Filter-validation: haddii btn.requires array uu jiro, kaliya
            // filter-yadaas ayaa la hubinayaa (eg. Show All wuxuu u baahan
            // yahay "academic" oo kaliya — ma raadinayo class/batch).
            const reqs = Array.isArray(btn.requires) ? btn.requires : null;
            const need = (k, fallback) => (reqs ? reqs.includes(k) : fallback);
            if (need('level', showLevelSelect) && (!selectedLevelId || String(selectedLevelId).trim() === '')) {
              swalError('Fadlan dooro Level', '');
              return;
            }
            if (need('academic', showAcademicYearSelect) && (!selectedAcademicYearId || String(selectedAcademicYearId).trim() === '')) {
              swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
              return;
            }
            if (need('exam', showExamSelect) && (!selectedExamId || String(selectedExamId).trim() === '')) {
              swalError('Fadlan dooro Exam', '');
              return;
            }
            if (need('class', showClassSelect) && (!selectedClassId || String(selectedClassId).trim() === '')) {
              swalError('Fadlan dooro Class', '');
              return;
            }
            if (need('batch', showBatchSelect) && (!selectedBatchId || String(selectedBatchId).trim() === '')) {
              swalError('Fadlan dooro Batch', '');
              return;
            }
            if (need('subject', showSubjectSelect) && (!selectedSubjectId || String(selectedSubjectId).trim() === '')) {
              swalError('Fadlan dooro Subject', '');
              return;
            }
            if (need('student', showStudentSelect) && (!selectedStudentId || String(selectedStudentId).trim() === '')) {
              swalError(t('entity.selectStudent', 'Dooro Arday'), '');
              return;
            }
            onShowData(btn.id, academicYearIdForLoad, classIdForLoad, batchIdForLoad, levelIdForLoad, examIdForLoad, responsibleIdForLoad, studentIdForLoad, subjectIdForLoad);
          }
        };
        return (
          <Button
            key={btn.id}
            size="sm"
            variant="primary"
            leftIcon={<BtnIcon className="w-4 h-4" />}
            onClick={handleClick}
            disabled={!isAddNew && entity.isLoading}
          >
            { tr(btn) }
          </Button>
        );
      })}
      {!hideAddNew && !loadBtns.some((b) => b.modalKey) && modalKey && (
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (bulkForm) {
              setViewMode('form');
            } else {
              onEdit(modalKey)(null, { cl_id: classIdForLoad, b_id: batchIdForLoad, lev_id: levelIdForLoad, ex_id: examIdForLoad, academicYearId: academicYearIdForLoad });
            }
          }}
        >
          {t('entity.addNew')}
        </Button>
      )}
      {extraHeaderActions}
    </>
  );

  const emptyDesc = t('entity.loadHint');

  const handleSearchSubmit = useCallback(() => {
    dispatch(setCurrentPage({ entityKey: activeEntityKey, value: 1 }));
    if (!isFullyLoaded) {
      dispatch(loadData(loadPayload(activeEntityKey, 1, limit, entity.searchQuery, activeExtra)));
    }
  }, [activeEntityKey, limit, dispatch, entity.searchQuery, activeExtra, isFullyLoaded]);

  // Skip auto-load haddii filter loo baahan yahay aanu la dooran. Ka hortagga
  // wicitaan SQL ah oo soo celin doona "column 'nan' does not exist" markii
  // user-ku tab-ka ku soo noqdo selection-la'aan.
  const requiredFilterMissing = (
    (showAcademicYearSelect && !String(selectedAcademicYearId || '').trim()) ||
    (showClassSelect && !String(selectedClassId || '').trim()) ||
    (showBatchSelect && !String(selectedBatchId || '').trim()) ||
    (showLevelSelect && !String(selectedLevelId || '').trim()) ||
    (showExamSelect && !String(selectedExamId || '').trim()) ||
    (showSubjectSelect && !String(selectedSubjectId || '').trim()) ||
    (showStudentSelect && !String(selectedStudentId || '').trim())
  );

  // Search debouncer: re-runs when entity/limit/filters change too, but those paths
  // (onShowData, handlePageSizeChange, doDelete) already dispatch loadData directly —
  // so on context change we just sync both refs and skip, only firing on real
  // searchQuery edits. Bug-kii hore: marka context-ku bedelo, ka dib re-render kale
  // ka dhasho (e.g. entity.searchQuery: undefined → ''), debouncer-ku wuu fire
  // gareyey oo isugu wici jiray /data mar labaad — sababtoo ah lastContextRef
  // hore loo dejiyay, oo ma jirin wax searchQuery la barbar-dhig lahaa.
  const lastContextRef = useRef('');
  const lastSearchRef = useRef(undefined);
  useEffect(() => {
    if (!showDataPanel) return;
    if (requiredFilterMissing) return;
    const currentContext = `${activeEntityKey}|${limit}|${JSON.stringify(activeExtra)}`;
    if (lastContextRef.current !== currentContext) {
      // Context cusub: dejii labada ref-ba si debouncer-ku uusan u fire-garayn
      // ilaa user-ku dhab ahaan wax ka beddelo searchQuery-ga.
      lastContextRef.current = currentContext;
      lastSearchRef.current = entity.searchQuery;
      return;
    }
    // Isla context — kaliya fire haddii searchQuery dhab ahaan bedelay.
    if (lastSearchRef.current === entity.searchQuery) return;
    lastSearchRef.current = entity.searchQuery;
    // Marka data oo dhan horeba la qaaday (prePaginated), DB-ga lagu wici maayo
    // — kaliya currentPage ayaa la dib u dhigayaa, search-ka client-side ayaa
    // lagu sameeyo (sii eeg displayedData/displayedTotal hoose).
    if (isFullyLoaded) {
      const t = setTimeout(() => {
        dispatch(setCurrentPage({ entityKey: activeEntityKey, value: 1 }));
      }, 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      dispatch(setCurrentPage({ entityKey: activeEntityKey, value: 1 }));
      dispatch(loadData(loadPayload(activeEntityKey, 1, limit, entity.searchQuery, activeExtra)));
    }, 300);
    return () => clearTimeout(t);
  }, [entity.searchQuery, showDataPanel, activeEntityKey, limit, dispatch, activeExtra, requiredFilterMissing, isFullyLoaded]);


  if (bulkForm && viewMode === 'form') {
    return (
      <>
        <Card className="overflow-hidden rounded-2xl shadow-[0_4px_20px_-8px_rgba(11,60,93,0.15)] border border-slate-200/70 dark:border-slate-700/80 bg-white dark:bg-slate-900/90">
          <div className="relative z-10 flex flex-wrap items-center gap-2 border-b border-slate-200/70 dark:border-slate-600/60 px-4 py-3 bg-white dark:bg-slate-900/95">
            {headerActions}
          </div>
          <div className="p-4">
            {bulkForm({
              context: { cl_id: classIdForLoad, b_id: batchIdForLoad, lev_id: levelIdForLoad, ex_id: examIdForLoad, academicYearId: academicYearIdForLoad, res_id: responsibleIdForLoad },
              onSuccess: () => {
                setViewMode('data');
                if (showDataPanel) {
                  dispatch(loadData(loadPayload(activeEntityKey, entity.currentPage || 1, limit, entity.searchQuery, activeExtra)));
                }
              },
              onCancel: () => setViewMode('data'),
            })}
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
    <DataTableCard
      showDataPanel={showDataPanel}
      searchPlaceholder={t('entity.search')}
      searchValue={entity.searchQuery}
      onSearchChange={(e) => dispatch(setSearchQuery({ entityKey: activeEntityKey, value: e.target.value }))}
      onSearchSubmit={handleSearchSubmit}
      headerActions={headerActions}
      emptyTitleClickToLoad={t('entity.noLoaded')}
      emptyDescClickToLoad={t('entity.loadHint')}
      emptyIconClickToLoad={Icon}
      columns={columns?.length ? columns : [{ key: 'id', label: 'ID' }]}
      data={displayedData}
      isLoading={entity.isLoading}
      error={entity.error}
      errorHint="Backend: npm start. DB: npm run init-db"
      emptyIcon={Icon}
      emptyTitle={fallbackMessage || t('entity.notFound')}
      emptyDescription=""
      hasActions
      renderActions={isMarksEntry ? undefined : renderActions}
      editableColumns={editableColumns}
      editableMaxField={editableMaxField}
      editValues={editValues}
      onEditChange={onEditChange}
      rowKey="id"
      footerActions={isMarksEntry && paginatedData?.length ? (
        <Button
          variant="primary"
          leftIcon={<Save className="w-5 h-5" />}
          onClick={handleGenerate}
          disabled={isSubmitting}
          className="px-10 py-3 text-base font-semibold tracking-wide bg-gradient-to-r from-[#0f3d5e] to-[#1e5a7e] hover:from-[#0a2a3d] hover:to-[#0f3d5e] shadow-lg shadow-[#0f3d5e]/30 hover:shadow-xl hover:shadow-[#0f3d5e]/40 hover:-translate-y-0.5 transition-all duration-200"
        >
          {isSubmitting ? 'KAYDINTA…' : 'GENERATE'}
        </Button>
      ) : null}
      total={displayedTotal}
      currentPage={entity.currentPage}
      totalPages={displayedTotalPages}
      itemsPerPage={limit}
      onPreviousPage={() => goToPage(Math.max(1, entity.currentPage - 1))}
      onNextPage={() => goToPage(Math.min(displayedTotalPages, entity.currentPage + 1))}
      onPageClick={goToPage}
      onPageSizeChange={handlePageSizeChange}
    />
    </>
  );
}

export default forwardRef(EntityTab);

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { swalSuccess, swalConfirm, swalError } from '../utils/swal';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import ActionButton from '../components/ui/ActionButton';
import Select2 from '../components/ui/Select2';
import DataTableCard from '../components/DataTableCard';
import Card from '../components/ui/Card';
import { CRUD_CONFIG } from '../config/crudConfig';
import { makeOptionLoader } from '../services/api';
import {
  loadData,
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

/** Server-side: api/data supports page, limit, search. Pagination + search waa API. */
const loadPayload = (entityKey, page, limit, search, extra = {}) => ({
  queryName: entityKey,
  page,
  limit: limit || 10,
  ...(search != null && String(search).trim() && { search: String(search).trim() }),
  ...extra,
});

const CHEVRON_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231F2937'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E";

export default function EntityTab({
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
  showResponsibleSelect = false,
  responsibleOptionsQuery,
  hiddenColumns,
  extraRowActions,
  extraHeaderActions,
  extraLoadParams,
  bulkForm,
}) {
  const { t } = useTranslation();
  const tr = (btn) => {
    if (btn.labelKey) return t(btn.labelKey, btn.label);
    if (btn.id === 'addNew') return t('entity.addNew');
    return btn.label;
  };
  const [activeEntityKey, setActiveEntityKey] = useState(entityKey);
  const [activeExtra, setActiveExtra] = useState({});
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('');
  const [selectedResponsibleLabel, setSelectedResponsibleLabel] = useState('');

  const entity = useSelector(selectEntity(activeEntityKey)) ?? {};
  const rawColumns = useSelector(selectColumns(activeEntityKey));
  const columns = hiddenColumns?.length
    ? (rawColumns || []).filter((c) => !hiddenColumns.includes(c.key))
    : rawColumns;
  const paginatedData = useSelector(selectPaginatedData(activeEntityKey));
  const totalPages = useSelector(selectTotalPages(activeEntityKey));
  const totalRows = useSelector(selectTotalRows(activeEntityKey)) ?? paginatedData?.length ?? 0;

  const config = CRUD_CONFIG[modalKey];
  const label = toLabel(entityKey);
  const loadBtns = loadButtons ?? [{ id: entityKey, label: `Load ${label}` }];
  const limit = entity.itemsPerPage || 10;
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [viewMode, setViewMode] = useState('data'); // 'data' | 'form'
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedAcademicYearLabel, setSelectedAcademicYearLabel] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassLabel, setSelectedClassLabel] = useState('');

  // Automatic: haddii academicYearOptionsQuery la gudbin waayo, default waa academicYeartab
  const optionsQuery = academicYearOptionsQuery ?? DEFAULT_ACADEMIC_YEAR_OPTIONS_QUERY;
  const clsOptionsQuery = classOptionsQuery ?? 'class_options';
  const resOptionsQuery = responsibleOptionsQuery ?? 'responsible_options';

  // Lazy loaders — dropdown opens / user types → server fetches first 25 (search beyond that).
  // No fetches happen on tab mount; the user picks the year/class/responsible from the dropdown.
  const acadLoader = useMemo(() => makeOptionLoader(optionsQuery), [optionsQuery]);
  const classLoader = useMemo(() => makeOptionLoader(clsOptionsQuery), [clsOptionsQuery]);
  const respLoader = useMemo(() => makeOptionLoader(resOptionsQuery), [resOptionsQuery]);

  const academicYearIdForLoad = showAcademicYearSelect ? selectedAcademicYearId : undefined;
  const classIdForLoad = showClassSelect ? selectedClassId : undefined;
  const responsibleIdForLoad = showResponsibleSelect ? selectedResponsibleId : undefined;

  const buildExtra = useCallback(
    (academicYearId, classId, responsibleId) => ({
      ...(academicYearId != null && String(academicYearId).trim() && { academicYearId: String(academicYearId).trim() }),
      ...(classId != null && String(classId).trim() && { cl_id: String(classId).trim() }),
      ...(responsibleId != null && String(responsibleId).trim() && { res_id: String(responsibleId).trim() }),
      ...extraLoadParams,
    }),
    [extraLoadParams]
  );

  const onShowData = useCallback(
    (btnId, academicYearId, classId, responsibleId) => {
      const extra = buildExtra(academicYearId, classId, responsibleId);
      setViewMode('data');
      setShowDataPanel(true);
      setActiveEntityKey(btnId);
      setActiveExtra(extra);
      dispatch(loadData(loadPayload(btnId, 1, limit, '', extra)));
    },
    [limit, dispatch, buildExtra]
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

  const goToPage = useCallback(
    (page) => {
      dispatch(setCurrentPage({ entityKey: activeEntityKey, value: page }));
      dispatch(loadData(loadPayload(activeEntityKey, page, limit, entity.searchQuery, activeExtra)));
    },
    [activeEntityKey, limit, dispatch, activeExtra, entity.searchQuery]
  );

  const handlePageSizeChange = useCallback(
    (newSize) => {
      dispatch(setItemsPerPage({ entityKey: activeEntityKey, value: newSize }));
      dispatch(setCurrentPage({ entityKey: activeEntityKey, value: 1 }));
      dispatch(loadData(loadPayload(activeEntityKey, 1, newSize, entity.searchQuery, activeExtra)));
    },
    [activeEntityKey, dispatch, activeExtra, entity.searchQuery]
  );

  const renderActions = useCallback(
    (row) => (
      <div className="flex justify-center gap-1">
        {extraRowActions && extraRowActions(row)}
        <ActionButton variant="edit" aria-label="Edit" onClick={() => onEdit(modalKey)(row, { cl_id: classIdForLoad, academicYearId: academicYearIdForLoad })}>
          <Pencil className="w-4 h-4" />
        </ActionButton>
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
    ),
    [modalKey, onEdit, doDelete, extraRowActions, classIdForLoad, academicYearIdForLoad]
  );

  const headerActions = (
    <>
      {showAcademicYearSelect && (
        <div className="min-w-[200px]">
          <Select2
            name="academicYear"
            value={selectedAcademicYearId}
            selectedLabel={selectedAcademicYearLabel}
            onChange={(e) => { setSelectedAcademicYearId(e.target.value); setSelectedAcademicYearLabel(e.target.label || ''); }}
            loadOptions={acadLoader}
            placeholder={t('entity.selectAcademic')}
            isClearable={false}
          />
        </div>
      )}
      {showClassSelect && (
        <div className="min-w-[180px]">
          <Select2
            name="classSelect"
            value={selectedClassId}
            selectedLabel={selectedClassLabel}
            onChange={(e) => { setSelectedClassId(e.target.value); setSelectedClassLabel(e.target.label || ''); }}
            loadOptions={classLoader}
            placeholder="Select Class"
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
            placeholder="Select Responsible"
            isClearable={false}
          />
        </div>
      )}
      {loadBtns.map((btn) => {
        const BtnIcon = btn.icon ?? Icon;
        const isBulkAction = !!btn.isBulkAction;
        const isAddNew = !!btn.modalKey;
        const handleClick = () => {
          if (isBulkAction && bulkForm) {
            setViewMode('form');
          } else if (isAddNew) {
            onEdit(btn.modalKey)(null, { cl_id: classIdForLoad, academicYearId: academicYearIdForLoad });
          } else {
            onShowData(btn.id, academicYearIdForLoad, classIdForLoad, responsibleIdForLoad);
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
      {!loadBtns.some((b) => b.modalKey) && modalKey && (
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (bulkForm) {
              setViewMode('form');
            } else {
              onEdit(modalKey)(null, { cl_id: classIdForLoad, academicYearId: academicYearIdForLoad });
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
    dispatch(loadData(loadPayload(activeEntityKey, 1, limit, entity.searchQuery, activeExtra)));
  }, [activeEntityKey, limit, dispatch, entity.searchQuery, activeExtra]);

  useEffect(() => {
    if (!showDataPanel) return;
    const t = setTimeout(() => {
      dispatch(setCurrentPage({ entityKey: activeEntityKey, value: 1 }));
      dispatch(loadData(loadPayload(activeEntityKey, 1, limit, entity.searchQuery, activeExtra)));
    }, 300);
    return () => clearTimeout(t);
  }, [entity.searchQuery, showDataPanel, activeEntityKey, limit, dispatch, activeExtra]);


  if (bulkForm && viewMode === 'form') {
    return (
      <>
        <Card className="overflow-hidden rounded-2xl shadow-[0_4px_20px_-8px_rgba(11,60,93,0.15)] border border-slate-200/70 dark:border-slate-700/80 bg-white dark:bg-slate-900/90">
          <div className="relative z-10 flex flex-wrap items-center gap-3 border-b border-slate-200/70 dark:border-slate-600/60 px-4 py-3 bg-white dark:bg-slate-900/95">
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0 ml-auto">{headerActions}</div>
          </div>
          <div className="p-4">
            {bulkForm({
              context: { cl_id: classIdForLoad, academicYearId: academicYearIdForLoad, res_id: responsibleIdForLoad },
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
      data={paginatedData}
      isLoading={entity.isLoading}
      error={entity.error}
      errorHint="Backend: npm start. DB: npm run init-db"
      emptyIcon={Icon}
      emptyTitle={t('entity.notFound')}
      emptyDescription=""
      hasActions
      renderActions={renderActions}
      total={totalRows}
      currentPage={entity.currentPage}
      totalPages={totalPages}
      itemsPerPage={limit}
      onPreviousPage={() => goToPage(Math.max(1, entity.currentPage - 1))}
      onNextPage={() => goToPage(Math.min(totalPages, entity.currentPage + 1))}
      onPageClick={goToPage}
      onPageSizeChange={handlePageSizeChange}
    />
    </>
  );
}

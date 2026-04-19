import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { swalSuccess, swalConfirm, swalError } from '../utils/swal';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import ActionButton from '../components/ui/ActionButton';
import DataTableCard from '../components/DataTableCard';
import { CRUD_CONFIG } from '../config/crudConfig';
import { fetchSelectOptions } from '../services/api';
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
const loadPayload = (entityKey, page, limit, academicYearId, search) => ({
  queryName: entityKey,
  page,
  limit: limit || 10,
  ...(academicYearId != null && String(academicYearId).trim() && { academicYearId: String(academicYearId).trim() }),
  ...(search != null && String(search).trim() && { search: String(search).trim() }),
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
  hiddenColumns,
}) {
  const { t } = useTranslation();
  const tr = (btn) => {
    if (btn.labelKey) return t(btn.labelKey, btn.label);
    if (btn.id === 'addNew') return t('entity.addNew');
    return btn.label;
  };
  const entity = useSelector(selectEntity(entityKey)) ?? {};
  const rawColumns = useSelector(selectColumns(entityKey));
  const columns = hiddenColumns?.length
    ? (rawColumns || []).filter((c) => !hiddenColumns.includes(c.key))
    : rawColumns;
  const paginatedData = useSelector(selectPaginatedData(entityKey));
  const totalPages = useSelector(selectTotalPages(entityKey));
  const totalRows = useSelector(selectTotalRows(entityKey)) ?? paginatedData?.length ?? 0;

  const config = CRUD_CONFIG[modalKey];
  const label = toLabel(entityKey);
  const loadBtns = loadButtons ?? [{ id: entityKey, label: `Load ${label}` }];
  const limit = entity.itemsPerPage || 10;
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [academicYearOptions, setAcademicYearOptions] = useState([]);

  // Automatic: haddii academicYearOptionsQuery la gudbin waayo, default waa academicYeartab
  const optionsQuery = academicYearOptionsQuery ?? DEFAULT_ACADEMIC_YEAR_OPTIONS_QUERY;

  useEffect(() => {
    if (!showAcademicYearSelect) return;
    let cancelled = false;
    fetchSelectOptions(optionsQuery, 100, '')
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data ?? res?.rows ?? [];
        const valueKey = rows[0] && ('id' in rows[0] ? 'id' : Object.keys(rows[0])[0]);
        const labelKey = rows[0] && ('name' in rows[0] ? 'name' : Object.keys(rows[0])[1] || valueKey);
        const opts = rows.map((r) => ({ value: String(r[valueKey] ?? ''), label: String(r[labelKey] ?? r[valueKey] ?? '') }));
        setAcademicYearOptions(opts);
        if (opts.length > 0 && !selectedAcademicYearId) setSelectedAcademicYearId(opts[0].value);
      })
      .catch(() => setAcademicYearOptions([]));
    return () => { cancelled = true; };
  }, [showAcademicYearSelect, optionsQuery]);

  const academicYearIdForLoad = showAcademicYearSelect ? selectedAcademicYearId : undefined;

  const onShowData = useCallback(
    (btnId, academicYearId) => {
      setShowDataPanel(true);
      dispatch(loadData(loadPayload(btnId, 1, limit, academicYearId, '')));
    },
    [limit, dispatch]
  );

  const doDelete = useCallback(
    async (row) => {
      try {
        await deleteRow(row, config, () => {
          dispatch(loadData(loadPayload(entityKey, entity.currentPage, limit, academicYearIdForLoad, entity.searchQuery)));
          swalSuccess('Wa la guulaystey', 'Xogtada waa la tirtay.');
        });
      } catch (err) {
        swalError('Khalad ayaa dhacay', err.message || 'Tirtirku wuu ku fashilmay.');
      }
    },
    [config, entityKey, limit, dispatch, academicYearIdForLoad, entity.currentPage, entity.searchQuery]
  );

  const goToPage = useCallback(
    (page) => {
      dispatch(setCurrentPage({ entityKey, value: page }));
      dispatch(loadData(loadPayload(entityKey, page, limit, academicYearIdForLoad, entity.searchQuery)));
    },
    [entityKey, limit, dispatch, academicYearIdForLoad, entity.searchQuery]
  );

  const handlePageSizeChange = useCallback(
    (newSize) => {
      dispatch(setItemsPerPage({ entityKey, value: newSize }));
      dispatch(setCurrentPage({ entityKey, value: 1 }));
      dispatch(loadData(loadPayload(entityKey, 1, newSize, academicYearIdForLoad, entity.searchQuery)));
    },
    [entityKey, dispatch, academicYearIdForLoad, entity.searchQuery]
  );

  const renderActions = useCallback(
    (row) => (
      <div className="flex justify-center gap-1">
        <ActionButton variant="edit" aria-label="Edit" onClick={() => onEdit(modalKey)(row)}>
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
    [modalKey, onEdit, doDelete]
  );

  const headerActions = (
    <>
      {showAcademicYearSelect && (
        <select
          className="min-w-[180px] cursor-pointer appearance-none rounded border border-[#D1D5DB] bg-white py-2 pl-4 pr-9 text-sm font-normal text-[#374151] focus:border-gray-400 focus:outline-none"
          style={{
            backgroundImage: `url(${CHEVRON_SVG})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.5rem center',
            backgroundSize: '1rem',
          }}
          value={selectedAcademicYearId}
          onChange={(e) => setSelectedAcademicYearId(e.target.value)}
        >
          <option value="">{t('entity.selectAcademic')}</option>
          {academicYearOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      {loadBtns.map((btn) => {
        const BtnIcon = btn.icon ?? Icon;
        const isAddNew = !!btn.modalKey;
        return (
          <Button
            key={btn.id}
            size="sm"
            variant="primary"
            leftIcon={<BtnIcon className="w-4 h-4" />}
            onClick={() =>
              isAddNew ? onEdit(btn.modalKey)(null) : onShowData(btn.id, academicYearIdForLoad)
            }
            disabled={!isAddNew && entity.isLoading}
          >
            { tr(btn) }
          </Button>
        );
      })}
      {!loadBtns.some((b) => b.modalKey) && modalKey && (
        <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => onEdit(modalKey)(null)}>
          {t('entity.addNew')}
        </Button>
      )}
    </>
  );

  const emptyDesc = t('entity.loadHint');

  const handleSearchSubmit = useCallback(() => {
    dispatch(setCurrentPage({ entityKey, value: 1 }));
    dispatch(loadData(loadPayload(entityKey, 1, limit, academicYearIdForLoad, entity.searchQuery)));
  }, [entityKey, limit, academicYearIdForLoad, dispatch, entity.searchQuery]);

  return (
    <DataTableCard
      showDataPanel={showDataPanel}
      searchPlaceholder={t('entity.search')}
      searchValue={entity.searchQuery}
      onSearchChange={(e) => dispatch(setSearchQuery({ entityKey, value: e.target.value }))}
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
      emptyTitle={t('entity.noLoaded')}
      emptyDescription={emptyDesc}
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
  );
}

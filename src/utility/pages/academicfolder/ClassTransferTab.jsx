import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Pencil, Combine, Split, Save, XCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { makeOptionLoader } from '../../../services/api';

/**
 * ClassTransferTab — UI shell ee tab Class Transfer.
 * Backend functions waxa diyaarinaayo user-ka.
 */
/** Hook helper: pair of [id,label] state with a setter that takes a Select2 onChange event. */
function useSelect(initial = '') {
  const [val, setVal] = useState({ id: initial, label: '' });
  const setFromEvent = (e) => setVal({ id: e.target.value, label: e.target.label || '' });
  const reset = () => setVal({ id: '', label: '' });
  return [val.id, val.label, setFromEvent, reset];
}

export default function ClassTransferTab() {
  const { t } = useTranslation();
  const STATE_OPTIONS = useMemo(() => ([
    { value: 'Active', label: t('studentState.active') },
    { value: 'Inactive', label: t('studentState.inactive') },
  ]), [t]);
  /* ── Lazy loaders (server-side: 25 default + search beyond) ── */
  const classLoader    = useMemo(() => makeOptionLoader('class_options'), []);
  const batchLoader    = useMemo(() => makeOptionLoader('batch_options'), []);
  const academicLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);

  /* ── Top toolbar 3 selects ── */
  const [filterClass,    filterClassLabel,    setFilterClass]    = useSelect();
  const [filterBatch,    filterBatchLabel,    setFilterBatch]    = useSelect();
  const [filterAcademic, filterAcademicLabel, setFilterAcademic] = useSelect();

  /* ── Editable table data (after Edit) ── */
  const [tableData, setTableData] = useState([]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);

  /* ── Modal state ── */
  const [openModal, setOpenModal] = useState(null); // 'combination' | 'division' | null

  /* ── Combination form ── */
  const [combFromId, combFromLabel, setCombFrom, resetCombFrom] = useSelect();
  const [combToId,   combToLabel,   setCombTo,   resetCombTo]   = useSelect();

  /* ── Division form ── */
  const [divClassId,   divClassLabel,   setDivClass,   resetDivClass]   = useSelect();
  const [divSex, setDivSex] = useState('');
  const [divClassToId, divClassToLabel, setDivClassTo, resetDivClassTo] = useSelect();
  const [divStudentCount, setDivStudentCount] = useState(0);

  /* ── Edit button: load students of the chosen filters ── */
  const handleEdit = async () => {
    setLoadingTable(true);
    try {
      // TODO: backend query la xidhi (class_transfer_students_sp ama similar)
      // Placeholder: empty list — kaliya UI shell hada.
      setTableData([]);
      setTableLoaded(true);
    } finally {
      setLoadingTable(false);
    }
  };

  /* ── Per-row updates ── */
  const updateRow = (idx, field, value) => {
    setTableData((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  /* ── Update Data action ── */
  const handleUpdateData = async () => {
    // TODO: bulk update_class_transfer_sp (tableData ku gudbi)
  };

  /* ── Modal open/close ── */
  const closeModal = () => {
    setOpenModal(null);
    resetCombFrom(); resetCombTo();
    resetDivClass(); setDivSex(''); resetDivClassTo(); setDivStudentCount(0);
  };

  const handleCombination = async () => {
    // TODO: class_combination_sp
    closeModal();
  };

  const handleDivision = async () => {
    // TODO: class_division_sp
    closeModal();
  };

  /* When division class + sex chosen → fetch student count (TODO) */
  useEffect(() => {
    if (openModal !== 'division' || !divClassId || !divSex) {
      setDivStudentCount(0);
      return;
    }
    // TODO: backend count_students_by_class_sex_sp(divClassId, divSex)
    setDivStudentCount(0);
  }, [openModal, divClassId, divSex]);

  return (
    <div className="space-y-4">
      {/* ── Warning banner ── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">{t('classTransfer.warning')}</span> {t('classTransfer.warningText')}{' '}
          <span className="font-semibold">{t('classTransfer.fg')}</span> {t('classTransfer.fgText')}{' '}
          <span className="font-semibold text-blue-700">{t('classTransfer.academicTransferLink')}</span>
        </p>
      </div>

      {/* ── Toolbar: selects + buttons in one row (like BranchTransfer) ── */}
      <div className="flex flex-wrap items-end gap-2 px-3 py-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
        <div className="min-w-[160px] flex-1">
          <Select2
            name="filterClass"
            value={filterClass}
            selectedLabel={filterClassLabel}
            onChange={setFilterClass}
            loadOptions={classLoader}
            placeholder={t('select.class')}
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <Select2
            name="filterBatch"
            value={filterBatch}
            selectedLabel={filterBatchLabel}
            onChange={setFilterBatch}
            loadOptions={batchLoader}
            placeholder={t('select.batch')}
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <Select2
            name="filterAcademic"
            value={filterAcademic}
            selectedLabel={filterAcademicLabel}
            onChange={setFilterAcademic}
            loadOptions={academicLoader}
            placeholder={t('select.academicYear')}
          />
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Pencil className="w-4 h-4" />}
          onClick={handleEdit}
          disabled={!filterClass || !filterBatch || !filterAcademic || loadingTable}
        >
          {t('common.edit')}
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Combine className="w-4 h-4" />}
          onClick={() => setOpenModal('combination')}
        >
          {t('classTransfer.classCombination')}
        </Button>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Split className="w-4 h-4" />}
          onClick={() => setOpenModal('division')}
        >
          {t('classTransfer.classDivision')}
        </Button>
      </div>

      {/* ── Editable table ── */}
      {tableLoaded && (
        <div className="rounded-xl border border-slate-200/70 overflow-hidden bg-white">
          {tableData.length === 0 ? (
            <div className="py-10">
              <EmptyState
                title={t('empty.noData')}
                description={t('empty.noDataFilters')}
              />
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-[#0B3C5D] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">{t('classTransfer.cols.name')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('classTransfer.cols.class')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('classTransfer.cols.batch')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('classTransfer.cols.state')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={row.std_id ?? idx} className="border-t border-slate-200/60">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.std_name ?? ''}
                          onChange={(e) => updateRow(idx, 'std_name', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select2
                          name={`class-${idx}`}
                          value={String(row.cl_id ?? '')}
                          selectedLabel={row.cl_label ?? ''}
                          onChange={(e) => { updateRow(idx, 'cl_id', e.target.value); updateRow(idx, 'cl_label', e.target.label || ''); }}
                          loadOptions={classLoader}
                          placeholder={t('select.class')}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select2
                          name={`batch-${idx}`}
                          value={String(row.batch_id ?? '')}
                          selectedLabel={row.batch_label ?? ''}
                          onChange={(e) => { updateRow(idx, 'batch_id', e.target.value); updateRow(idx, 'batch_label', e.target.label || ''); }}
                          loadOptions={batchLoader}
                          placeholder={t('select.batch')}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select2
                          name={`state-${idx}`}
                          value={String(row.state ?? '')}
                          onChange={(e) => updateRow(idx, 'state', e.target.value)}
                          options={STATE_OPTIONS}
                          placeholder={t('select.state')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-3 border-t border-slate-200/70 bg-slate-50">
                <Button
                  variant="primary"
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleUpdateData}
                  className="w-full justify-center"
                >
                  {t('classTransfer.updateData')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Class Combination Modal ── */}
      <Modal
        isOpen={openModal === 'combination'}
        onClose={closeModal}
        title={t('classTransfer.classCombinationForm')}
        size="md"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>{t('common.close')}</Button>
            <Button
              variant="primary"
              leftIcon={<Combine className="w-4 h-4" />}
              onClick={handleCombination}
              disabled={!combFromId || !combToId}
            >
              {t('classTransfer.combination')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select2
            name="combFrom"
            value={combFromId}
            selectedLabel={combFromLabel}
            onChange={setCombFrom}
            loadOptions={classLoader}
            placeholder={t('select.classFrom')}
          />
          <Select2
            name="combTo"
            value={combToId}
            selectedLabel={combToLabel}
            onChange={setCombTo}
            loadOptions={classLoader}
            placeholder={t('select.classTo')}
          />
        </div>
      </Modal>

      {/* ── Class Division Modal ── */}
      <Modal
        isOpen={openModal === 'division'}
        onClose={closeModal}
        title={t('classTransfer.classDivisionForm')}
        size="md"
        bodyClassName="space-y-3"
        footer={
          <>
            <Button variant="ghost" leftIcon={<XCircle className="w-4 h-4" />} onClick={closeModal}>{t('common.close')}</Button>
            <Button
              variant="primary"
              leftIcon={<Split className="w-4 h-4" />}
              onClick={handleDivision}
              disabled={!divClassId || !divSex || !divClassToId}
            >
              {t('classTransfer.combination')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Select2
              name="divClass"
              value={divClassId}
              selectedLabel={divClassLabel}
              onChange={setDivClass}
              loadOptions={classLoader}
              placeholder={t('select.class')}
            />
            <p className="mt-1.5 text-xs font-medium text-emerald-600">
              {t('classTransfer.noOfStudents')} <span className="font-semibold">{divStudentCount}</span>
            </p>
          </div>
          <Select2
            name="divSex"
            value={divSex}
            onChange={(e) => setDivSex(e.target.value)}
            options={[
              { value: 'Male', label: t('classTransfer.male') },
              { value: 'Female', label: t('classTransfer.female') },
            ]}
            placeholder={t('select.sex')}
          />
          <div className="sm:col-start-2">
            <Select2
              name="divClassTo"
              value={divClassToId}
              selectedLabel={divClassToLabel}
              onChange={setDivClassTo}
              loadOptions={classLoader}
              placeholder={t('select.class')}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

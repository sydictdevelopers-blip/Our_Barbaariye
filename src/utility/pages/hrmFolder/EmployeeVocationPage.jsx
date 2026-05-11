import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Database, Plus, Pencil, Trash2, Plane, RefreshCw } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Tabs from '../../../components/ui/Tabs';
import Button from '../../../components/ui/Button';
import Select2 from '../../../components/ui/Select2';
import DataTableCard from '../../../components/DataTableCard';
import CrudModal from '../../../modals/CrudModal';
import { CRUD_CONFIG } from '../../../config/crudConfig';
import { crud, fetchDataPaginated, makeOptionLoader } from '../../../services/api';
import { swalError, swalSuccess, swalConfirm } from '../../../utils/swal';

const compactSelectStyle = {
  control: (base) => ({ ...base, minHeight: '40px', height: '40px', fontSize: '14px', borderRadius: '12px' }),
  valueContainer: (base) => ({ ...base, padding: '0 12px' }),
  indicatorsContainer: (base) => ({ ...base, height: '40px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
};

export default function EmployeeVocationPage() {
  const { t } = useTranslation();
  const sessionBrId = useSelector((s) => s?.ui?.user?.br_id ?? '');

  const [empId, setEmpId] = useState('');
  const [empLabel, setEmpLabel] = useState('');
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [modal, setModal] = useState({ open: false, editRow: null });

  const employeeLoader = useMemo(
    () => makeOptionLoader('employee_options', null, { valueKey: 'emp_id', labelKey: 'p_name' }),
    []
  );

  const config = CRUD_CONFIG.EmployeeVocations;

  // Single-pill tab descriptor — re-uses the Tabs component so the page header
  // shares one visual language with EmployeeOfficeTabs.
  const headerTab = useMemo(
    () => [{ id: 'vocation', label: t('hrm.vocations.title'), icon: Plane }],
    [t]
  );

  const loadRows = useCallback(async () => {
    if (!empId) {
      swalError(t('swal.titles.warning'), t('hrm.vocations.selectFirst'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetchDataPaginated({
        queryName: 'EmployeeVocations',
        page: 1,
        limit: 100,
        emp_id: empId,
      });
      const data = res?.data ?? [];
      setColumns([{ key: 'info', label: t('hrm.vocations.fields.info') }]);
      setRows(data.length ? data : [{ __empty: true, info: t('hrm.vocations.empty') }]);
      setTableLoaded(true);
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    } finally {
      setLoading(false);
    }
  }, [empId, t]);

  useEffect(() => {
    setRows([]);
    setColumns([]);
    setTableLoaded(false);
  }, [empId]);

  const openAddNew = () => {
    if (!empId) {
      swalError(t('swal.titles.warning'), t('hrm.vocations.selectFirst'));
      return;
    }
    setModal({ open: true, editRow: { emp_id: Number(empId) } });
  };

  const openEdit = (row) => {
    if (row?.__empty) return;
    const seed = config.fromRow ? config.fromRow(row) : row;
    setModal({ open: true, editRow: seed });
  };

  const onDelete = async (row) => {
    if (row?.__empty) return;
    const ok = await swalConfirm({
      title: t('swal.titles.confirmDelete'),
      text: t('entity.confirmDeleteRecord'),
    });
    if (!ok) return;
    try {
      const params = config.toParams
        ? config.toParams({ ...row, ...(config.fromRow?.(row) || {}) })
        : { emp_voc_id_sp: row.emp_voc_id };
      const result = await crud({ operation: 'delete', fn: config.fn, params });
      swalSuccess(t('swal.titles.success'), result || t('swal.texts.deleted'));
      await loadRows();
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || '');
    }
  };

  const renderActions = (row) => {
    if (row?.__empty) return null;
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => openEdit(row)}
          aria-label={t('action.edit')}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(row)}
          aria-label={t('action.delete')}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm shadow-slate-200/60 dark:shadow-slate-900/40">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] to-[#0D9488]" />
        <div className="flex items-center justify-between flex-wrap gap-4 px-5 py-4 min-h-[58px] bg-gradient-to-r from-[#F8FAFC] to-[#EEF2F7] dark:from-slate-800/70 dark:to-slate-800/50 border-b border-slate-200/80 dark:border-slate-700/80">
          <Tabs tabs={headerTab} activeTab="vocation" onTabChange={() => {}} className="flex-1 min-w-0" />
        </div>

        <div className="px-3 pb-4 pt-3 space-y-3">
          {/* Action toolbar — matches EmployeeOfficeTabs / EntityTab toolbar */}
          <div className="flex flex-wrap items-end gap-3 px-2">
            <div className="flex-1 min-w-[240px] max-w-md">
              <Select2
                key={`emp-${sessionBrId}`}
                name="emp_id"
                value={empId}
                selectedLabel={empLabel}
                placeholder={t('hrm.vocations.selectEmployee')}
                loadOptions={employeeLoader}
                onChange={(e) => {
                  setEmpId(e.target.value);
                  setEmpLabel(e.target.label || '');
                }}
                styles={compactSelectStyle}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="md"
                variant="primary"
                leftIcon={<Database className="w-4 h-4" />}
                onClick={loadRows}
                disabled={!empId || loading}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('action.showData')}
              </Button>
              <Button
                size="md"
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={openAddNew}
                disabled={!empId}
              >
                {t('entity.addNew')}
              </Button>
            </div>
          </div>

          {tableLoaded && (
            <DataTableCard
              showDataPanel
              columns={columns}
              data={rows}
              isLoading={loading}
              renderActions={renderActions}
              rowKey="emp_voc_id"
            />
          )}
        </div>
      </Card>

      <CrudModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, editRow: null })}
        config={config}
        initialForm={modal.editRow || {}}
        mode={modal.editRow?.emp_voc_id ? 'update' : 'insert'}
        onSuccess={() => {
          setModal({ open: false, editRow: null });
          loadRows();
        }}
      />
    </div>
  );
}

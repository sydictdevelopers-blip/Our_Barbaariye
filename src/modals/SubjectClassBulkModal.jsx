import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Select2 from '../components/ui/Select2';
import Button from '../components/ui/Button';
import { crud, makeOptionLoader } from '../services/api';
import * as swal from '../utils/swal';

const AUTH_STORAGE_KEY = 'brabaariye_user';
function getSessionUBrId() {
  if (typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage?.getItem(AUTH_STORAGE_KEY);
    if (!stored) return '';
    return JSON.parse(stored)?.u_br_id ?? '';
  } catch {
    return '';
  }
}

const emptyRow = () => ({ emp_id: '', emp_label: '', sub_id: '', sub_label: '', no_of_period: '' });

export default function SubjectClassBulkModal({ isOpen, onClose, onSuccess, context = {} }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(false);

  // Lazy loaders — server-side: 25 default + search beyond.
  const employeeLoader = useMemo(() => makeOptionLoader('employee_options'), []);
  const subjectLoader  = useMemo(() => makeOptionLoader('subject_options'), []);

  useEffect(() => {
    if (!isOpen) return;
    setRows([emptyRow(), emptyRow(), emptyRow()]);
  }, [isOpen]);

  const setField = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };
  const setFields = (index, patch) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const hasContext = !!(context?.cl_id && context?.academicYearId);

  const handleSave = async () => {
    if (!hasContext) {
      swal.swalError(t('subjectClassBulk.errSelectFirst'), '');
      return;
    }
    const valid = rows.filter(
      (r) => r.emp_id && r.sub_id && String(r.no_of_period).trim()
    );
    if (valid.length === 0) {
      swal.swalError(t('subjectClassBulk.errFillRow'), '');
      return;
    }
    setLoading(true);
    const u_br_id = getSessionUBrId();
    const clId = Number(context.cl_id) || 0;
    const ayId = Number(context.academicYearId) || 0;
    try {
      let inserted = 0;
      for (const row of valid) {
        await crud({
          operation: 'insert',
          fn: 'subject_class_sp',
          params: {
            sub_cl_id_sp: 0,
            cl_id_sp: clId,
            sub_id_sp: Number(row.sub_id) || 0,
            emp_id_sp: Number(row.emp_id) || 0,
            no_of_period_sp: Number(row.no_of_period) || 0,
            state_sp: 'Active',
            u_br_id_sp: u_br_id,
            a_y_id_sp: ayId,
          },
        });
        inserted += 1;
      }
      onClose();
      onSuccess?.();
      await swal.swalSuccess(t('swal.titles.success'), t('subjectClassBulk.msgRecordsAdded', { count: inserted }));
    } catch (err) {
      swal.swalError(err?.message || t('subjectClassBulk.errOccurred'), '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('subjectClassBulk.modalTitle')}
      size="xl"
      footer={
        <div className="flex justify-center w-full">
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full max-w-xl"
          >
            {loading ? t('action.updating') : t('subjectClassBulk.addSubjects')}
          </Button>
        </div>
      }
    >
      {!hasContext && (
        <div
          className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          dangerouslySetInnerHTML={{ __html: t('subjectClassBulk.contextWarning') }}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-b from-[#0B3C5D] to-[#072b44] text-white">
              <th className="px-4 py-3 text-left font-semibold rounded-tl-lg">{t('subjectClassBulk.cols.teacher')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('subjectClassBulk.cols.subject')}</th>
              <th className="px-4 py-3 text-left font-semibold">{t('subjectClassBulk.cols.periods')}</th>
              <th className="px-2 py-3 w-12 rounded-tr-lg text-center">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center justify-center w-8 h-8 rounded bg-green-500 hover:bg-green-600 text-white transition-colors"
                  aria-label="Add row"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="p-2 align-top">
                  <Select2
                    name={`emp_${i}`}
                    value={row.emp_id}
                    selectedLabel={row.emp_label}
                    onChange={(e) => setFields(i, { emp_id: e.target.value, emp_label: e.target.label || '' })}
                    loadOptions={employeeLoader}
                    placeholder={t('select.teacher')}
                    isClearable={false}
                  />
                </td>
                <td className="p-2 align-top">
                  <Select2
                    name={`sub_${i}`}
                    value={row.sub_id}
                    selectedLabel={row.sub_label}
                    onChange={(e) => setFields(i, { sub_id: e.target.value, sub_label: e.target.label || '' })}
                    loadOptions={subjectLoader}
                    placeholder={t('subjectClassBulk.selectSubject')}
                    isClearable={false}
                  />
                </td>
                <td className="p-2 align-top">
                  <input
                    type="number"
                    value={row.no_of_period}
                    onChange={(e) => setField(i, 'no_of_period', e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 border-b border-slate-300 focus:outline-none focus:border-[#0B3C5D] bg-transparent"
                  />
                </td>
                <td className="p-2 align-top text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                    aria-label="Remove row"
                    disabled={rows.length <= 1}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

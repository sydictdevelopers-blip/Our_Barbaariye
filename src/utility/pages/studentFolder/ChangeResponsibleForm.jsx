import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { makeOptionLoader } from '../../../services/api';
import Select2 from '../../../components/ui/Select2';
import { swalSuccess, swalError } from '../../../utils/swal';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function getSessionUBrId() {
  try {
    const stored = localStorage.getItem('brabaariye_user');
    if (!stored) return 0;
    return Number(JSON.parse(stored)?.u_br_id ?? 0);
  } catch {
    return 0;
  }
}

export default function ChangeResponsibleForm({ context, onSuccess, onCancel }) {
  const { t } = useTranslation();
  const { res_id } = context ?? {};
  const [rows, setRows] = useState([{ id: Date.now(), std_id: '', std_label: '' }]);
  const [loading, setLoading] = useState(false);

  // Lazy loader (server-side: 25 default + search beyond).
  const studentLoader = useMemo(() => makeOptionLoader('all_student_options'), []);

  const addRow = () => setRows((prev) => [...prev, { id: Date.now(), std_id: '', std_label: '' }]);

  const removeRow = (id) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const setStd = (id, val, label) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, std_id: val, std_label: label } : r)));

  const handleUpdate = async () => {
    if (!res_id) {
      swalError(t('responsibleForm.errSelectResponsible'), t('responsibleForm.errSelectResponsibleDesc'));
      return;
    }
    const selected = rows.filter((r) => r.std_id);
    if (!selected.length) {
      swalError(t('responsibleForm.errSelectStudents'), t('responsibleForm.errSelectStudentsDesc'));
      return;
    }

    const u_br_id = getSessionUBrId();
    setLoading(true);
    try {
      let lastMsg = '';
      for (const row of selected) {
        const resp = await fetch(`${API_BASE}/all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fn: 'student_responsible',
            p_num: Number(row.std_id),
            p_waalid: Number(res_id),
            p_operation: 'update',
            p_user_id: u_br_id,
          }),
        });
        const text = await resp.text();
        if (!resp.ok) throw new Error(text || t('responsibleForm.updateFailed'));
        lastMsg = text;
      }
      swalSuccess('', lastMsg || t('responsibleForm.updated'));
      onSuccess?.();
    } catch (err) {
      swalError(t('responsibleForm.errTitle'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#0B3C5D] text-white">
            <th className="text-start px-4 py-2.5 font-semibold">{t('responsibleForm.student')}</th>
            <th className="w-12 px-2 py-2">
              <button
                type="button"
                onClick={addRow}
                className="w-7 h-7 rounded bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-base font-bold leading-none"
              >
                +
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40">
              <td className="px-4 py-2">
                <Select2
                  name={`student_${row.id}`}
                  value={row.std_id}
                  selectedLabel={row.std_label}
                  onChange={(e) => setStd(row.id, e.target.value, e.target.label || '')}
                  loadOptions={studentLoader}
                  placeholder={t('responsibleForm.selectStudent')}
                />
              </td>
              <td className="px-2 py-2">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="w-7 h-7 rounded bg-red-500 hover:bg-red-600 text-white flex items-center justify-center font-bold leading-none"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={loading}
          className="px-10 py-2.5 bg-[#0B3C5D] hover:bg-[#0a2a3d] text-white text-sm font-semibold rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('action.updating') : t('responsibleForm.updateStudents')}
        </button>
      </div>
    </div>
  );
}

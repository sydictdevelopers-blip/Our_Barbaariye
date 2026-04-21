import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import Select2 from '../components/ui/Select2';
import Button from '../components/ui/Button';
import { crud, fetchSelectOptions } from '../services/api';
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

const emptyRow = () => ({ emp_id: '', sub_id: '', no_of_period: '' });

export default function SubjectClassBulkForm({ context = {}, onSuccess }) {
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSelectOptions('employee_options', 200, '')
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? [];
        setEmployeeOptions(
          data.map((r) => ({ value: String(r.emp_id ?? ''), label: String(r.p_name ?? '') }))
        );
      })
      .catch(() => !cancelled && setEmployeeOptions([]));
    fetchSelectOptions('subject_options', 200, '')
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? [];
        setSubjectOptions(
          data.map((r) => ({ value: String(r.sub_id ?? ''), label: String(r.name ?? '') }))
        );
      })
      .catch(() => !cancelled && setSubjectOptions([]));
    return () => { cancelled = true; };
  }, []);

  const setField = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const hasContext = !!(context?.cl_id && context?.academicYearId);

  const handleSave = async () => {
    if (!hasContext) {
      swal.swalError('Fadlan marka hore dooro Academic Year iyo Class', '');
      return;
    }
    const valid = rows.filter(
      (r) => r.emp_id && r.sub_id && String(r.no_of_period).trim()
    );
    if (valid.length === 0) {
      swal.swalError('Fadlan buuxi safka ugu yaraan hal mid', '');
      return;
    }
    setLoading(true);
    const u_br_id = getSessionUBrId();
    const clId = Number(context.cl_id) || 0;
    const ayId = Number(context.academicYearId) || 0;
    try {
      let inserted = 0;
      let lastMessage = '';
      for (const row of valid) {
        const result = await crud({
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
        if (result?.message) lastMessage = result.message;
      }
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      onSuccess?.();
      await swal.swalSuccess('Wa la guulaystey', lastMessage);
    } catch (err) {
      swal.swalError(err?.message || 'Khalad ayaa dhacay', '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!hasContext && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Fadlan marka hore dooro <b>Academic Year</b> iyo <b>Class</b> gudaha tab-ka si aad u ku darto.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-b from-[#0B3C5D] to-[#072b44] text-white">
              <th className="px-4 py-3 text-left font-semibold rounded-tl-lg">Teacher</th>
              <th className="px-4 py-3 text-left font-semibold">Subject</th>
              <th className="px-4 py-3 text-left font-semibold">No. Periods/Week</th>
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
                    onChange={(e) => setField(i, 'emp_id', e.target.value)}
                    options={employeeOptions}
                    placeholder="Select Teacher"
                    isClearable={false}
                  />
                </td>
                <td className="p-2 align-top">
                  <Select2
                    name={`sub_${i}`}
                    value={row.sub_id}
                    onChange={(e) => setField(i, 'sub_id', e.target.value)}
                    options={subjectOptions}
                    placeholder="Select subject"
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
                    className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
      <div className="flex justify-center pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="w-full max-w-xl"
        >
          {loading ? '...' : 'ADD SUBJECTS'}
        </Button>
      </div>
    </div>
  );
}

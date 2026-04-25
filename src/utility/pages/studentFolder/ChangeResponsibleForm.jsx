import { useState, useEffect } from 'react';
import { fetchSelectOptions } from '../../../services/api';
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
  const { res_id } = context ?? {};
  const [rows, setRows] = useState([{ id: Date.now(), std_id: '' }]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSelectOptions('all_student_options', 500, '')
      .then((res) => {
        const data = res?.data ?? res?.rows ?? [];
        setStudentOptions(
          data.map((r) => ({
            value: String(r.std_id ?? Object.values(r)[0] ?? ''),
            label: String(r.p_name ?? Object.values(r)[1] ?? ''),
          }))
        );
      })
      .catch(() => setStudentOptions([]));
  }, []);

  const addRow = () => setRows((prev) => [...prev, { id: Date.now(), std_id: '' }]);

  const removeRow = (id) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const setStd = (id, val) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, std_id: val } : r)));

  const handleUpdate = async () => {
    if (!res_id) {
      swalError('Dooro Responsible', 'Hubi inaad dooratid responsible ka dropdown-ka kor');
      return;
    }
    const selected = rows.filter((r) => r.std_id);
    if (!selected.length) {
      swalError('Dooro Ardayda', 'Hubi inaad dooratid student xaasid ah');
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
        if (!resp.ok) throw new Error(text || 'Update failed');
        lastMsg = text;
      }
      swalSuccess('', lastMsg || 'Updated');
      onSuccess?.();
    } catch (err) {
      swalError('Khalad', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#0B3C5D] text-white">
            <th className="text-left px-4 py-2.5 font-semibold">Student</th>
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
            <tr key={row.id} className="border-b border-slate-200 bg-white">
              <td className="px-4 py-2">
                <Select2
                  name={`student_${row.id}`}
                  value={row.std_id}
                  onChange={(e) => setStd(row.id, e.target.value)}
                  options={studentOptions}
                  placeholder="select Student"
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
          {loading ? 'Updating...' : 'UPDATE STUDENTS'}
        </button>
      </div>
    </div>
  );
}

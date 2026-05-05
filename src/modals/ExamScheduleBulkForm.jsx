import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import Select2 from '../components/ui/Select2';
import Button from '../components/ui/Button';
import {
  crud,
  makeOptionLoader,
  fetchSelectOptions,
  getSessionUBrIdNum,
  getSessionBrIdNum,
} from '../services/api';
import { swalSuccess, swalError } from '../utils/swal';

// Bulk Add New form ee tab-ka "Exam Schedule".
// Marka user-ku Level + Academic + Exam doorto oo gujiyo "Add New":
//   1. Wuxuu raadiyaa exam_reg_id u dhigma (academic, exam, branch).
//   2. Per row: Day | Subject (subject_class) | Period | Start | End | Date.
//   3. Submit: per row, exam_schedule_sp(0, d_id, pr_id, sub_cl_id, sh_id,
//      cl_id, ex_r_id, start, end, date, u_br_id, 'insert') ayaa la wacaa.

const emptyRow = () => ({
  d_id: '', d_label: '',
  sub_id: '',                       // Select2 value (always present)
  sub_cl_id: '', sub_cl_label: '',  // resolved on selection from subject_class link
  cl_id: '', sh_id: '',
  pr_id: '', pr_label: '',
  start_time: '',
  end_time: '',
  exam_date: new Date().toISOString().slice(0, 10),
});

export default function ExamScheduleBulkForm({ context = {}, onSuccess }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([emptyRow()]);
  const [erId, setErId] = useState(null);     // ex_reg_id (looked up on mount)
  const [erLoading, setErLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const academicYearId = context?.academicYearId || '';
  const exId = context?.ex_id || '';
  const levId = context?.lev_id || '';

  // Cache-bust counter: marka level/academic uu beddelo, kor u qaad si
  // Select2 inta jira la dumiyo (cache + defaultOpts → fresh fetch ee SP-ka
  // subject_by_level_academic_show). Tani waa xaq u-fasaxa user-ka:
  // "Function ka dib u run gareey marka level/academic la badalo".
  const [loaderKey, setLoaderKey] = useState(0);

  // Marka context-ka filter (level / academic / exam) uu beddelo, dib u dhig
  // rows-ka + cache-bust si Subject dropdown-ku uu fresh data uga soo qaado
  // SP-ga subject_by_level_academic_show.
  useEffect(() => {
    setRows([emptyRow()]);
    setLoaderKey((k) => k + 1);
  }, [levId, academicYearId, exId]);

  // Lookup ex_reg_id ee u dhigma (academic, exam, branch) — exam_schedule
  // wuxuu kaydiyaa ex_r_id, sidaas darteed waa in la helo hal mar.
  useEffect(() => {
    if (!academicYearId || !exId) {
      setErLoading(false);
      return;
    }
    let cancelled = false;
    setErLoading(true);
    fetchSelectOptions('exam_reg_lookup', 1, '', {
      academicYearId,
      ex_id: exId,
    })
      .then((res) => {
        if (cancelled) return;
        const row = (res?.data || [])[0];
        if (row) setErId(row.ex_reg_id);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setErLoading(false);
      });
    return () => { cancelled = true; };
  }, [academicYearId, exId]);

  // Loaders
  const dayLoader = useMemo(() => makeOptionLoader('day_options'), []);
  const periodLoader = useMemo(() => makeOptionLoader('period_options'), []);
  // Subjects come from subjects_show() — ALL subjects show even without
  // a subject_class link for the chosen level/academic. Value is sub_id;
  // sub_cl_id (+ cl_id, sh_id) is looked up on selection via the same query.
  const subjectLoader = useMemo(
    () =>
      makeOptionLoader(
        'subject_class_by_level_options',
        () => ({
          ...(levId && { lev_id: levId }),
          ...(academicYearId && { academicYearId }),
        }),
        { valueKey: 'sub_id', labelKey: 'label' }
      ),
    [levId, academicYearId]
  );

  const setField = (i, k, v) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  };
  const setFields = (i, patch) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i) =>
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  // Marka subject la doorto (value = sub_id), ka soo qaad sub_cl_id + cl_id +
  // sh_id ee subject_class link-ka u dhigma level/academic. Haddii link uusan
  // jirin → sub_cl_id stays empty; save-ku waxuu keenayaa fariin cad.
  const handleSubjectChange = async (i, value, label) => {
    setFields(i, { sub_id: value, sub_cl_label: label, sub_cl_id: '', cl_id: '', sh_id: '' });
    if (!value) return;
    try {
      const res = await fetchSelectOptions(
        'subject_class_by_level_options',
        1000,
        '',
        { lev_id: levId, academicYearId }
      );
      const match = (res?.data || []).find((r) => String(r.sub_id) === String(value));
      if (match && match.sub_cl_id) {
        setFields(i, {
          sub_cl_id: match.sub_cl_id,
          cl_id: match.cl_id,
          sh_id: match.sh_id,
        });
      }
    } catch (e) {
      // ignore — save will surface the missing-link error
    }
  };

  const hasContext = !!(academicYearId && exId && levId);

  const handleSave = async () => {
    if (!hasContext) {
      swalError('Filter ka maqan', 'Fadlan dooro Level + Academic + Exam.');
      return;
    }
    if (!erId) {
      swalError('Exam Register ma helin', 'Academic + Exam-kaas exam_reg uma jirin. Hubi tab-ka Exam Register.');
      return;
    }
    // Subject-yo la doortay laakiin aan lahayn subject_class link
    // level/academic-kan: filter-ka su'aal in aan u sheego user-ka.
    const unlinked = rows.filter(
      (r) => r.sub_cl_label && !r.sub_cl_id
    );
    if (unlinked.length) {
      swalError(
        'Subject ma laha class link',
        `Subject(s): ${unlinked.map((r) => r.sub_cl_label).join(', ')} — fadlan abuur subject_class entry level/academic-kan ka hor schedule-ka.`
      );
      return;
    }
    const valid = rows.filter(
      (r) => r.d_id && r.sub_cl_id && r.cl_id && r.pr_id && r.start_time && r.end_time && r.exam_date
    );
    if (!valid.length) {
      swalError('Wax la kaydiyo lama helin', 'Ugu yaraan hal row buuxiyo.');
      return;
    }
    setSaving(true);
    const u_br_id = getSessionUBrIdNum();
    let ok = 0;
    let firstErr = '';
    let lastMsg = '';
    try {
      for (const row of valid) {
        try {
          const result = await crud({
            operation: 'insert',
            fn: 'exam_schedule_sp',
            params: {
              ex_s_id_sp: 0,
              day_id_sp: Number(row.d_id) || 0,
              per_id_sp: Number(row.pr_id) || 0,
              sub_cl_id_sp: Number(row.sub_cl_id) || 0,
              sh_id_sp: Number(row.sh_id) || 0,
              cl_id_sp: Number(row.cl_id) || 0,
              ex_r_id_sp: Number(erId) || 0,
              start_time_sp: row.start_time,
              end_time_sp: row.end_time,
              exam_date_sp: row.exam_date,
              u_br_id_sp: u_br_id,
              language_sp: 0,
            },
          });
          ok += 1;
          if (result?.message) lastMsg = result.message;
        } catch (e) {
          if (!firstErr) firstErr = e?.message || String(e);
        }
      }
      if (ok > 0) {
        await swalSuccess(
          'Waa la guulaystey',
          `${ok} / ${valid.length} ayaa la kaydiyay${lastMsg ? ' — ' + lastMsg : ''}`
        );
        setRows([emptyRow()]);
        onSuccess?.({ academicYearId, ex_id: exId, lev_id: levId });
      } else {
        swalError(firstErr || 'Khalad ayaa dhacay', '');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!hasContext) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Fadlan dooro Level + Academic Year + Exam ka hor.
      </div>
    );
  }

  if (erLoading) {
    return <div className="p-4 text-center text-slate-500">Soo dejinaya…</div>;
  }

  if (!erId) {
    return (
      <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        Academic + Exam-kaas exam_reg uma jirin. Fadlan tab-ka Exam Register
        ku diiwaan-geli horta exam-kan academic-kan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-b from-[#0B3C5D] to-[#072b44] text-white">
              <th className="px-3 py-3 text-start font-semibold rounded-tl-lg">Day</th>
              <th className="px-3 py-3 text-start font-semibold">Subject</th>
              <th className="px-3 py-3 text-start font-semibold">Period</th>
              <th className="px-3 py-3 text-start font-semibold">Start Time</th>
              <th className="px-3 py-3 text-start font-semibold">End Time</th>
              <th className="px-3 py-3 text-start font-semibold">Exam Date</th>
              <th className="px-2 py-3 w-12 rounded-tr-lg text-center">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center justify-center w-8 h-8 rounded bg-green-500 hover:bg-green-600 text-white"
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
                <td className="p-2 align-top min-w-[150px]">
                  <Select2
                    name={`d_${i}`}
                    value={row.d_id}
                    selectedLabel={row.d_label}
                    onChange={(e) => setFields(i, { d_id: e.target.value, d_label: e.target.label || '' })}
                    loadOptions={dayLoader}
                    placeholder="Select Day"
                    isClearable={false}
                  />
                </td>
                <td className="p-2 align-top min-w-[200px]">
                  <Select2
                    key={`sub-${levId}-${academicYearId}-${loaderKey}`}
                    name={`sub_${i}`}
                    value={row.sub_id}
                    selectedLabel={row.sub_cl_label}
                    onChange={(e) => handleSubjectChange(i, e.target.value, e.target.label || '')}
                    loadOptions={subjectLoader}
                    placeholder="Select Subject"
                    isClearable={false}
                  />
                </td>
                <td className="p-2 align-top min-w-[150px]">
                  <Select2
                    name={`pr_${i}`}
                    value={row.pr_id}
                    selectedLabel={row.pr_label}
                    onChange={(e) => setFields(i, { pr_id: e.target.value, pr_label: e.target.label || '' })}
                    loadOptions={periodLoader}
                    placeholder="Select Period"
                    isClearable={false}
                  />
                </td>
                <td className="p-2 align-top">
                  <input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => setField(i, 'start_time', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#0B3C5D]"
                  />
                </td>
                <td className="p-2 align-top">
                  <input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => setField(i, 'end_time', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#0B3C5D]"
                  />
                </td>
                <td className="p-2 align-top">
                  <input
                    type="date"
                    value={row.exam_date}
                    onChange={(e) => setField(i, 'exam_date', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#0B3C5D]"
                  />
                </td>
                <td className="p-2 align-top text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={rows.length <= 1}
                    aria-label="Remove row"
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
          disabled={saving}
          className="w-full max-w-xl"
        >
          {saving ? 'Cusbooneysiinaya…' : 'ADD EXAM SCHEDULE'}
        </Button>
      </div>
    </div>
  );
}

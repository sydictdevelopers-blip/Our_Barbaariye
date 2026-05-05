import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncSelect from 'react-select/async';
import Button from '../components/ui/Button';
import {
  crud,
  makeOptionLoader,
  fetchDataPaginated,
  getSessionUBrIdNum,
} from '../services/api';
import * as swal from '../utils/swal';

// Bulk add-new form ee tab-ka "Assign Class Exam".
// Marka user-ku Academic Year doorto oo gujiyo "Add New":
//   1. Wuxuu wacaa add_assing_class_exam_show(academic, branch) si uu u soo qaado
//      liiska (class - batch) ee ardayda ku jira academic-kaas.
//   2. Class kasta wuxuu lahaa multi-select dropdown si dhowr exam loogu doorto.
//   3. "UPDATE DATA" button-ka hoose ayaa exam kasta lagu kaydiyaa via
//      assign_class_exam_sp (oper='insert') — hal call exam-iyo-class kasta.

const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    borderRadius: '8px',
    borderColor: state.isFocused ? '#0f3d5e' : 'rgb(226 232 240)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(15, 61, 94, 0.2)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#0f3d5e' : 'rgb(203 213 225)' },
  }),
  menu: (base) => ({ ...base, zIndex: 9999, borderRadius: '8px' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'rgb(241 245 249)',
    border: '1px solid rgb(226 232 240)',
    borderRadius: '6px',
  }),
  multiValueLabel: (base) => ({ ...base, color: 'rgb(30 41 59)' }),
};

export default function AssignClassExamBulkForm({ context = {}, onSuccess }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true); // mount-ka isla markiiba loo arko skeleton
  const [saving, setSaving] = useState(false);

  const academicYearId = context?.academicYearId || '';

  // Exam loader-ka waxaa lagu xidhay academicYearId — kaliya exam-yada ku
  // diiwaan gashan academic-kaas ayaa dropdown-ka soo galaya.
  const examLoader = useMemo(
    () =>
      makeOptionLoader('exam_reg_options', () => ({
        ...(academicYearId && { academicYearId }),
      })),
    [academicYearId]
  );

  useEffect(() => {
    if (!academicYearId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDataPaginated({
      queryName: 'add_assing_class_exam_show',
      page: 1,
      limit: 1000,
      academicYearId,
    })
      .then((res) => {
        if (cancelled) return;
        const data = (res?.data || [])
          .filter((r) => r.cl_id != null && r.Result == null)
          .map((r) => ({
            cl_id: r.cl_id,
            b_id: r.b_id,
            class_label: r.Class || '',
            exams: [], // multi-select: array of { value, label }
          }));
        setRows(data);
      })
      .catch((err) => {
        swal.swalError(err?.message || t('swal.titles.error', 'Khalad ayaa dhacay'), '');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [academicYearId, t]);

  const setRowExams = (index, exams) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, exams: exams || [] } : r))
    );
  };

  const handleSave = async () => {
    // Build pairs: hal call SP per (cl_id, b_id, er_id).
    const pairs = [];
    for (const row of rows) {
      if (!row.cl_id || !row.b_id) continue;
      for (const ex of row.exams || []) {
        const erId = Number(ex?.value) || 0;
        if (!erId) continue;
        pairs.push({ cl_id: row.cl_id, b_id: row.b_id, er_id: erId });
      }
    }
    if (!pairs.length) {
      swal.swalError(
        t('assignClassExamBulk.errFillRow', 'Ugu yaraan hal class exam u dooro'),
        ''
      );
      return;
    }
    setSaving(true);
    const u_br_id = getSessionUBrIdNum();
    let okCount = 0;
    let lastMessage = '';
    let firstError = '';
    try {
      for (const p of pairs) {
        try {
          const result = await crud({
            operation: 'insert',
            fn: 'assign_class_exam_sp',
            params: {
              a_c_e_id_sp: 0,
              er_id_sp: p.er_id,
              cl_id_sp: p.cl_id,
              b_id_sp: p.b_id,
              u_br_id_sp: u_br_id,
            },
          });
          okCount += 1;
          if (result?.message) lastMessage = result.message;
        } catch (e) {
          if (!firstError) firstError = e?.message || String(e);
        }
      }
      if (okCount > 0) {
        onSuccess?.();
        await swal.swalSuccess(
          t('swal.titles.success', 'Waa la guulaystey'),
          `${okCount} / ${pairs.length} — ${lastMessage}`
        );
      } else {
        swal.swalError(firstError || t('swal.titles.error', 'Khalad ayaa dhacay'), '');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!academicYearId) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {t('entity.selectAcademic', 'Fadlan dooro Academic Year')}
      </div>
    );
  }

  // Skeleton rows — la muujiyo isla markiiba mount-ka, gudaha "Loading…" weyn.
  // Sidaas darteed user-ku ma arko meel maran oo waaweyn.
  const skeletonRows = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-b from-[#0B3C5D] to-[#072b44] text-white">
              <th className="px-4 py-3 text-start font-semibold rounded-tl-lg w-1/2">
                {t('assignClassExamBulk.cols.class', 'Class')}
              </th>
              <th className="px-4 py-3 text-start font-semibold rounded-tr-lg">
                {t('assignClassExamBulk.cols.exam', 'Exam')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? skeletonRows.map((i) => (
                  <tr key={`sk-${i}`} className="border-b border-slate-200">
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="p-2">
                      <div className="h-9 rounded bg-slate-100 animate-pulse" />
                    </td>
                  </tr>
                ))
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                    {t('entity.notFound', 'Wax xog ah lama helin')}
                  </td>
                </tr>
              )
              : rows.map((row, i) => (
                  <tr
                    key={`${row.cl_id}-${row.b_id}-${i}`}
                    className="border-b border-slate-200"
                  >
                    <td className="px-4 py-3">{row.class_label}</td>
                    <td className="p-2 align-top">
                      <AsyncSelect
                        isMulti
                        cacheOptions
                        defaultOptions
                        loadOptions={examLoader}
                        value={row.exams}
                        onChange={(arr) => setRowExams(i, arr || [])}
                        placeholder={t('assignClassExamBulk.selectExam', 'Select Exam')}
                        styles={reactSelectStyles}
                        classNamePrefix="select2"
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
                        menuPlacement="auto"
                        getOptionValue={(opt) => opt?.value}
                        getOptionLabel={(opt) =>
                          opt?.label != null ? String(opt.label) : String(opt?.value ?? '')
                        }
                      />
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
          disabled={saving || loading || rows.length === 0}
          className="w-full max-w-xl"
        >
          {saving
            ? t('action.updating', 'Cusbooneysiinaya…')
            : t('assignClassExamBulk.updateData', 'UPDATE DATA*')}
        </Button>
      </div>
    </div>
  );
}

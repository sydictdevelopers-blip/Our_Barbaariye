import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../components/ui/Modal';
import Select2 from '../components/ui/Select2';
import Button from '../components/ui/Button';
import {
  crud,
  makeOptionLoader,
  fetchDataPaginated,
  fetchSelectOptions,
  getSessionUBrIdNum,
  getSessionBrIdNum,
} from '../services/api';
import { swalSuccess, swalError } from '../utils/swal';

// Custom action modals for the "Exam Schedule" tab.
// Copy / Print — sida sawirka.

const FieldLabel = ({ children }) => (
  <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">
    {children}
  </label>
);

const ModalShell = ({ isOpen, onClose, title, footer, size = 'md', children }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    header={
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight truncate">
        {title}
      </h2>
    }
    size={size}
    footer={footer}
  >
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      {children}
    </form>
  </Modal>
);

/* ─────────────────── Copy Exam Form ─────────────────── */
// Copy exam_schedule from one academic year → another. Backend SP weli
// lama abuurin — submit-ku wuxuu muujiyaa fariin "lama dhammaystirin".
export function CopyExamFormModal({ isOpen, onClose, onSuccess, context }) {
  const { t } = useTranslation();
  const [src, setSrc] = useState({ id: '', label: '' });
  const [dst, setDst] = useState({ id: '', label: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSrc({ id: context?.academicYearId || '', label: '' });
    setDst({ id: '', label: '' });
  }, [isOpen, context]);

  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);

  const handleTransfer = async () => {
    if (!src.id) return swalError('Fadlan dooro Source Academic Year', '');
    if (!dst.id) return swalError('Fadlan dooro Destination Academic Year', '');
    if (String(src.id) === String(dst.id))
      return swalError('Labadu waa isku mid', 'Source iyo Destination ha isku mid noqdaan');
    setBusy(true);
    try {
      const result = await crud({
        operation: 'insert',
        fn: 'copy_exam_scheduale_sp',
        params: {
          src_a_y_sp: Number(src.id) || 0,
          dst_a_y_sp: Number(dst.id) || 0,
          u_br_id_sp: getSessionUBrIdNum(),
          br_id_sp: getSessionBrIdNum(),
        },
      });
      await swalSuccess('Waa la guulaystey', result?.message || '');
      onSuccess?.({ academicYearId: dst.id, academicYearLabel: dst.label });
      onClose?.();
    } catch (err) {
      swalError(err?.message || 'Khalad ayaa dhacay', '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Copy Exam Form"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" onClick={handleTransfer} disabled={busy}>
            {busy ? '...' : 'Transfere'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel>Source Academic Year</FieldLabel>
          <Select2
            value={src.id}
            selectedLabel={src.label}
            onChange={(e) => setSrc({ id: e.target.value, label: e.target.label || '' })}
            loadOptions={acadLoader}
            placeholder="Select Academic Year"
          />
        </div>
        <div>
          <FieldLabel>Destination Academic Year</FieldLabel>
          <Select2
            value={dst.id}
            selectedLabel={dst.label}
            onChange={(e) => setDst({ id: e.target.value, label: e.target.label || '' })}
            loadOptions={acadLoader}
            placeholder="Select Academic Year"
          />
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────── Print Exam Schedule ─────────────────── */
// Modal: dooro Academic + Exam → SHOW → muuji preview oo daabaca.
// Preview-ga waxaa loo qaybiyaa per-class (Day Info, Period 1, Period 2, ...).
const HEADER_LOGO_URL = '/syd-logo.png'; // ku beddel haddii logo aad rabto kale

export function PrintExamScheduleModal({ isOpen, onClose, context }) {
  const { t } = useTranslation();
  const [ay, setAy] = useState({ id: '', label: '' });
  const [er, setEr] = useState({ id: '', label: '' });
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null); // { rows, ay_label, exam_label }
  const printRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setAy({ id: context?.academicYearId || '', label: '' });
    setEr({ id: '', label: '' });
    setData(null);
  }, [isOpen, context]);

  const acadLoader = useMemo(() => makeOptionLoader('academicYeartab'), []);
  const examLoader = useMemo(
    () =>
      makeOptionLoader('exam_by_academic_options', () => ({
        ...(ay.id && { academicYearId: ay.id }),
      })),
    [ay.id]
  );

  const handleShow = async () => {
    if (!ay.id) return swalError(t('entity.selectAcademic', 'Fadlan dooro Academic Year'), '');
    if (!er.id) return swalError('Fadlan dooro Exam', '');
    setBusy(true);
    try {
      // 1. Lookup ex_reg_id for (academic, exam, branch) — exam_schedule
      //    rows are keyed by ex_r_id (FK to exam_reg).
      const erLookup = await fetchSelectOptions('exam_reg_lookup', 1, '', {
        academicYearId: ay.id,
        ex_id: er.id,
      });
      const exRegId = (erLookup?.data || [])[0]?.ex_reg_id;
      if (!exRegId) {
        swalError('Exam Register ma helin', 'Academic + Exam-kaas exam_reg uma jirin.');
        return;
      }

      // 2. Fetch the level list, then call the pivot SP for each level so the
      //    report renders one section per Dugsi Sare / Dhexe / Hoose / etc.
      const levRes = await fetchSelectOptions('levels', 100, '', {});
      const levels = (levRes?.data || []).map((row) => ({ id: row.lev_id, label: row.level }));

      const sections = [];
      for (const lev of levels) {
        const piv = await fetchDataPaginated({
          queryName: 'ExamSchedulePivot',
          page: 1,
          limit: 1000,
          lev_id: lev.id,
          ex_r_id: exRegId,
        });
        const rows = piv?.data || [];
        if (!rows.length) continue;
        // SP returns a single row with exam_date=null carrying alerts.body
        // ('NotFound') when no schedule exists for the level. Surface that as
        // an empty-state section so the user still sees the level heading
        // with a clear "no data" message.
        const isEmpty = rows.length === 1 && rows[0].exam_date == null;
        sections.push({
          levelLabel: lev.label,
          rows: isEmpty ? [] : rows,
          emptyMessage: isEmpty ? rows[0].day_info : null,
        });
      }

      if (!sections.length) {
        swalError('Wax xog ah lama helin', '');
        return;
      }
      setData({ sections, ayLabel: ay.label, exLabel: er.label });
    } catch (err) {
      swalError(err?.message || 'Khalad ayaa dhacay', '');
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=1100,height=1000');
    if (!w) return swalError('Window furid lama awoodin', 'Pop-up blocker?');
    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Exam Schedule — ${data?.exLabel || ''}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  @page { size: A4; margin: 10mm 8mm; }
  body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
         color: #0f172a; margin: 0; padding: 16px; background: #f8fafc; }
  .report-wrap { max-width: 1080px; margin: 0 auto; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact;
           background: #fff; padding: 0; }
    .rounded-2xl, .rounded-xl, .rounded-lg { border-radius: 8px !important; }
    [class*="hover:"] { background: inherit !important; }
    .shadow-md, .shadow-lg, .shadow-sm { box-shadow: none !important;
                                         border: 1px solid #e2e8f0 !important; }
    .level-card { page-break-inside: avoid; }
  }
</style>
</head><body><div class="report-wrap">${html}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 600);  // wait for tailwind cdn to apply
  };

  // Per-section the SP returns columns: day_info, exam_date,
  // period_1..period_6 + duration_1..duration_6. The renderer determines
  // which period columns are non-empty across the section so empty trailing
  // periods (most schools only use 1–2) are dropped from the table header.
  const visiblePeriodsBySection = useMemo(() => {
    if (!data?.sections) return [];
    return data.sections.map(({ rows }) => {
      const used = [];
      for (let p = 1; p <= 6; p++) {
        const key = `period_${p}`;
        if (rows.some((r) => r[key] != null && String(r[key]).trim() !== '')) used.push(p);
      }
      return used;
    });
  }, [data]);

  // "09:00:00 - 10:30:00" → "09:00 – 10:30" (drop seconds, en-dash separator).
  const fmtDuration = (s) => {
    if (!s) return '';
    const m = String(s).match(/(\d{1,2}:\d{2})(?::\d{2})?\s*[-–]\s*(\d{1,2}:\d{2})(?::\d{2})?/);
    return m ? `${m[1]} – ${m[2]}` : s;
  };

  // SP gives "Saturday - 2026-05-04". Split it for two-line styled rendering.
  const parseDayInfo = (s) => {
    if (!s) return { day: '', date: '' };
    const idx = String(s).lastIndexOf(' - ');
    return idx >= 0 ? { day: s.slice(0, idx).trim(), date: s.slice(idx + 3).trim() } : { day: s, date: '' };
  };

  // ISO/yyyy-mm-dd → "May 4, 2026" (no Date parsing pitfalls; treat as plain date).
  const fmtDate = (s) => {
    if (!s) return '';
    const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="PRINT Exam Scheduale BY Academic"
      size={data ? '2xl' : 'md'}
      footer={
        <div className="flex justify-end gap-2 w-full">
          {data ? (
            <Button type="button" onClick={handlePrint}>Print</Button>
          ) : (
            <Button type="button" onClick={handleShow} disabled={busy}>
              {busy ? '...' : 'SHOW'}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {!data ? (
        <>
          <div>
            <FieldLabel>Academic Year</FieldLabel>
            <Select2
              value={ay.id}
              selectedLabel={ay.label}
              onChange={(e) => setAy({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={acadLoader}
              placeholder="Select Academic Year"
            />
          </div>
          <div key={`er-${ay.id || 'none'}`}>
            <FieldLabel>Exam</FieldLabel>
            <Select2
              value={er.id}
              selectedLabel={er.label}
              onChange={(e) => setEr({ id: e.target.value, label: e.target.label || '' })}
              loadOptions={examLoader}
              placeholder="Select Exam"
              isDisabled={!ay.id}
            />
          </div>
        </>
      ) : (
        <div ref={printRef} className="max-h-[78vh] overflow-y-auto bg-slate-50 -mx-4 -my-4 px-6 py-6">
          {/* Hero header card */}
          <div className="rounded-2xl overflow-hidden shadow-lg mb-8 bg-white">
            <div className="relative px-8 py-7 text-white text-center"
                 style={{ background: 'linear-gradient(135deg, #0B3C5D 0%, #1a5f8e 50%, #0B3C5D 100%)' }}>
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0, transparent 40%)',
                   }}></div>
              <div className="relative">
                <div className="text-[28px] font-extrabold tracking-[0.18em] uppercase">
                  SYD ICT SOLUTIONS
                </div>
                <div className="mt-1.5 text-[11px] uppercase tracking-[0.4em] text-white/70 font-light">
                  The Key of Digital World
                </div>
                <div className="mt-5 inline-block px-5 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                  <span className="text-[14px] font-semibold tracking-wide uppercase">Exam Schedule</span>
                </div>
              </div>
            </div>
            <div className="px-8 py-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="text-[12.5px] font-semibold text-amber-800">{data.exLabel}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-50 border border-sky-200">
                <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[12.5px] font-semibold text-sky-800">Academic Year {data.ayLabel}</span>
              </div>
            </div>
          </div>

          {/* Per-level cards */}
          {data.sections.map((section, sIdx) => {
            const periods = visiblePeriodsBySection[sIdx] || [1, 2];
            return (
              <div key={section.levelLabel}
                   className="level-card rounded-2xl overflow-hidden shadow-md mb-7 bg-white border border-slate-200/80">
                {/* Level title bar */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200"
                     style={{ background: 'linear-gradient(90deg, #0B3C5D 0%, #1a5f8e 100%)' }}>
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="m-0 text-[16px] font-bold text-white capitalize tracking-wide">
                      {section.levelLabel}
                    </h3>
                    <div className="text-[11px] text-white/70 mt-0.5 uppercase tracking-wider">
                      {section.emptyMessage
                        ? 'No schedule available'
                        : `${section.rows.length} exam ${section.rows.length === 1 ? 'day' : 'days'} scheduled`}
                    </div>
                  </div>
                  {!section.emptyMessage && (
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-white/60">Total Sessions</div>
                      <div className="text-[18px] font-bold text-white tabular-nums">
                        {section.rows.reduce((acc, r) => acc + periods.filter((p) => r[`period_${p}`]).length, 0)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Empty state — alerts.body 'NotFound' from the SP */}
                {section.emptyMessage ? (
                  <div className="px-6 py-12 text-center bg-slate-50/50">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 border border-amber-200 mb-3">
                      <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-[14px] font-semibold text-slate-700">{section.emptyMessage}</div>
                    <div className="text-[11.5px] text-slate-500 mt-1">No exam schedule has been registered for this level yet.</div>
                  </div>
                ) : (
                <>
                {/* Schedule table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-200">
                        <th className="px-4 py-3 text-start text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                          Day & Date
                        </th>
                        {periods.map((p) => (
                          <Fragment key={p}>
                            <th className="px-4 py-3 text-start text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap border-l border-slate-200">
                              {`Period ${p}`}
                            </th>
                            <th className="px-4 py-3 text-start text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                              Duration
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((r, idx) => {
                        const { day, date } = parseDayInfo(r.day_info);
                        return (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-sky-50/40 transition-colors">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white text-[10px] font-bold uppercase shrink-0"
                                     style={{ background: 'linear-gradient(135deg, #0B3C5D, #1a5f8e)' }}>
                                  <span className="text-[9px] tracking-wider opacity-80">{(day || '').slice(0, 3)}</span>
                                </div>
                                <div>
                                  <div className="text-[13.5px] font-semibold text-slate-800 leading-tight">
                                    {day}
                                  </div>
                                  {date && (
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      {fmtDate(date)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            {periods.map((p) => {
                              const sub = r[`period_${p}`];
                              const dur = r[`duration_${p}`];
                              return (
                                <Fragment key={p}>
                                  <td className="px-4 py-3.5 border-l border-slate-100">
                                    {sub ? (
                                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[12.5px] font-semibold">
                                        {sub}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-[16px]">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    {dur ? (
                                      <span className="inline-flex items-center gap-1.5 text-slate-600 text-[12px] font-medium tabular-nums">
                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {fmtDuration(dur)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-[16px]">—</span>
                                    )}
                                  </td>
                                </Fragment>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
                )}
              </div>
            );
          })}

          {/* Footer card */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm px-8 py-6 mt-2">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 mb-5">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-[12.5px] text-amber-900 leading-relaxed">
                <span className="font-bold">Important Notice:</span> Each student should carefully review
                the schedule above and prepare the subject matter for the corresponding day.
              </div>
            </div>
            <p className="text-center text-[14px] font-bold tracking-wide" style={{ color: '#0B3C5D' }}>
              Thank You!
            </p>
            <div className="grid grid-cols-2 gap-12 mt-10 px-6">
              <div className="text-center">
                <div className="border-t-2 border-slate-300 mt-8 mb-2"></div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Head of Education</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Signature & Date</div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-slate-300 mt-8 mb-2"></div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Principal</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Signature & Date</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

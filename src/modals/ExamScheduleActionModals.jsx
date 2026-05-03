import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../components/ui/Modal';
import Select2 from '../components/ui/Select2';
import Button from '../components/ui/Button';
import {
  crud,
  makeOptionLoader,
  fetchDataPaginated,
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
      const res = await fetchDataPaginated({
        queryName: 'ExamSceduleShow',
        page: 1,
        limit: 5000,
        academicYearId: ay.id,
        ex_id: er.id,
        lev_id: 0, // dhammaan levels-ka
      });
      const rows = (res?.data || []).filter((r) => r.ex_s_id != null && r.Result == null);
      if (!rows.length) {
        swalError('Wax xog ah lama helin', '');
        return;
      }
      setData({ rows, ayLabel: ay.label, exLabel: er.label });
    } catch (err) {
      swalError(err?.message || 'Khalad ayaa dhacay', '');
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return swalError('Window furid lama awoodin', 'Pop-up blocker?');
    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Exam Schedule</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; padding: 24px; color: #0f172a; }
  h1, h2, h3 { margin: 0; }
  .header { text-align: center; margin-bottom: 16px; }
  .header h1 { font-size: 22px; }
  .header p { margin: 4px 0; color: #475569; }
  .class-block { margin: 18px 0; }
  .class-block h3 { text-align: center; margin: 12px 0; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #0B3C5D; color: white; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer-note { margin-top: 24px; text-align: center; color: #475569; font-size: 12px; }
</style>
</head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 200);
  };

  // Group by class → day → list of periods
  const grouped = useMemo(() => {
    if (!data?.rows) return {};
    const out = {};
    for (const r of data.rows) {
      const cls = r.Class || '—';
      if (!out[cls]) out[cls] = {};
      const dayKey = `${r.Day}|${r.ExamDate}`;
      if (!out[cls][dayKey]) out[cls][dayKey] = { day: r.Day, date: r.ExamDate, periods: [] };
      out[cls][dayKey].periods.push({
        period: r.Period,
        subject: r.Subject,
        start: r.Start,
        end: r.End,
      });
    }
    return out;
  }, [data]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="PRINT Exam Scheduale BY Academic"
      size={data ? 'lg' : 'md'}
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
        <div ref={printRef} className="max-h-[70vh] overflow-y-auto">
          <div className="header text-center mb-4">
            <h1 className="text-xl font-bold">SYD ICT SOLUTIONS</h1>
            <p className="text-sm text-slate-500">
              {data.exLabel}, Academic Year ({data.ayLabel})
            </p>
          </div>
          {Object.entries(grouped).map(([className, days]) => (
            <div key={className} className="class-block mb-6">
              <h3 className="text-center font-semibold text-base my-3">{className}</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#0B3C5D] text-white">
                    <th className="border border-slate-300 px-2 py-1 text-left">Day Info</th>
                    <th className="border border-slate-300 px-2 py-1 text-left">Period-1</th>
                    <th className="border border-slate-300 px-2 py-1 text-left">Duration</th>
                    <th className="border border-slate-300 px-2 py-1 text-left">Period-2</th>
                    <th className="border border-slate-300 px-2 py-1 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(days).map((d, idx) => {
                    const p1 = d.periods[0];
                    const p2 = d.periods[1];
                    return (
                      <tr key={idx}>
                        <td className="border border-slate-300 px-2 py-1">
                          {d.day} - {d.date}
                        </td>
                        <td className="border border-slate-300 px-2 py-1">{p1?.subject || '---'}</td>
                        <td className="border border-slate-300 px-2 py-1">
                          {p1 ? `${p1.start} - ${p1.end}` : '---'}
                        </td>
                        <td className="border border-slate-300 px-2 py-1">{p2?.subject || '---'}</td>
                        <td className="border border-slate-300 px-2 py-1">
                          {p2 ? `${p2.start} - ${p2.end}` : '---'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          <p className="footer-note text-center text-xs text-slate-500 mt-6">
            N.B Each Student Should carefully Look at the schedule and
            <br />
            write, draw and find out the subject matter for today
          </p>
          <p className="text-center text-sm font-medium mt-2">Thank You!</p>
        </div>
      )}
    </ModalShell>
  );
}

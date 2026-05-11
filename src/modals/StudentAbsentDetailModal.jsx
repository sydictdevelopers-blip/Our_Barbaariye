import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Printer, FileSpreadsheet, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { fetchDataPaginated } from '../services/api';

const BANNER_URL =
  'https://sydimg.s3.eu-west-2.amazonaws.com/SYDlogos/banner-01.jpg';

/**
 * StudentAbsentDetailModal — printable / exportable absent-detail report.
 *
 * Data sources:
 *   • 'StudentAbsentName'    → student_absent_table(p_std_id, 'name')   → student_name
 *   • 'StudentAbsentDetails' → student_absent_table(p_std_id, 'all')    → rows (abs_date, day_name, state)
 *
 * Layout matches the SYD print-report template: action bar (Print / Export /
 * Close) → branded banner → title + print-date → striped table. The action
 * bar is hidden on @media print via `.print:hidden` so only the report
 * surface goes to paper. Excel export uses an HTML-table-to-xls Blob — no
 * extra dependency needed; Excel opens the file as a normal spreadsheet.
 */
export default function StudentAbsentDetailModal({ isOpen, onClose, studentId, fallbackName = '' }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [rows, setRows] = useState([]);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId) return;
    let cancelled = false;
    setLoading(true);
    setName(fallbackName || '');
    setRows([]);
    setEmptyMessage('');

    Promise.all([
      fetchDataPaginated({ queryName: 'StudentAbsentName', page: 1, limit: 5, std_id: studentId })
        .catch(() => ({ data: [] })),
      fetchDataPaginated({ queryName: 'StudentAbsentDetails', page: 1, limit: 1000, std_id: studentId })
        .catch(() => ({ data: [] })),
    ]).then(([nameRes, detailRes]) => {
      if (cancelled) return;
      const nameRow = (nameRes?.data || nameRes?.rows || [])[0];
      if (nameRow?.student_name) setName(nameRow.student_name);

      const data = detailRes?.data ?? detailRes?.rows ?? [];
      const real = [];
      let msg = '';
      data.forEach((row) => {
        if (!row?.abs_date && row?.message) {
          if (!msg) msg = row.message;
          return;
        }
        real.push(row);
      });
      setRows(real);
      if (real.length === 0) setEmptyMessage(msg);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, studentId, fallbackName]);

  const today = new Date().toISOString().slice(0, 10);
  const studentLabel = name || fallbackName || '';
  const reportTitle = t('studentAbsents.detail.title', 'Student Absent Detail Report');

  const handlePrint = () => window.print();

  // Excel export — wrap the table HTML in a `application/vnd.ms-excel` Blob.
  // Excel & Numbers open this as a standard sheet. Avoids adding a heavy
  // xlsx dependency just for a single report. Filename: <student>-absents.xls.
  const handleExportExcel = () => {
    const escape = (s) => String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const header = `<tr style="background:#0B3C5D;color:#fff;font-weight:600">
      <th>${t('studentAbsents.detail.no', 'No.')}</th>
      <th>${t('studentAbsents.detail.date', 'Date')}</th>
      <th>${t('studentAbsents.detail.day', 'Day')}</th>
      <th>${t('studentAbsents.detail.state', 'State')}</th>
    </tr>`;
    const body = rows
      .map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escape(String(r.abs_date || '').slice(0, 10))}</td>
        <td>${escape(r.day_name)}</td>
        <td>${escape(r.state)}</td>
      </tr>`)
      .join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
                        xmlns:x="urn:schemas-microsoft-com:office:excel"
                        xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body>
        <h3>${escape(reportTitle)}${studentLabel ? ` (${escape(studentLabel)})` : ''}</h3>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead>${header}</thead>
          <tbody>${body}</tbody>
        </table>
      </body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (studentLabel || 'student').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    a.download = `${safeName}-absents-${today}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Print CSS — chrome (overlay, action bar) hides; the report surface
          gets isolated and stretched to fill the page. Aggressive `max-width:
          none` reset on descendants prevents Tailwind/utility constraints
          (max-w-6xl from Modal sizes, max-h-28 on the banner, etc.) from
          squeezing content into a narrow column on paper. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .student-absent-print-root,
          .student-absent-print-root * { visibility: visible !important; }
          .student-absent-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            transform: none !important;
            overflow: visible !important;
          }
          /* Reset inner constraints so the report fills the page width. */
          .student-absent-print-root *,
          .student-absent-print-root *::before,
          .student-absent-print-root *::after {
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
          /* Banner: let it scale to the page width, but cap height. */
          .student-absent-print-root img {
            max-height: 110px !important;
            width: auto !important;
            margin: 0 auto !important;
            display: block !important;
          }
          /* Table: force full width and clean borders for paper. */
          .student-absent-print-root table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .student-absent-print-root thead { display: table-header-group !important; }
          .student-absent-print-root tr { page-break-inside: avoid !important; }
          /* Preserve the dark header and stripe colours. */
          .student-absent-print-root,
          .student-absent-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        showHeader={false}
        bodyClassName="p-0"
        className="student-absent-print-root"
      >
        <div className="bg-white text-slate-800 rounded-2xl overflow-hidden">
          {/* Action bar — hidden on print */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-6 pt-4 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || rows.length === 0}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-purple-300/40 transition-all hover:-translate-y-0.5 uppercase tracking-wide"
            >
              <Printer className="w-4 h-4" />
              {t('studentAbsents.detail.print', 'Print')}
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || rows.length === 0}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-emerald-300/40 transition-all hover:-translate-y-0.5 uppercase tracking-wide"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t('studentAbsents.detail.exportExcel', 'Export to Excel')}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* "Powered by" strip */}
          <div className="px-4 sm:px-6 pt-3 text-[11px] text-slate-500 font-medium">
            {t('studentAbsents.detail.poweredBy', 'Powered by [SYD] - Call 2238')}
          </div>

          {/* Banner — branded header. On print we let the image scale up via
              the @media print rules; on screen it's constrained to max-h-32. */}
          <div className="relative px-4 sm:px-6 pt-3 pb-3 border-b-[3px] border-double border-[#0B3C5D]/30 print:border-b-2 print:border-solid print:border-black">
            <img
              src={BANNER_URL}
              alt="SYD ICT Solutions"
              className="w-full max-h-32 object-contain mx-auto"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 py-5 print:px-6 print:py-4">
            {/* Title row + Print Date */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 print:border-black print:mb-3 print:pb-3">
              <div className="text-lg sm:text-xl font-bold text-slate-800 leading-tight print:text-black">
                {reportTitle}
                {studentLabel && (
                  <span className="text-slate-500 font-medium print:text-black"> ({studentLabel})</span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-cyan-600 font-semibold print:text-black">
                {t('studentAbsents.detail.printDate', 'Print Date')}: {today}
              </div>
            </div>

            {/* Body content */}
            {loading ? (
              <div className="p-10 flex items-center justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {t('studentAbsents.detail.loading', 'Loading…')}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                {emptyMessage || t('studentAbsents.detail.notFound', 'No absents found')}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 print:border print:border-black print:rounded-none">
                <table className="w-full text-sm">
                  <thead className="bg-[#0B3C5D] text-white print:bg-[#0B3C5D]">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold w-16">
                        {t('studentAbsents.detail.no', 'No.')}
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold w-1/3">
                        {t('studentAbsents.detail.date', 'Date')}
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold w-1/4">
                        {t('studentAbsents.detail.day', 'Day')}
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold">
                        {t('studentAbsents.detail.state', 'State')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row, idx) => (
                      <tr
                        key={`${row.abs_date}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        <td className="px-3 py-2 text-slate-700 print:text-black">{idx + 1}</td>
                        <td className="px-3 py-2 text-slate-700 print:text-black">
                          {String(row.abs_date || '').slice(0, 10)}
                        </td>
                        <td className="px-3 py-2 text-slate-700 print:text-black">{row.day_name || ''}</td>
                        <td className="px-3 py-2 text-slate-700 print:text-black">{row.state || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

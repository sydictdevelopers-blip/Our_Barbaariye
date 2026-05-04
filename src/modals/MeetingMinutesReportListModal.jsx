import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, FileSpreadsheet, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { fetchDataPaginated } from '../services/api';

const BANNER_URL =
  'https://sydimg.s3.eu-west-2.amazonaws.com/SYDlogos/banner-01.jpg';

const formatDate = (value) => {
  if (!value) return '';
  const s = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
};

const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function MeetingMinutesReportListModal({
  isOpen,
  onClose,
  dateFrom,
  dateTo,
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setRows([]);
    fetchDataPaginated({
      queryName: 'MeetingMinutesShow',
      page: 1,
      limit: 1000,
      p_date_from: dateFrom || '',
      p_date_to: dateTo || '',
    })
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load report');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, dateFrom, dateTo]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const columns = useMemo(
    () => [
      { key: 'no',          label: t('meeting.reportList.no', 'No.'),                      w: '6%'  },
      { key: 'agenda',      label: t('meeting.reportList.agenda', 'Agenda'),               w: '24%' },
      { key: 'participance',label: t('meeting.reportList.participants', 'Participants'),   w: '22%' },
      { key: 'comments',    label: t('meeting.reportList.comment', 'Comment'),             w: '24%' },
      { key: 'decisions',   label: t('meeting.reportList.decision', 'Decision'),           w: '24%' },
    ],
    [t]
  );

  const handlePrint = () => window.print();

  const handleExport = () => {
    if (!rows.length) return;
    const header = columns.map((c) => c.label);
    const lines = [header.map(csvEscape).join(',')];
    rows.forEach((r, i) => {
      lines.push(
        [
          i + 1,
          r.Agenda ?? r.agenda ?? '',
          r.Participants ?? r.participance ?? '',
          r.Comments ?? r.comments ?? '',
          r.Decisions ?? r.decisions ?? '',
        ]
          .map(csvEscape)
          .join(',')
      );
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-agenda-report-${dateFrom || 'all'}_${dateTo || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Print CSS — same approach as MeetingMinutesReportModal /
          StudentProfileModal: hide everything, then re-reveal only the
          printable card so dialogs/overlays don't bleed onto the page. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .meeting-minutes-list-print-root,
          .meeting-minutes-list-print-root * { visibility: visible !important; }
          .meeting-minutes-list-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            transform: none !important;
            overflow: visible !important;
          }
          .meeting-minutes-list-print-root *,
          .meeting-minutes-list-print-root *::before,
          .meeting-minutes-list-print-root *::after {
            overflow: visible !important;
            max-height: none !important;
            box-shadow: none !important;
          }
          .meeting-minutes-list-print-root,
          .meeting-minutes-list-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Tighten table for 5-column portrait fit */
          .meeting-minutes-list-print-root table { font-size: 11px !important; }
          .meeting-minutes-list-print-root td,
          .meeting-minutes-list-print-root th { padding: 6px 6px !important; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        showHeader={false}
        bodyClassName="p-0"
        className="!max-w-6xl meeting-minutes-list-print-root modal-card-print"
      >
        <div className="bg-white text-slate-800 rounded-2xl overflow-hidden">
          {/* Action bar */}
          <div className="flex flex-wrap gap-3 px-6 pt-5 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !!error || rows.length === 0}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-purple-300/40 transition-all hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              {t('meeting.report.print', 'PRINT')}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || !!error || rows.length === 0}
              className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-emerald-300/40 transition-all hover:-translate-y-0.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t('meeting.reportList.exportExcel', 'EXPORT TO EXCEL')}
            </button>
          </div>

          {/* Powered-by + close */}
          <div className="flex items-center justify-between px-6 mt-3 print:px-0">
            <div className="text-[11px] text-slate-500 print:text-black">
              {t('meeting.report.poweredBy', 'Powered by')} [SYD] — Call 2238
            </div>
            <button
              type="button"
              onClick={onClose}
              className="print:hidden inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={t('meeting.report.close', 'CLOSE')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Banner */}
          <div className="px-6 pt-2 pb-1">
            <img
              src={BANNER_URL}
              alt="SYD ICT Solutions"
              className="w-full max-h-32 object-contain mx-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Title row + print date */}
          <div className="flex items-center justify-between px-6 mt-2">
            <div className="flex-1" />
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 text-center print:text-black">
              {t('meeting.reportList.title', 'Meeting Agenda Report')}
            </h1>
            <div className="flex-1 text-right text-[12px] text-cyan-600 font-medium print:text-black">
              {t('meeting.report.printDate', 'Print Date')}: {today}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pt-3 pb-6">
            {loading && (
              <div className="text-center py-12 text-slate-500">
                <div className="inline-block w-8 h-8 border-[3px] border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin" />
                <p className="mt-3 text-sm">
                  {t('common.loading', 'Loading…')}
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="text-center py-10 text-red-600 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#1f6f7e] text-white print:!bg-[#1f6f7e] print:!text-white">
                      {columns.map((c) => (
                        <th
                          key={c.key}
                          style={{ width: c.w }}
                          className="text-left font-semibold px-3 py-2 border border-slate-300 align-middle"
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="text-center text-slate-400 italic py-6 border border-slate-300"
                        >
                          {t('empty.noData', 'No data found')}
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={r.ID ?? r.id ?? i} className="align-top print:break-inside-avoid">
                          <td className="px-3 py-2 border border-slate-300 text-slate-700 print:text-black">
                            {i + 1}
                          </td>
                          <td className="px-3 py-2 border border-slate-300 text-slate-700 whitespace-pre-wrap print:text-black">
                            {r.Agenda || r.agenda || '—'}
                          </td>
                          <td className="px-3 py-2 border border-slate-300 text-slate-700 whitespace-pre-wrap print:text-black">
                            {r.Participants || r.participance || '—'}
                          </td>
                          <td className="px-3 py-2 border border-slate-300 text-slate-700 whitespace-pre-wrap print:text-black">
                            {r.Comments || r.comments || '—'}
                          </td>
                          <td className="px-3 py-2 border border-slate-300 text-slate-700 whitespace-pre-wrap print:text-black">
                            {r.Decisions || r.decisions || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Date range footer */}
                {(dateFrom || dateTo) && (
                  <div className="mt-3 text-[11px] text-slate-500 print:text-black">
                    {t('meeting.from', 'From')}:{' '}
                    <span className="text-slate-700 font-medium print:text-black">
                      {formatDate(dateFrom) || '—'}
                    </span>
                    <span className="mx-2">·</span>
                    {t('meeting.to', 'To')}:{' '}
                    <span className="text-slate-700 font-medium print:text-black">
                      {formatDate(dateTo) || '—'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Printer, X, Users, ListTodo, ClipboardCheck, Gavel, Calendar, Hash,
} from 'lucide-react';
import Modal from '../components/ui/Modal';

const BANNER_URL =
  'https://sydimg.s3.eu-west-2.amazonaws.com/SYDlogos/banner-01.jpg';

const formatDate = (value) => {
  if (!value) return '—';
  const s = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
};

const splitParticipants = (raw) => {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  return String(raw)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 overflow-hidden print:shadow-none print:border-black">
      <div className="flex items-center gap-2 bg-[#0B3C5D] text-white font-semibold py-2 px-4 tracking-wide print:border-b print:border-black">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{title}</span>
      </div>
      <div className="px-4 py-3 text-sm text-slate-700 print:text-black">{children}</div>
    </div>
  );
}

export default function MeetingMinutesReportModal({ isOpen, onClose, row }) {
  const { t } = useTranslation();
  const participants = useMemo(
    () => splitParticipants(row?.participance),
    [row?.participance]
  );

  if (!isOpen || !row) return null;

  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print CSS — only the modal card prints, no overlay/chrome. Mirrors
          the approach used by StudentProfileModal so behaviour stays consistent. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .meeting-minutes-print-root,
          .meeting-minutes-print-root * { visibility: visible !important; }
          .meeting-minutes-print-root {
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
          .meeting-minutes-print-root *,
          .meeting-minutes-print-root *::before,
          .meeting-minutes-print-root *::after {
            overflow: visible !important;
            max-height: none !important;
            box-shadow: none !important;
          }
          .meeting-minutes-print-root,
          .meeting-minutes-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        showHeader={false}
        bodyClassName="p-0"
        className="!max-w-5xl meeting-minutes-print-root modal-card-print"
      >
        <div className="bg-white text-slate-800 rounded-2xl overflow-hidden">
          {/* Action bar */}
          <div className="flex flex-wrap gap-3 px-6 pt-5 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold shadow-md shadow-purple-300/40 transition-all hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              {t('meeting.report.print', 'PRINT')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white text-sm font-semibold shadow-md shadow-slate-300/40 transition-all hover:-translate-y-0.5"
            >
              <X className="w-4 h-4" />
              {t('meeting.report.close', 'CLOSE')}
            </button>
          </div>

          {/* Branded header — banner image */}
          <div className="relative px-6 pt-4 pb-3 mt-2 border-b-[3px] border-double border-[#0B3C5D]/30 print:border-b-2 print:border-solid print:border-black">
            <img
              src={BANNER_URL}
              alt="SYD ICT Solutions"
              className="w-full max-h-28 object-contain mx-auto"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="text-right text-[11px] text-cyan-600 font-medium mt-2 print:text-black">
              {t('meeting.report.printDate', 'Print Date')}: {today}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {/* Hero — Meeting Minutes title + meeting date */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 print:border-black">
              <div>
                <div className="text-2xl font-extrabold text-slate-800 leading-tight print:text-black">
                  {t('meeting.report.title', 'Meeting Minutes')}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {row.id != null && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 print:border print:border-black print:!bg-white">
                      <Hash className="w-3 h-3" /> {t('meeting.report.id', 'ID')}: {row.id}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#0B3C5D]/10 text-[#0B3C5D] font-semibold print:border print:border-black print:!bg-white print:!text-black">
                    <Calendar className="w-3 h-3" /> {formatDate(row.meet_date)}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 text-right print:text-black">
                <div>{t('meeting.report.recordedBy', 'Recorded by')}</div>
                <div className="text-slate-700 font-semibold mt-0.5 print:text-black">
                  {row.username || '—'}
                </div>
              </div>
            </div>

            {/* Section cards */}
            <div className="grid grid-cols-1 gap-4">
              <SectionCard icon={Users} title={t('meeting.report.participants', 'Participants')}>
                {participants.length === 0 ? (
                  <p className="text-slate-400 italic">—</p>
                ) : (
                  <ol className={`list-decimal list-inside space-y-1 ${participants.length > 6 ? 'md:columns-2 md:gap-6' : ''}`}>
                    {participants.map((p, i) => (
                      <li key={`${i}-${p}`} className="break-inside-avoid">{p}</li>
                    ))}
                  </ol>
                )}
              </SectionCard>

              <SectionCard icon={ListTodo} title={t('meeting.report.agenda', 'Agenda')}>
                <p className="whitespace-pre-wrap leading-relaxed">{row.agenda || '—'}</p>
              </SectionCard>

              <SectionCard icon={ClipboardCheck} title={t('meeting.report.tasks', 'Tasks')}>
                <p className="whitespace-pre-wrap leading-relaxed">{row.comments || '—'}</p>
              </SectionCard>

              <SectionCard icon={Gavel} title={t('meeting.report.decisions', 'Decisions')}>
                <p className="whitespace-pre-wrap leading-relaxed">{row.decisions || '—'}</p>
              </SectionCard>
            </div>

            {/* Footer meta */}
            <div className="mt-6 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 print:text-black print:border-black">
              <div>
                {t('meeting.report.registered', 'Registered')}:&nbsp;
                <span className="text-slate-700 font-medium print:text-black">
                  {row.reg_date ? new Date(row.reg_date).toLocaleDateString() : '—'}
                </span>
                <span className="mx-2">·</span>
                {t('meeting.report.by', 'By')}:&nbsp;
                <span className="text-slate-700 font-medium print:text-black">{row.username || '—'}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="font-semibold text-slate-600 print:text-black">{t('meeting.report.universityDirector', 'University Director')}:</span>
                <span className="inline-block w-40 border-b border-slate-400 print:border-black" />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Printer, FileSpreadsheet, User, Phone, MapPin, Calendar, Heart, UserCheck,
  GraduationCap, School, DollarSign, Accessibility, Globe, ImageIcon, Hash,
  IdCard, Users, X,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { fetchDataPaginated } from '../../../services/api';

// Two-column layout — left column shows identity & contact, right shows
// guardian/class/finance/health. Tuned so the whole profile fits on one A4
// page without scrolling. Labels resolve via i18n at render time.
const COL_LEFT = [
  { key: 'std_id',           labelKey: 'studentProfile.cols.id',               icon: Hash },
  { key: 'student_name',     labelKey: 'studentProfile.cols.name',             icon: User },
  { key: 'phone',            labelKey: 'studentProfile.cols.phone',            icon: Phone },
  { key: 'pob',              labelKey: 'studentProfile.cols.pob',              icon: MapPin },
  { key: 'age',              labelKey: 'studentProfile.cols.age',              icon: Calendar },
  { key: 'mother_name',      labelKey: 'studentProfile.cols.motherName',       icon: Heart },
  { key: 'mother_phone',     labelKey: 'studentProfile.cols.motherPhone',      icon: Phone },
  { key: 'id_card',          labelKey: 'studentProfile.cols.idCard',           icon: IdCard },
];

const COL_RIGHT = [
  { key: 'gurdian_name',     labelKey: 'studentProfile.cols.guardianName',     icon: UserCheck },
  { key: 'gurdian_phone',    labelKey: 'studentProfile.cols.guardianPhone',    icon: Phone },
  { key: 'gurdian_relation', labelKey: 'studentProfile.cols.guardianRelation', icon: Users },
  { key: 'enroll_type',      labelKey: 'studentProfile.cols.studentType',      icon: GraduationCap },
  { key: 'transfer_school',  labelKey: 'studentProfile.cols.transferSchool',   icon: School },
  { key: 'finance_detail',   labelKey: 'studentProfile.cols.financeDetail',    icon: DollarSign },
  { key: 'orphan_status',    labelKey: 'studentProfile.cols.orphanStatus',     icon: Heart },
  { key: 'disability_status',labelKey: 'studentProfile.cols.disabilityStatus', icon: Accessibility },
  { key: 'refugee',          labelKey: 'studentProfile.cols.refugee',          icon: Globe },
];

function formatValue(v, naLabel) {
  if (v == null || v === '') return naLabel;
  return String(v);
}

function buildClassLine(p, batchLabel, naLabel) {
  const bits = [
    p?.class_name,
    p?.academic_name,
    p?.batch_name && `${batchLabel} ${p.batch_name}`,
  ].filter(Boolean);
  return bits.length ? bits.join(' • ') : naLabel;
}

function ProfileRow({ icon: Icon, label, value, missingMarker }) {
  const isMissing = value === missingMarker;
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-cyan-50/30 dark:hover:bg-slate-700/30 transition-colors print:hover:bg-transparent">
      <Icon className="w-4 h-4 text-[#0B3C5D]/70 dark:text-teal-300/80 shrink-0 print:text-black" />
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-[44%] truncate print:text-black">{label}</div>
      <div className={`text-xs flex-1 truncate ${isMissing ? 'text-slate-400 dark:text-slate-500 italic' : 'text-slate-800 dark:text-slate-100'} print:text-black print:font-medium`}>
        {value}
      </div>
    </div>
  );
}

export default function StudentProfileModal({ isOpen, onClose, stdId }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !stdId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setProfile(null);
    fetchDataPaginated({ queryName: 'StudentProfile', page: 1, limit: 1, std_id: stdId })
      .then((res) => {
        if (cancelled) return;
        const row = res?.data?.[0] ?? null;
        setProfile(row);
      })
      .catch((e) => { if (!cancelled) setError(e?.message || t('studentProfile.errLoad', 'Failed to load profile')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, stdId, t]);

  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const naLabel = t('studentProfile.na', 'N/A');
  const batchLabel = t('studentProfile.batch', 'Batch');

  // Print by physically moving the card to <body> for the duration of the
  // print, then restoring it. CSS-only attempts (visibility:hidden,
  // display:contents on ancestors, :has() walks) all left the card flowing
  // at its modal-positioned location and produced blank/missing pages.
  // Cloning produced a single page but the cloned subtree dropped its
  // computed/animation styles (framer-motion inline transforms), leaving a
  // visually empty page. Moving the live element preserves every applied
  // style; afterprint puts it back exactly where it was.
  const handlePrint = () => {
    const original = document.querySelector('.student-profile-print-root');
    if (!original) {
      window.print();
      return;
    }
    const parent = original.parentNode;
    const nextSibling = original.nextSibling;
    const previousInlineStyle = original.getAttribute('style') || '';

    // Neutralise framer-motion's transform/opacity inline styles so the
    // moved card is fully visible during print.
    original.style.cssText = `${previousInlineStyle}; transform: none !important; opacity: 1 !important;`;

    document.body.appendChild(original);
    document.body.classList.add('printing-student-profile');

    const cleanup = () => {
      // Restore the original location and inline styles so the modal looks
      // identical when the print dialog closes.
      if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(original, nextSibling);
      } else {
        parent.appendChild(original);
      }
      if (previousInlineStyle) {
        original.setAttribute('style', previousInlineStyle);
      } else {
        original.removeAttribute('style');
      }
      document.body.classList.remove('printing-student-profile');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };
  const handleExport = () => {
    if (!profile) return;
    const allRows = [
      ...COL_LEFT,
      ...COL_RIGHT,
      { key: 'class_line', labelKey: 'studentProfile.cols.class' },
    ];
    const rows = allRows.map(({ key, labelKey }) => {
      const v = key === 'class_line' ? buildClassLine(profile, batchLabel, naLabel) : profile[key];
      return [t(labelKey), formatValue(v, naLabel)];
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-${profile.std_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Print CSS — when the user prints, handlePrint() moves the card
          directly under <body> and adds the `printing-student-profile`
          class. We hide every body-direct child except the card, reset its
          screen-only chrome (max-height, shadows, transforms), and let
          tailwind's grid/flex inside it render unchanged. afterprint puts
          everything back exactly where it was. */}
      <style>{`
        @media print {
          html, body.printing-student-profile {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Hide every body-direct child that isn't the card. */
          body.printing-student-profile > *:not(.student-profile-print-root) {
            display: none !important;
          }

          /* The card — full page width, single page, no on-screen chrome. */
          body.printing-student-profile > .student-profile-print-root {
            display: block !important;
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            transform: none !important;
            opacity: 1 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
            visibility: visible !important;
          }

          /* Inside the card: only release overflow/max-height clips —
             do NOT touch the display property, otherwise tailwind grid/flex break. */
          .student-profile-print-root *,
          .student-profile-print-root *::before,
          .student-profile-print-root *::after {
            overflow: visible !important;
            max-height: none !important;
            box-shadow: none !important;
            visibility: visible !important;
          }

          /* Force-print background colors (gradient header etc.). */
          .student-profile-print-root,
          .student-profile-print-root * {
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
        className="!max-w-5xl student-profile-print-root modal-card-print"
      >
        <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl overflow-hidden">
          {/* Floating close button — modal hides the default header so we add
              an explicit X here. Always visible (never print). */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="absolute top-3 right-3 z-10 p-2 rounded-xl text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200 transition-colors print:hidden"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Action bar */}
          <div className="flex flex-wrap gap-3 px-6 pt-5 pr-14 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold shadow-md shadow-purple-300/40 transition-all hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              {t('studentProfile.print', 'PRINT')}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold shadow-md shadow-emerald-300/40 transition-all hover:-translate-y-0.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t('studentProfile.exportExcel', 'EXPORT TO EXCEL')}
            </button>
          </div>

          {/* Branded header */}
          <div className="relative px-6 pt-4 pb-3 mt-2 border-b-[3px] border-double border-[#0B3C5D]/30 dark:border-teal-400/30 print:border-b-2 print:border-solid print:border-black">
            <div className="absolute top-1.5 right-6 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 print:text-black">
              <span className="font-semibold text-slate-500 dark:text-slate-400 print:text-black">{t('studentProfile.poweredBy', 'Powered by')}</span> [SYD] — {t('studentProfile.callPhone', 'Call 2238')}
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full border-[3px] border-[#0B3C5D] dark:border-teal-400 flex items-center justify-center font-black text-[#0B3C5D] dark:text-teal-300 shadow-inner bg-gradient-to-br from-white to-slate-100 dark:from-slate-700 dark:to-slate-800 print:shadow-none">
                SYD
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-extrabold tracking-[0.18em] text-[#0B3C5D] dark:text-teal-300 print:text-black">
                  {t('studentProfile.schoolName', 'SYD ICT SOLUTIONS')}
                </div>
                <div className="text-[10px] md:text-xs tracking-[0.42em] text-[#0B3C5D]/80 dark:text-teal-300/80 font-semibold mt-0.5 print:text-black">
                  {t('studentProfile.schoolType', 'PRIMARY & SECONDARY SCHOOL')}
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-cyan-600 dark:text-cyan-400 font-medium mt-2 print:text-black">
              {t('studentProfile.printDate', 'Print Date')}: {today}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {loading && (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <div className="inline-block w-8 h-8 border-[3px] border-[#0B3C5D]/20 dark:border-teal-400/20 border-t-[#0B3C5D] dark:border-t-teal-400 rounded-full animate-spin" />
                <p className="mt-3 text-sm">{t('studentProfile.loading', 'Loading profile…')}</p>
              </div>
            )}
            {error && !loading && (
              <div className="text-center py-10 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                {error}
              </div>
            )}

            {!loading && !error && profile && (
              <>
                {/* Top hero — photo + identity */}
                <div className="flex flex-wrap items-center gap-5 pb-4 mb-4 border-b border-slate-200 dark:border-slate-700 print:border-black">
                  <div className="relative shrink-0">
                    {profile.image && /^https?:\/\//i.test(profile.image) ? (
                      <img
                        src={profile.image}
                        alt={profile.student_name || t('studentProfile.cols.name', 'Student')}
                        className="w-24 h-24 object-cover rounded-xl border-4 border-white dark:border-slate-700 ring-2 ring-[#0B3C5D]/20 dark:ring-teal-400/30 shadow-md print:shadow-none print:ring-1 print:ring-black"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-4 border-white dark:border-slate-700 ring-2 ring-slate-200 dark:ring-slate-600 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 shadow-md print:shadow-none print:ring-1 print:ring-black">
                        <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                        <span className="text-[9px] font-semibold tracking-wider uppercase">{t('studentProfile.noImage', 'No Image')}</span>
                      </div>
                    )}
                    {profile.sex && (
                      <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-md print:shadow-none print:border print:border-black print:!bg-white print:!text-black
                        ${String(profile.sex).toLowerCase() === 'male'
                          ? 'bg-blue-500 text-white'
                          : 'bg-pink-500 text-white'}`}>
                        {profile.sex}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight print:text-black">
                      {profile.student_name || '—'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 print:border print:border-black print:!bg-white">
                        <Hash className="w-3 h-3" /> {t('studentProfile.cols.id', 'ID')}: {profile.std_id}
                      </span>
                      {profile.id_card && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 print:border print:border-black print:!bg-white">
                          <IdCard className="w-3 h-3" /> {profile.id_card}
                        </span>
                      )}
                      {profile.class_name && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#0B3C5D]/10 dark:bg-teal-400/15 text-[#0B3C5D] dark:text-teal-300 font-semibold print:border print:border-black print:!bg-white print:!text-black">
                          <GraduationCap className="w-3 h-3" /> {buildClassLine(profile, batchLabel, naLabel)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Two-column profile grid */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm shadow-slate-200/60 dark:shadow-slate-900/40 overflow-hidden print:shadow-none print:border-black">
                  <div className="bg-gradient-to-r from-[#0B3C5D] to-[#0D9488] text-white text-center font-semibold py-2 tracking-wide print:!bg-white print:!text-black print:border-b print:border-black">
                    {t('studentProfile.title', 'Student Profile')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="md:border-r border-slate-200 dark:border-slate-700 print:border-r print:border-black">
                      {COL_LEFT.map(({ key, labelKey, icon }) => (
                        <ProfileRow
                          key={key}
                          icon={icon}
                          label={t(labelKey)}
                          value={formatValue(profile[key], naLabel)}
                          missingMarker={naLabel}
                        />
                      ))}
                    </div>
                    <div>
                      {COL_RIGHT.map(({ key, labelKey, icon }) => (
                        <ProfileRow
                          key={key}
                          icon={icon}
                          label={t(labelKey)}
                          value={formatValue(profile[key], naLabel)}
                          missingMarker={naLabel}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer meta */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 print:text-black print:border-black">
                  <div>
                    {t('studentProfile.registered', 'Registered')}:&nbsp;
                    <span className="text-slate-700 dark:text-slate-200 font-medium print:text-black">
                      {profile.reg_date ? new Date(profile.reg_date).toLocaleDateString() : '—'}
                    </span>
                    <span className="mx-2">·</span>
                    {t('studentProfile.by', 'By')}:&nbsp;
                    <span className="text-slate-700 dark:text-slate-200 font-medium print:text-black">{profile.username || '—'}</span>
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 print:text-black">
                    {t('studentProfile.generatedBy', 'Generated by Barbaariye Admin')}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

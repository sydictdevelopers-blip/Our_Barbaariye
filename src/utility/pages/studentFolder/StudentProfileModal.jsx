import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Printer, FileSpreadsheet, User, Phone, MapPin, Calendar, Heart, UserCheck,
  GraduationCap, School, DollarSign, Accessibility, Globe, ImageIcon, Hash,
  IdCard, Users,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { fetchDataPaginated } from '../../../services/api';

// Two-column layout — left column shows identity & contact, right shows
// guardian/class/finance/health. Tuned so the whole profile fits on one A4
// page without scrolling.
const COL_LEFT = [
  { key: 'std_id',           label: 'ID',                   icon: Hash },
  { key: 'student_name',     label: 'Name',                 icon: User },
  { key: 'phone',            label: 'Phone',                icon: Phone },
  { key: 'pob',              label: 'Place Of Birth',       icon: MapPin },
  { key: 'age',              label: 'Age',                  icon: Calendar },
  { key: 'mother_name',      label: 'Mother Name',          icon: Heart },
  { key: 'mother_phone',     label: 'Mother Phone',         icon: Phone },
  { key: 'id_card',          label: 'ID Card',              icon: IdCard },
];

const COL_RIGHT = [
  { key: 'gurdian_name',     label: 'Gurdian Name',         icon: UserCheck },
  { key: 'gurdian_phone',    label: 'Gurdian Phone',        icon: Phone },
  { key: 'gurdian_relation', label: 'Gurdian Relationship', icon: Users },
  { key: 'enroll_type',      label: 'Student Type',         icon: GraduationCap },
  { key: 'transfer_school',  label: 'Transfered School',    icon: School },
  { key: 'finance_detail',   label: 'Finance Detial',       icon: DollarSign },
  { key: 'orphan_status',    label: 'Orphan Type',          icon: Heart },
  { key: 'disability_status',label: 'Disability Type',      icon: Accessibility },
  { key: 'refugee',          label: 'Refugee Type',         icon: Globe },
];

function formatValue(v) {
  if (v == null || v === '') return 'N/A';
  return String(v);
}

function buildClassLine(p) {
  const bits = [p?.class_name, p?.academic_name, p?.batch_name && `Batch ${p.batch_name}`].filter(Boolean);
  return bits.length ? bits.join(' • ') : 'N/A';
}

function ProfileRow({ icon: Icon, label, value }) {
  const isMissing = value === 'N/A';
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-cyan-50/30 transition-colors print:hover:bg-transparent">
      <Icon className="w-4 h-4 text-[#0B3C5D]/70 shrink-0 print:text-black" />
      <div className="text-xs font-semibold text-slate-600 w-[44%] truncate print:text-black">{label}</div>
      <div className={`text-xs flex-1 truncate ${isMissing ? 'text-slate-400 italic' : 'text-slate-800'} print:text-black print:font-medium`}>
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
      .catch((e) => { if (!cancelled) setError(e?.message || 'Failed to load profile'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, stdId]);

  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => window.print();
  const handleExport = () => {
    if (!profile) return;
    const allRows = [...COL_LEFT, ...COL_RIGHT, { key: 'class_line', label: 'Class' }];
    const rows = allRows.map(({ key, label }) => {
      const v = key === 'class_line' ? buildClassLine(profile) : profile[key];
      return [label, formatValue(v)];
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
      {/* Print CSS — when the user prints, only the modal content prints (no
          dimmed overlay, no surrounding chrome). Selectors target Modal's
          fixed-position root via the `student-profile-print-root` container. */}
      <style>{`
        @media print {
          /* Hide everything, then re-reveal just the printable card. */
          body * { visibility: hidden !important; }
          .student-profile-print-root,
          .student-profile-print-root * { visibility: visible !important; }

          /* Lift the modal out of its fixed overlay so it occupies the whole
             printed page; reset overflow + max-height so all rows are visible
             instead of being clipped by the on-screen 80vh viewport limit. */
          .student-profile-print-root {
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
            ring: none !important;
            overflow: visible !important;
          }
          .student-profile-print-root *,
          .student-profile-print-root *::before,
          .student-profile-print-root *::after {
            overflow: visible !important;
            max-height: none !important;
            box-shadow: none !important;
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
        <div className="bg-white text-slate-800 rounded-2xl overflow-hidden">
          {/* Action bar */}
          <div className="flex flex-wrap gap-3 px-6 pt-5 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold shadow-md shadow-purple-300/40 transition-all hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              PRINT
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold shadow-md shadow-emerald-300/40 transition-all hover:-translate-y-0.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              EXPORT TO EXCEL
            </button>
          </div>

          {/* Branded header */}
          <div className="relative px-6 pt-4 pb-3 mt-2 border-b-[3px] border-double border-[#0B3C5D]/30 print:border-b-2 print:border-solid print:border-black">
            <div className="absolute top-1.5 right-6 text-[10px] uppercase tracking-wider text-slate-400 print:text-black">
              <span className="font-semibold text-slate-500 print:text-black">Powered by</span> [SYD] — Call 2238
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full border-[3px] border-[#0B3C5D] flex items-center justify-center font-black text-[#0B3C5D] shadow-inner bg-gradient-to-br from-white to-slate-100 print:shadow-none">
                SYD
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-extrabold tracking-[0.18em] text-[#0B3C5D] print:text-black">
                  SYD ICT SOLUTIONS
                </div>
                <div className="text-[10px] md:text-xs tracking-[0.42em] text-[#0B3C5D]/80 font-semibold mt-0.5 print:text-black">
                  PRIMARY &amp; SECONDARY SCHOOL
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-cyan-600 font-medium mt-2 print:text-black">
              Print Date: {today}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {loading && (
              <div className="text-center py-12 text-slate-500">
                <div className="inline-block w-8 h-8 border-[3px] border-[#0B3C5D]/20 border-t-[#0B3C5D] rounded-full animate-spin" />
                <p className="mt-3 text-sm">Loading profile…</p>
              </div>
            )}
            {error && !loading && (
              <div className="text-center py-10 text-red-600 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}

            {!loading && !error && profile && (
              <>
                {/* Top hero — photo + identity */}
                <div className="flex flex-wrap items-center gap-5 pb-4 mb-4 border-b border-slate-200 print:border-black">
                  <div className="relative shrink-0">
                    {profile.image && /^https?:\/\//i.test(profile.image) ? (
                      <img
                        src={profile.image}
                        alt={profile.student_name || 'Student'}
                        className="w-24 h-24 object-cover rounded-xl border-4 border-white ring-2 ring-[#0B3C5D]/20 shadow-md print:shadow-none print:ring-1 print:ring-black"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-4 border-white ring-2 ring-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400 shadow-md print:shadow-none print:ring-1 print:ring-black">
                        <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                        <span className="text-[9px] font-semibold tracking-wider uppercase">No Image</span>
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
                    <div className="text-2xl font-extrabold text-slate-800 leading-tight print:text-black">
                      {profile.student_name || '—'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 print:border print:border-black print:!bg-white">
                        <Hash className="w-3 h-3" /> ID: {profile.std_id}
                      </span>
                      {profile.id_card && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 print:border print:border-black print:!bg-white">
                          <IdCard className="w-3 h-3" /> {profile.id_card}
                        </span>
                      )}
                      {profile.class_name && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-[#0B3C5D]/10 text-[#0B3C5D] font-semibold print:border print:border-black print:!bg-white print:!text-black">
                          <GraduationCap className="w-3 h-3" /> {buildClassLine(profile)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Two-column profile grid */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 overflow-hidden print:shadow-none print:border-black">
                  <div className="bg-gradient-to-r from-[#0B3C5D] to-[#0D9488] text-white text-center font-semibold py-2 tracking-wide print:!bg-white print:!text-black print:border-b print:border-black">
                    Student Profile
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="md:border-r border-slate-200 print:border-r print:border-black">
                      {COL_LEFT.map(({ key, label, icon }) => (
                        <ProfileRow key={key} icon={icon} label={label} value={formatValue(profile[key])} />
                      ))}
                    </div>
                    <div>
                      {COL_RIGHT.map(({ key, label, icon }) => (
                        <ProfileRow key={key} icon={icon} label={label} value={formatValue(profile[key])} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer meta */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 print:text-black print:border-black">
                  <div>
                    Registered:&nbsp;
                    <span className="text-slate-700 font-medium print:text-black">
                      {profile.reg_date ? new Date(profile.reg_date).toLocaleDateString() : '—'}
                    </span>
                    <span className="mx-2">·</span>
                    By:&nbsp;
                    <span className="text-slate-700 font-medium print:text-black">{profile.username || '—'}</span>
                  </div>
                  <div className="text-slate-400 print:text-black">
                    Generated by Barbaariye Admin
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

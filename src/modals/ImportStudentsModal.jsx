import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download, Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2,
  FileDown, FileUp, FilePlus, Sparkles, Users, AlertTriangle, Loader2,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { crud, getSessionUBrIdNum } from '../services/api';
import { swalError, swalSuccess } from '../utils/swal';

/**
 * ImportStudentsModal — bulk-create students from a CSV file.
 *
 * UX:
 *   1. User downloads the sample CSV (headers below) so the column order is
 *      always correct.
 *   2. User uploads their filled file (file picker OR drag-and-drop). We parse
 *      it client-side, show a preview with row-level validation (required
 *      columns + sane types), and then drive the import per row through
 *      `bulk_student_import_sp` (atomic on the DB side — find-or-create
 *      address & responsible, insert student + student_class).
 *
 * Header order is contractual — the backend SP receives values positionally
 * from the param block we send, so renaming a column is fine but reordering
 * isn't.
 */
const CSV_HEADERS = [
  'id card',
  'Student Name',
  'Telephone',
  'Student District',
  'Student Village',
  'Gender',
  'Mother Name',
  'Birth Place',
  'Birth Date',
  'Responsible Name',
  'Responsible Telephone',
  'Orphan Status',
  'Disability Status',
  'Refugee Status',
  'Class ID',
];

const SAMPLE_ROW = [
  'A12345',
  'Cali Maxamed Ahmed',
  '252612345678',
  'Hodan',
  'Wadajir',
  'Male',
  'Hawa Ahmed',
  'Mogadishu',
  '2014-08-15',
  'Maxamed Ahmed',
  '252615678901',
  'Not Orphan',
  'No Disability',
  'Not Refugee',
  '12',
];

function buildSampleCsv() {
  const escape = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    CSV_HEADERS.map(escape).join(','),
    SAMPLE_ROW.map(escape).join(','),
  ];
  // BOM helps Excel detect UTF-8 when opening the file directly.
  return '﻿' + lines.join('\n');
}

function downloadSampleCsv(filename = 'students_import_template.csv') {
  const blob = new Blob([buildSampleCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Minimal RFC-4180-ish CSV parser — handles quoted fields, embedded commas,
 *  doubled-quote escapes, and CRLF/LF line endings. Avoids a parser dep for
 *  one-off use. Strips a leading UTF-8 BOM if present. */
function parseCsv(text) {
  if (!text) return [];
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => String(c).trim() !== '')) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    if (row.some((c) => String(c).trim() !== '')) rows.push(row);
  }
  return rows;
}

const REQUIRED_COL_INDICES = [0, 1, 2, 5, 8, 9, 14];

function validateRow(cells) {
  const errs = [];
  REQUIRED_COL_INDICES.forEach((i) => {
    if (!String(cells[i] ?? '').trim()) errs.push(CSV_HEADERS[i]);
  });
  if (cells[14] && !/^\d+$/.test(String(cells[14]).trim())) {
    errs.push(`${CSV_HEADERS[14]} (numeric)`);
  }
  return errs;
}

function bytesToReadable(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/* ───────────────────────── Sub-components ───────────────────────── */

function StepBadge({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ring-2 transition-colors
          ${done ? 'bg-emerald-500 text-white ring-emerald-200 dark:ring-emerald-800' :
            active ? 'bg-[#0B3C5D] text-white ring-[#0B3C5D]/25 dark:bg-teal-500 dark:ring-teal-500/30' :
            'bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-700 dark:text-slate-500 dark:ring-slate-700'}`}
      >
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
      </div>
      <span
        className={`text-[11px] font-semibold uppercase tracking-wide truncate
          ${active || done ? 'text-[#0B3C5D] dark:text-teal-300' : 'text-slate-400 dark:text-slate-500'}`}
      >
        {label}
      </span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-slate-50 dark:bg-slate-800/40 ring-slate-200 dark:ring-slate-700 text-slate-700 dark:text-slate-200',
    success: 'bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-200 dark:ring-emerald-800 text-emerald-700 dark:text-emerald-300',
    warn:    'bg-amber-50  dark:bg-amber-900/20  ring-amber-200  dark:ring-amber-800  text-amber-700  dark:text-amber-300',
    danger:  'bg-rose-50   dark:bg-rose-900/20   ring-rose-200   dark:ring-rose-800   text-rose-700   dark:text-rose-300',
  };
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 ${tones[tone]}`}>
      {Icon && <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide opacity-75 font-semibold">{label}</div>
        <div className="text-base font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── Modal ───────────────────────── */

export default function ImportStudentsModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [parsedRows, setParsedRows] = useState([]);
  const [headerWarn, setHeaderWarn] = useState('');
  const [rowErrors, setRowErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, fail: 0 });
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFileName('');
      setFileSize(0);
      setParsedRows([]);
      setHeaderWarn('');
      setRowErrors([]);
      setProgress({ done: 0, total: 0, ok: 0, fail: 0 });
      setDragOver(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [isOpen]);

  const ingestFile = async (file) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      swalError(t('swal.titles.error'), t('importStudents.errNotCsv', { defaultValue: 'Please select a .csv file.' }));
      return;
    }
    setFileName(file.name);
    setFileSize(file.size);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setHeaderWarn(t('importStudents.errEmpty', { defaultValue: 'The file is empty.' }));
        setParsedRows([]);
        setRowErrors([]);
        return;
      }
      const [header, ...body] = rows;
      if (header.length !== CSV_HEADERS.length) {
        setHeaderWarn(
          t('importStudents.errHeaderCount', {
            expected: CSV_HEADERS.length,
            got: header.length,
            defaultValue: `Header has {{got}} columns; expected {{expected}}. Use the sample template.`,
          })
        );
      } else {
        setHeaderWarn('');
      }
      const padded = body.map((r) => {
        const out = r.slice(0, CSV_HEADERS.length);
        while (out.length < CSV_HEADERS.length) out.push('');
        return out;
      });
      setParsedRows(padded);
      const errs = padded
        .map((cells, idx) => ({ rowIdx: idx, errs: validateRow(cells) }))
        .filter((x) => x.errs.length);
      setRowErrors(errs);
    } catch (err) {
      swalError(t('swal.titles.error'), err?.message || t('importStudents.errParse', { defaultValue: 'Failed to parse the file.' }));
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    await ingestFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    await ingestFile(file);
  };

  const clearFile = () => {
    setFileName('');
    setFileSize(0);
    setParsedRows([]);
    setRowErrors([]);
    setHeaderWarn('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const validRows = useMemo(() => {
    const bad = new Set(rowErrors.map((e) => e.rowIdx));
    return parsedRows.map((r, i) => ({ idx: i, cells: r })).filter(({ idx }) => !bad.has(idx));
  }, [parsedRows, rowErrors]);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    const u_br_id = getSessionUBrIdNum();
    let ok = 0;
    let fail = 0;
    const failures = [];
    setProgress({ done: 0, total: validRows.length, ok: 0, fail: 0 });
    for (let i = 0; i < validRows.length; i++) {
      const { cells, idx } = validRows[i];
      try {
        await crud({
          operation: 'insert',
          fn: 'bulk_student_import_sp',
          params: {
            p_id_card_sp:               String(cells[0]  ?? '').trim(),
            p_student_name_sp:          String(cells[1]  ?? '').trim(),
            p_telephone_sp:             String(cells[2]  ?? '').trim(),
            p_district_sp:              String(cells[3]  ?? '').trim(),
            p_village_sp:               String(cells[4]  ?? '').trim(),
            p_gender_sp:                String(cells[5]  ?? '').trim(),
            p_mother_name_sp:           String(cells[6]  ?? '').trim(),
            p_birth_place_sp:           String(cells[7]  ?? '').trim(),
            p_birth_date_sp:            String(cells[8]  ?? '').trim(),
            p_responsible_name_sp:      String(cells[9]  ?? '').trim(),
            p_responsible_telephone_sp: String(cells[10] ?? '').trim(),
            p_orphan_status_sp:         String(cells[11] ?? '').trim(),
            p_disability_status_sp:     String(cells[12] ?? '').trim(),
            p_refugee_status_sp:        String(cells[13] ?? '').trim(),
            p_cl_id_sp:                 Number(cells[14]) || 0,
            p_u_br_id_sp:               u_br_id,
          },
        });
        ok += 1;
      } catch (err) {
        fail += 1;
        failures.push({ rowIdx: idx, message: err?.message || 'Failed' });
      }
      setProgress({ done: i + 1, total: validRows.length, ok, fail });
    }
    setImporting(false);
    if (fail === 0) {
      await swalSuccess('', t('importStudents.successCount', { count: ok, defaultValue: '{{count}} students imported.' }));
      onSuccess?.();
      onClose();
    } else if (ok === 0) {
      const lines = failures.slice(0, 10).map((f) => `#${f.rowIdx + 2}: ${f.message}`).join('\n');
      swalError(
        t('swal.titles.error'),
        `${t('importStudents.allFailed', { defaultValue: 'No rows were imported.' })}\n${lines}`
      );
    } else {
      const lines = failures.slice(0, 10).map((f) => `#${f.rowIdx + 2}: ${f.message}`).join('\n');
      swalError(
        '',
        `${t('importStudents.partial', { ok, fail, defaultValue: '{{ok}} imported, {{fail}} failed.' })}\n${lines}`
      );
      onSuccess?.();
    }
  };

  const previewRows = parsedRows.slice(0, 10);
  const overflow = parsedRows.length - previewRows.length;

  // Step indicator state — drives the colourful pill at the top.
  const hasFile = parsedRows.length > 0;
  const ready = validRows.length > 0;
  const stepActive = importing ? 4 : ready ? 3 : hasFile ? 3 : 2;
  const stepDone = (n) => {
    if (n === 1) return true; // template is always available
    if (n === 2) return hasFile;
    if (n === 3) return ready && !importing;
    if (n === 4) return importing && progress.done === progress.total && progress.total > 0;
    return false;
  };

  const progressPct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B3C5D] to-[#0d9488] flex items-center justify-center shadow-md shadow-[#0B3C5D]/20">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight truncate flex items-center gap-2">
              {t('importStudents.title')}
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {t('importStudents.subtitle')}
            </p>
          </div>
        </div>
      }
      size="2xl"
      footer={
        <div className="flex items-center justify-between gap-3 w-full flex-wrap">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 min-w-0 flex-1">
            {importing && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0B3C5D] dark:text-teal-300" />
                <span className="truncate">
                  {t('importStudents.progress', {
                    done: progress.done,
                    total: progress.total,
                    defaultValue: 'Importing {{done}}/{{total}}…',
                  })}
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={importing}>
              {t('common.close')}
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              {importing ? '…' : t('importStudents.importBtn', { count: validRows.length, defaultValue: 'Import ({{count}})' })}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ──────────────── Step indicator ──────────────── */}
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 px-3 py-2.5">
          <StepBadge n={1} label={t('importStudents.step1', { defaultValue: 'Template' })} active={stepActive >= 1} done={stepDone(1)} />
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700 min-w-[12px]" />
          <StepBadge n={2} label={t('importStudents.step2', { defaultValue: 'Upload' })} active={stepActive >= 2} done={stepDone(2)} />
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700 min-w-[12px]" />
          <StepBadge n={3} label={t('importStudents.step3', { defaultValue: 'Review' })} active={stepActive >= 3} done={stepDone(3)} />
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700 min-w-[12px]" />
          <StepBadge n={4} label={t('importStudents.step4', { defaultValue: 'Import' })} active={stepActive >= 4} done={stepDone(4)} />
        </div>

        {/* ──────────────── Top: sample download + drop zone ──────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {/* Sample download — narrower side card */}
          <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-[#0B3C5D]/[0.03] via-white to-[#0d9488]/[0.05] dark:from-slate-800/40 dark:via-slate-800/30 dark:to-teal-900/15 p-4 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#0B3C5D]/5 dark:bg-teal-500/10" aria-hidden />
            <div className="relative flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#0B3C5D] text-white flex items-center justify-center shadow-md shadow-[#0B3C5D]/30">
                <FileDown className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {t('importStudents.sampleTitle', { defaultValue: 'Sample template' })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {t('importStudents.sampleHint', { defaultValue: 'Download the CSV template, fill it in, and upload it back here.' })}
                </p>
                <button
                  type="button"
                  onClick={() => downloadSampleCsv()}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B3C5D] text-white hover:bg-[#0a3454] dark:bg-teal-600 dark:hover:bg-teal-500 text-xs font-semibold shadow-sm transition-all hover:-translate-y-px"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('importStudents.downloadSample', { defaultValue: 'Download sample (.csv)' })}
                </button>
              </div>
            </div>
          </div>

          {/* Drop zone — wider, dashed, with drag-over animation */}
          <div className="sm:col-span-3">
            {!fileName ? (
              <label
                htmlFor="import-csv-file"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all
                  ${dragOver
                    ? 'border-[#0B3C5D] bg-[#0B3C5D]/5 dark:border-teal-400 dark:bg-teal-500/10 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50/40 dark:bg-slate-800/30 hover:border-[#0B3C5D]/60 dark:hover:border-teal-400/60'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                  ${dragOver ? 'bg-[#0B3C5D] text-white dark:bg-teal-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                  <FileUp className="w-5 h-5" />
                </div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
                  {dragOver
                    ? t('importStudents.dropHere', { defaultValue: 'Drop the file here' })
                    : t('importStudents.fileTitle', { defaultValue: 'Upload CSV file' })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  {t('importStudents.dragOrPick', { defaultValue: 'Drag & drop or click to choose a .csv file' })}
                </div>
                <input
                  ref={fileRef}
                  id="import-csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                  className="sr-only"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                  <FilePlus className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200 truncate">
                    {fileName}
                  </div>
                  <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                    {bytesToReadable(fileSize)}
                    {parsedRows.length > 0 && (
                      <> · {t('importStudents.parsedRows', {
                        count: parsedRows.length,
                        defaultValue: '{{count}} rows parsed',
                      })}</>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={importing}
                  className="flex-shrink-0 p-1.5 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors disabled:opacity-40"
                  title={t('common.remove', { defaultValue: 'Remove' })}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ──────────────── Stats row (only after a file is parsed) ──────────────── */}
        {parsedRows.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={Users}
              tone="neutral"
              label={t('importStudents.statTotal', { defaultValue: 'Total rows' })}
              value={parsedRows.length}
            />
            <StatCard
              icon={CheckCircle2}
              tone="success"
              label={t('importStudents.statReady', { defaultValue: 'Ready to import' })}
              value={validRows.length}
            />
            <StatCard
              icon={AlertTriangle}
              tone={rowErrors.length ? 'danger' : 'neutral'}
              label={t('importStudents.statSkipped', { defaultValue: 'Will be skipped' })}
              value={rowErrors.length}
            />
          </div>
        )}

        {/* ──────────────── Header warning ──────────────── */}
        {headerWarn && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
            <span className="leading-relaxed">{headerWarn}</span>
          </div>
        )}

        {/* ──────────────── Row error list ──────────────── */}
        {rowErrors.length > 0 && (
          <div className="rounded-xl border border-rose-300 bg-rose-50/70 dark:bg-rose-900/15 dark:border-rose-700 px-3.5 py-3 text-xs text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('importStudents.rowErrorsTitle', {
                count: rowErrors.length,
                defaultValue: '{{count}} row(s) will be skipped',
              })}
            </div>
            <ul className="space-y-1 max-h-32 overflow-auto pr-1">
              {rowErrors.slice(0, 20).map((re) => (
                <li key={re.rowIdx} className="flex items-baseline gap-2">
                  <span className="inline-flex items-center justify-center px-1.5 min-w-[24px] h-4 rounded bg-rose-200/70 dark:bg-rose-800/40 text-[10px] font-bold">
                    #{re.rowIdx + 2}
                  </span>
                  <span className="opacity-90">{re.errs.join(', ')}</span>
                </li>
              ))}
              {rowErrors.length > 20 && (
                <li className="opacity-70 italic">
                  {t('importStudents.andMore', { n: rowErrors.length - 20, defaultValue: '… and {{n}} more' })}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ──────────────── Preview table ──────────────── */}
        {previewRows.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm shadow-slate-200/30 dark:shadow-slate-900/30">
            <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/40 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-teal-300" />
              {t('importStudents.previewTitle', { defaultValue: 'Preview (first 10 rows)' })}
            </div>
            <div className="overflow-auto max-h-[36vh]">
              <table className="w-full text-[11px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#0B3C5D] text-white">
                    <th className="text-start px-2 py-1.5 sticky left-0 bg-[#0B3C5D] z-10">#</th>
                    {CSV_HEADERS.map((h) => (
                      <th key={h} className="text-start px-2 py-1.5 whitespace-nowrap font-semibold tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((cells, idx) => {
                    const isBad = rowErrors.some((e) => e.rowIdx === idx);
                    return (
                      <tr
                        key={idx}
                        className={`border-t border-slate-200/70 dark:border-slate-700/70 transition-colors
                          ${isBad
                            ? 'bg-rose-50/70 dark:bg-rose-900/10 hover:bg-rose-100/70 dark:hover:bg-rose-900/20'
                            : 'hover:bg-[#0B3C5D]/[0.03] dark:hover:bg-teal-500/5'}`}
                      >
                        <td className={`px-2 py-1 sticky left-0 z-10 font-bold text-[10px]
                          ${isBad
                            ? 'bg-rose-50/70 dark:bg-rose-900/10 text-rose-600 dark:text-rose-300'
                            : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500'}`}>
                          {idx + 2}
                        </td>
                        {cells.map((c, j) => (
                          <td key={j} className="px-2 py-1 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {String(c ?? '')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {overflow > 0 && (
              <div className="px-3.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 italic">
                {t('importStudents.previewMore', { n: overflow, defaultValue: '… and {{n}} more rows not shown' })}
              </div>
            )}
          </div>
        )}

        {/* ──────────────── Progress bar (during import) ──────────────── */}
        {importing && (
          <div className="rounded-xl border border-[#0B3C5D]/30 dark:border-teal-700/40 bg-[#0B3C5D]/[0.04] dark:bg-teal-900/15 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#0B3C5D] dark:text-teal-300">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('importStudents.importing', { defaultValue: 'Importing…' })}
              </span>
              <span>{progress.done} / {progress.total} · {progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0B3C5D] to-[#0d9488] transition-all duration-200 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                {progress.ok}
              </span>
              <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300">
                <X className="w-3 h-3" />
                {progress.fail}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

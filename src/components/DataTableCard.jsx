/**
 * DataTableCard – professional data table with:
 *   • navy gradient header
 *   • smart cell formatting (dates, status badges, currency)
 *   • generous row spacing + subtle zebra striping
 *   • sticky first column, sortable headers
 *   • polished pagination
 */
import { useState, useMemo, useEffect, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, X, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import ErrorAlert from './ui/ErrorAlert';
import { tDb } from '../i18n/i18n';

/* ─── Cell classifiers ─── */
const CURRENCY_KEYS = ['balance', 'amount', 'salary', 'fee', 'price'];
const STATUS_KEYS = ['state', 'status', 'is_active', 'active', 'lock_user', 'locked'];
// Match ANY value that begins with YYYY-MM-DD (with or without time/timezone),
// so we don't have to maintain a regex of column names. The backend now passes
// dates through as raw strings, so this catches them all.
const DATE_VALUE_RE = /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const isCurrencyCol = (key) => CURRENCY_KEYS.some((k) => key === k || key?.toLowerCase().includes(k));
const isStatusCol = (key) => STATUS_KEYS.some((k) => key?.toLowerCase() === k);
const isDateValue = (value) => typeof value === 'string' && DATE_VALUE_RE.test(value.trim());

/**
 * Format a YYYY-MM-DD[ HH:MM:SS] string by splitting components manually —
 * NEVER `new Date(s)`, which would reinterpret the value through the user's
 * timezone and shift it. The string crossing the wire is exactly what's in
 * the DB, so we display it byte-for-byte equivalent (just prettier).
 */
const formatDate = (value) => {
  if (value == null || value === '') return '—';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return s;
  const [, y, mo, d, hh, mm] = m;
  // Construct Date with local-component overload so the calendar date is exact
  // regardless of the user's timezone (no UTC-string parsing path).
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (isNaN(date.getTime())) return s;
  const datePart = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  return hh ? `${datePart} ${hh}:${mm}` : datePart;
};

const StatusBadge = ({ value }) => {
  // Color buckets keyed off the original DB value (lowercased), independent of
  // the active language — so an "Active" row stays green even when displayed
  // as "Firfircoon" / "نشط".
  const v = String(value ?? '').trim().toLowerCase();
  const positive = ['active', 'enabled', 'yes', 'true', '1', 'open', 'approved', 'paid', 'unlocked'];
  const negative = ['inactive', 'disabled', 'no', 'false', '0', 'closed', 'rejected', 'unpaid', 'locked'];
  const neutral = ['pending', 'draft', 'in progress', 'review'];
  const cls = positive.includes(v)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30'
    : negative.includes(v)
    ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30'
    : neutral.includes(v)
    ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30'
    : 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-700/50 dark:text-slate-300 dark:ring-slate-400/20';
  const dotCls = positive.includes(v)
    ? 'bg-emerald-500'
    : negative.includes(v)
    ? 'bg-rose-500'
    : neutral.includes(v)
    ? 'bg-amber-500'
    : 'bg-slate-400';
  const translated = tDb(value);
  const label = translated == null || translated === '' ? '—' : String(translated);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
};

function getColumnAlign(key) {
  if (key === 'actions') return 'center';
  return 'left';
}

// Local-state editable cell: keeps focus on every keystroke even when the parent
// re-renders (parent re-renders happen every onChange because editValues lifts up).
// The committed value is propagated upward via onChange, but the input's own state
// is owned here so React never replaces the DOM input mid-typing.
function EditableCell({ initialValue, max, onChange }) {
  const [val, setVal] = useState(String(initialValue ?? ''));
  // Reset only when the underlying row value changes (e.g. data reload).
  useEffect(() => { setVal(String(initialValue ?? '')); }, [initialValue]);
  const maxNum = max != null && max !== '' ? Number(max) : null;
  return (
    <input
      type="number"
      step="any"
      min={0}
      max={maxNum != null && Number.isFinite(maxNum) ? maxNum : undefined}
      value={val}
      onChange={(e) => {
        let next = e.target.value;
        if (maxNum != null && Number.isFinite(maxNum) && next !== '' && Number(next) > maxNum) {
          next = String(maxNum);
        }
        setVal(next);
        onChange?.(next);
      }}
      className="w-24 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/30 focus:border-[#0B3C5D]"
    />
  );
}

const formatCell = (col, row) => {
  const value = row[col.key];
  if (isCurrencyCol(col.key)) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    const display = !isNaN(num) ? num.toLocaleString() : '0';
    return <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">${display}</span>;
  }
  if (isStatusCol(col.key)) return <StatusBadge value={value} />;
  // Date detection by value, not by column name — works for `started`, `ended`,
  // `meet_date`, etc. without per-column registration.
  if (isDateValue(value)) return <span className="tabular-nums text-slate-600 dark:text-slate-300">{formatDate(value)}</span>;
  if (value == null || value === '') return <span className="text-slate-300 dark:text-slate-600">—</span>;
  // tDb passes user-entered strings (names, etc.) through unchanged and only
  // translates known fixed-vocabulary values like 'By Name' / 'By Serial'.
  return <span className="text-slate-700 dark:text-slate-200">{tDb(String(value))}</span>;
};

function DataTableCard({
  showDataPanel = true,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  headerActions,
  columns,
  data,
  isLoading,
  error,
  errorHint,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyIconClickToLoad,
  emptyTitleClickToLoad,
  emptyDescClickToLoad,
  emptyTitleNoResult,
  emptyDescNoResult,
  renderActions,
  editableColumns,
  editableMaxField,
  editValues,
  onEditChange,
  rowKey,
  footerActions,
  total,
  currentPage,
  totalPages,
  itemsPerPage = 10,
  onPreviousPage,
  onNextPage,
  onPageClick,
  onPageSizeChange,
}) {
  // Subscribe to language changes so cells & dropdowns re-render when the user
  // switches language — tDb reads i18n at call time but doesn't trigger renders itself.
  const { t, i18n } = useTranslation();
  // Flip the prev/next chevrons in RTL — readers expect "previous" to point in
  // the direction they came from (right ←) when the document flows right-to-left.
  const isRtl = i18n.dir() === 'rtl';
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  // When the active language is Arabic, render numbers using Eastern Arabic
  // digits (٠–٩) so the pagination footer reads natively. The base lang is the
  // primary tag — e.g. 'ar-EG' or 'ar' both map to Arabic.
  const lng = String(i18n.language || '').toLowerCase().split('-')[0];
  const fmtNum = (n) => {
    if (n == null) return '';
    if (lng !== 'ar') return String(n);
    return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  };
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('dataTable.search', { defaultValue: 'Search...' });
  const resolvedNoResultTitle = emptyTitleNoResult ?? t('dataTable.noResult', { defaultValue: 'No result' });
  const resolvedNoResultDesc = emptyDescNoResult ?? t('dataTable.noResultDesc', { defaultValue: 'No matches for your search.' });
  const editableSet = useMemo(() => new Set(editableColumns || []), [editableColumns]);
  // Mar walba ku dar `__${index}` si rows-ka isku id ah (e.g. SP qaarkood
  // sida student_responsible oo soo celiya rows badan oo isku res_id ah)
  // ay u helaan React keys gaar ah. Tani waxay xal-bisaa "Encountered two
  // children with the same key" warning-ka, oo laga reebaa "duplicate
  // rendering" cilad-ka React-ka.
  const getRowKey = (row, index) => {
    if (typeof rowKey === 'function') return `${String(rowKey(row))}__${index}`;
    if (rowKey && row[rowKey] != null) return `${String(row[rowKey])}__${index}`;
    return String(row.id ?? row.acc_id ?? row[columns?.[0]?.key] ?? index) + `__${index}`;
  };
  const [sorting, setSorting] = useState([]);

  const filteredData = useMemo(() => {
    const list = data || [];
    if (onSearchSubmit) return list;
    const q = (searchValue != null ? String(searchValue) : '').trim().toLowerCase();
    if (!q) return list;
    const keys = (columns || []).map((c) => c.key).filter(Boolean);
    return list.filter((row) =>
      keys.some((key) => {
        const v = row[key];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, searchValue, columns, onSearchSubmit]);

  const from = total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const to = total > 0 ? Math.min(currentPage * itemsPerPage, total) : 0;
  const isEmpty = !columns?.length && !filteredData?.length;
  const hasData = columns?.length && filteredData?.length;

  // tableColumns intentionally excludes `editValues` from deps — the cell uses
  // EditableCell's local state so we don't need to rebuild columns on every keystroke.
  // Resolve a header label by trying i18n first (`tableHeaders.<key>`), then
  // falling back to the backend-supplied label. Lets the backend keep returning
  // English column names while the UI shows them in the active language.
  const resolveHeader = (col) => {
    const key = `tableHeaders.${col.key}`;
    const translated = t(key, { defaultValue: '' });
    return translated || col.label;
  };

  const tableColumns = useMemo(() => {
    const cols = (columns || []).map((col) => ({
      accessorKey: col.key,
      header: resolveHeader(col),
      cell: ({ row }) => {
        if (editableSet.has(col.key)) {
          const rid = getRowKey(row.original, row.index);
          const maxField = editableMaxField?.[col.key];
          const max = maxField ? row.original[maxField] : undefined;
          return (
            <EditableCell
              initialValue={row.original[col.key]}
              max={max}
              onChange={(v) => onEditChange?.(rid, col.key, v)}
            />
          );
        }
        return formatCell(col, row.original);
      },
      meta: { align: getColumnAlign(col.key) },
      enableSorting: true,
    }));
    if (renderActions) {
      cols.push({
        id: 'actions',
        header: t('dataTable.actions', { defaultValue: 'Actions' }),
        cell: ({ row }) => renderActions(row.original),
        meta: { align: 'center' },
        enableSorting: false,
      });
    }
    return cols;
  }, [columns, renderActions, editableSet, editableMaxField, onEditChange, rowKey, t]);

  const table = useReactTable({
    data: isLoading ? [] : filteredData,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row, index) => getRowKey(row, index),
  });

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[0_4px_20px_-8px_rgba(11,60,93,0.15)] border border-slate-200/70 dark:border-slate-700/80 bg-white dark:bg-slate-900/90">
      {/* ── Controls bar: selects, dropdowns, action buttons ── */}
      {headerActions && (
        <div className="relative z-10 flex flex-wrap items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#F1F5F9] to-[#EEF2F7] dark:from-slate-800/70 dark:to-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700">
          {headerActions}
        </div>
      )}

      {/* ── Table toolbar: page size + search ── */}
      {showDataPanel && (
        <div className="relative z-10 flex flex-wrap items-center gap-3 border-b border-slate-200/70 dark:border-slate-600/60 px-4 py-2.5 bg-white dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onPageSizeChange && (
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={itemsPerPage}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="py-2 px-3 pe-8 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#0B3C5D]/25 focus:border-[#0B3C5D] transition-all shadow-sm font-medium cursor-pointer"
                  aria-label={t('dataTable.ariaEntries', { defaultValue: 'Entries per page' })}
                >
                  {[5, 10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>{fmtNum(n)}</option>
                  ))}
                </select>
                <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{t('dataTable.entriesPerPage', { defaultValue: 'entries per page' })}</span>
              </div>
            )}
            <div className="flex items-center shrink-0 min-w-0">
              <label htmlFor="table-search" className="sr-only">{t('dataTable.ariaEntries', { defaultValue: 'Search' })}</label>
              <div className="relative flex items-center w-60 sm:w-72 max-w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-[#0B3C5D]/25 focus-within:border-[#0B3C5D] transition-all">
                <Search className="w-4 h-4 text-slate-400 ms-3 shrink-0 pointer-events-none" aria-hidden />
                <input
                  id="table-search"
                  type="search"
                  value={searchValue ?? ''}
                  onChange={(e) => onSearchChange?.(e)}
                  placeholder={resolvedSearchPlaceholder}
                  autoComplete="off"
                  className="min-w-0 flex-1 py-2 pe-2 ps-2.5 text-sm border-0 bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none rounded-lg"
                  aria-label={t('dataTable.search', { defaultValue: 'Search' })}
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.({ target: { value: '' } })}
                    className="p-1.5 me-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors shrink-0"
                    aria-label={t('dataTable.ariaClearSearch', { defaultValue: 'Clear search' })}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="relative z-0 min-h-0">
        {!showDataPanel && (
          <EmptyState
            icon={emptyIconClickToLoad ?? emptyIcon}
            title={emptyTitleClickToLoad ?? emptyTitle}
            description={emptyDescClickToLoad ?? emptyDescription}
          />
        )}
        {showDataPanel && error && <ErrorAlert message={error} hint={errorHint} />}
        {showDataPanel && !error && isEmpty && !isLoading && (
          <EmptyState
            icon={emptyIcon}
            title={(searchValue && String(searchValue).trim() !== '') ? resolvedNoResultTitle : emptyTitle}
            description={(searchValue && String(searchValue).trim() !== '') ? resolvedNoResultDesc : emptyDescription}
          />
        )}
        {showDataPanel && !error && (hasData || isLoading) && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`page-${currentPage}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative"
            >
              <table className="w-full text-sm border-collapse table-fixed font-[ui-sans-serif,system-ui,'Segoe_UI','Inter',sans-serif]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header, hi) => {
                        const align = header.column.columnDef.meta?.align || 'left';
                        const isFirst = hi === 0;
                        const sortDir = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            className={`
                              px-3 py-3 font-semibold text-[0.8rem] uppercase tracking-[0.08em]
                              text-white/95 align-middle break-words
                              bg-gradient-to-b from-[#0B3C5D] to-[#072b44]
                              border-e border-white/10 last:border-e-0
                              ${align === 'center' ? 'text-center' : 'text-start'}
                              ${isFirst ? 'sticky start-0 z-[2] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.25)]' : ''}
                              ${header.column.id === 'actions' ? 'w-28' : ''}
                              first:rounded-ss-xl last:rounded-se-xl
                            `}
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                className={
                                  header.column.getCanSort()
                                    ? 'flex items-center gap-1.5 cursor-pointer select-none group/sort'
                                    : ''
                                }
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getCanSort() && (
                                  <span className="text-white/60 group-hover/sort:text-white transition-colors">
                                    {sortDir === 'asc' ? (
                                      <ChevronUp size={14} />
                                    ) : sortDir === 'desc' ? (
                                      <ChevronDown size={14} />
                                    ) : (
                                      <ChevronsUpDown size={12} className="opacity-50" />
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {isLoading ? (
                    [...Array(Math.min(5, itemsPerPage))].map((_, i) => (
                      <tr key={i} className="border-b border-slate-200/70 dark:border-slate-700/60">
                        {(columns || []).map((_, colIndex) => (
                          <td key={colIndex} className="px-4 py-3.5 align-middle">
                            <span
                              className="block h-3 rounded-full bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600/80 animate-pulse"
                              style={{ width: colIndex === 0 ? '40%' : colIndex % 2 === 0 ? '55%' : '70%' }}
                            />
                          </td>
                        ))}
                        {renderActions && (
                          <td className="px-4 py-3.5 text-center">
                            <span className="block h-6 w-20 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 animate-pulse mx-auto" />
                          </td>
                        )}
                      </tr>
                    ))
                  ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={(columns?.length || 0) + (renderActions ? 1 : 0)}
                        className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 text-sm"
                      >
                        {searchValue
                          ? t('dataTable.emptySearch', { defaultValue: 'No matches.' })
                          : t('dataTable.emptyData', { defaultValue: 'No data.' })}
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row, rowIndex) => {
                      const even = rowIndex % 2 === 0;
                      return (
                        <tr
                          key={row.id}
                          className={`
                            group relative border-b border-slate-200/70 dark:border-slate-700/60
                            transition-colors duration-150
                            ${even
                              ? 'bg-white dark:bg-slate-900/40 hover:bg-[#0B3C5D]/[0.03] dark:hover:bg-slate-800/60'
                              : 'bg-slate-50/60 dark:bg-slate-800/30 hover:bg-[#0B3C5D]/[0.05] dark:hover:bg-slate-700/40'
                            }
                          `}
                        >
                          {row.getVisibleCells().map((cell, ci) => {
                            const align = cell.column.columnDef.meta?.align || 'left';
                            const isFirst = ci === 0;
                            return (
                              <td
                                key={cell.id}
                                className={`
                                  px-3 py-2 align-middle text-[0.95rem] break-words
                                  border-e border-slate-100 dark:border-slate-700/60 last:border-e-0
                                  ${align === 'center' ? 'text-center' : 'text-start'}
                                  ${isFirst ? 'sticky start-0 z-[1] font-semibold text-[#0B3C5D] dark:text-teal-300 tabular-nums' : 'font-normal'}
                                  ${isFirst && even ? 'bg-white dark:bg-slate-900/40 group-hover:bg-[#0B3C5D]/[0.03] dark:group-hover:bg-slate-800/60' : ''}
                                  ${isFirst && !even ? 'bg-slate-50/60 dark:bg-slate-800/30 group-hover:bg-[#0B3C5D]/[0.05] dark:group-hover:bg-slate-700/40' : ''}
                                  ${isFirst ? 'shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]' : ''}
                                  ${cell.column.id === 'actions' ? 'w-28' : ''}
                                `}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Footer actions (e.g. GENERATE) ── */}
      {showDataPanel && footerActions && (
        <div className="flex justify-center gap-2 px-4 py-3 border-t border-slate-200/70 dark:border-slate-600/60 bg-white dark:bg-slate-900/40">
          {footerActions}
        </div>
      )}

      {/* ── Pagination ── */}
      {showDataPanel && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/70 dark:border-slate-600/60 bg-slate-50/60 dark:bg-slate-800/40 text-sm text-slate-600 dark:text-slate-400">
          <span>
            {t('dataTable.showing', { defaultValue: 'Showing' })}{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtNum(total === 0 ? 0 : from)}</span>
            {' – '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtNum(to)}</span>
            {' '}{t('dataTable.of', { defaultValue: 'of' })}{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtNum(total)}</span>
            {' '}{t('dataTable.entries', { defaultValue: 'entries' })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPreviousPage?.()}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 hover:border-[#0B3C5D]/30 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-all shadow-sm"
            >
              <PrevIcon size={16} />
            </button>
            {(() => {
              const maxButtons = 5;
              const start = Math.max(1, Math.min(currentPage - Math.floor(maxButtons / 2), totalPages - maxButtons + 1));
              const pages = Array.from({ length: Math.min(maxButtons, totalPages) }, (_, i) => start + i).filter((p) => p >= 1 && p <= totalPages);
              return pages.map((page) => {
                const isCurrent = page === currentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => onPageClick?.(page)}
                    className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-semibold transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-b from-[#0B3C5D] to-[#072b44] text-white shadow-md shadow-[#0B3C5D]/25'
                        : 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#0B3C5D]/30 hover:text-[#0B3C5D] dark:hover:text-teal-300'
                    }`}
                  >
                    {fmtNum(page)}
                  </button>
                );
              });
            })()}
            <button
              type="button"
              onClick={() => onNextPage?.()}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 hover:border-[#0B3C5D]/30 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-all shadow-sm"
            >
              <NextIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default memo(DataTableCard);

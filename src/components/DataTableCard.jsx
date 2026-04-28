/**
 * DataTableCard – professional data table with:
 *   • navy gradient header
 *   • smart cell formatting (dates, status badges, currency)
 *   • generous row spacing + subtle zebra striping
 *   • sticky first column, sortable headers
 *   • polished pagination
 */
import { useState, useMemo, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, X, ChevronsUpDown } from 'lucide-react';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import ErrorAlert from './ui/ErrorAlert';

/* ─── Cell classifiers ─── */
const CURRENCY_KEYS = ['balance', 'amount', 'salary', 'fee', 'price'];
const STATUS_KEYS = ['state', 'status', 'is_active', 'active', 'lock_user', 'locked'];
const DATE_KEY_RE = /date|_at$|reg_date|created|updated|dob|birth/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T|\s)/;

const isCurrencyCol = (key) => CURRENCY_KEYS.some((k) => key === k || key?.toLowerCase().includes(k));
const isStatusCol = (key) => STATUS_KEYS.some((k) => key?.toLowerCase() === k);
const isDateCol = (key) => DATE_KEY_RE.test(String(key || ''));

const formatDate = (value) => {
  if (value == null || value === '') return '—';
  const s = String(value);
  if (!ISO_DATE_RE.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
};

const StatusBadge = ({ value }) => {
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
  const label = String(value ?? '—');
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

const formatCell = (col, row) => {
  const value = row[col.key];
  if (isCurrencyCol(col.key)) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    const display = !isNaN(num) ? num.toLocaleString() : '0';
    return <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">${display}</span>;
  }
  if (isStatusCol(col.key)) return <StatusBadge value={value} />;
  if (isDateCol(col.key)) return <span className="tabular-nums text-slate-600 dark:text-slate-300">{formatDate(value)}</span>;
  if (value == null || value === '') return <span className="text-slate-300 dark:text-slate-600">—</span>;
  return <span className="text-slate-700 dark:text-slate-200">{String(value)}</span>;
};

function DataTableCard({
  showDataPanel = true,
  searchPlaceholder = 'Search...',
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
  emptyTitleNoResult = 'No result',
  emptyDescNoResult = 'Xog lama helin. Raadinta si toos ah ayaa lagu dhaqangalayaa.',
  renderActions,
  total,
  currentPage,
  totalPages,
  itemsPerPage = 10,
  onPreviousPage,
  onNextPage,
  onPageClick,
  onPageSizeChange,
}) {
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

  const tableColumns = useMemo(() => {
    const cols = (columns || []).map((col) => ({
      accessorKey: col.key,
      header: col.label,
      cell: ({ row }) => formatCell(col, row.original),
      meta: { align: getColumnAlign(col.key) },
      enableSorting: true,
    }));
    if (renderActions) {
      cols.push({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => renderActions(row.original),
        meta: { align: 'center' },
        enableSorting: false,
      });
    }
    return cols;
  }, [columns, renderActions]);

  const table = useReactTable({
    data: isLoading ? [] : filteredData,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row, index) => String(row.acc_id ?? row.id ?? row[columns?.[0]?.key] ?? index),
  });

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[0_4px_20px_-8px_rgba(11,60,93,0.15)] border border-slate-200/70 dark:border-slate-700/80 bg-white dark:bg-slate-900/90">
      {/* ── Controls bar: selects, dropdowns, action buttons ── */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#F1F5F9] to-[#EEF2F7] dark:from-slate-800/70 dark:to-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700">
        {headerActions}
      </div>

      {/* ── Table toolbar: page size + search ── */}
      {showDataPanel && (
        <div className="relative z-10 flex flex-wrap items-center gap-3 border-b border-slate-200/70 dark:border-slate-600/60 px-4 py-2.5 bg-white dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onPageSizeChange && (
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={itemsPerPage}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="py-2 px-3 pr-8 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#0B3C5D]/25 focus:border-[#0B3C5D] transition-all shadow-sm font-medium cursor-pointer"
                  aria-label="Entries per page"
                >
                  {[5, 10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">entries per page</span>
              </div>
            )}
            <div className="flex items-center shrink-0 min-w-0">
              <label htmlFor="table-search" className="sr-only">Search</label>
              <div className="relative flex items-center w-60 sm:w-72 max-w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-[#0B3C5D]/25 focus-within:border-[#0B3C5D] transition-all">
                <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0 pointer-events-none" aria-hidden />
                <input
                  id="table-search"
                  type="search"
                  value={searchValue ?? ''}
                  onChange={(e) => onSearchChange?.(e)}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  className="min-w-0 flex-1 py-2 pr-2 pl-2.5 text-sm border-0 bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none rounded-lg"
                  aria-label="Search"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.({ target: { value: '' } })}
                    className="p-1.5 mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors shrink-0"
                    aria-label="Clear search"
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
            title={(searchValue && String(searchValue).trim() !== '') ? emptyTitleNoResult : emptyTitle}
            description={(searchValue && String(searchValue).trim() !== '') ? emptyDescNoResult : emptyDescription}
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
                              px-3 py-3 font-semibold text-[0.72rem] uppercase tracking-[0.08em]
                              text-white/95 align-middle break-words
                              bg-gradient-to-b from-[#0B3C5D] to-[#072b44]
                              border-r border-white/10 last:border-r-0
                              ${align === 'center' ? 'text-center' : 'text-left'}
                              ${isFirst ? 'sticky left-0 z-[2] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.25)]' : ''}
                              ${header.column.id === 'actions' ? 'w-28' : ''}
                              first:rounded-tl-xl last:rounded-tr-xl
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
                        {searchValue ? 'Natiijo ma jirto.' : 'Xog ma jirto.'}
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
                                  px-3 py-1.5 align-middle text-[0.875rem] break-words
                                  border-r border-slate-100 dark:border-slate-700/60 last:border-r-0
                                  ${align === 'center' ? 'text-center' : 'text-left'}
                                  ${isFirst ? 'sticky left-0 z-[1] font-semibold text-[#0B3C5D] dark:text-teal-300 tabular-nums' : 'font-normal'}
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

      {/* ── Pagination ── */}
      {showDataPanel && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/70 dark:border-slate-600/60 bg-slate-50/60 dark:bg-slate-800/40 text-sm text-slate-600 dark:text-slate-400">
          <span>
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{total === 0 ? '0' : from}</span>
            {' – '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{to}</span>
            {' of '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span>
            {' entries'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPreviousPage?.()}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 hover:border-[#0B3C5D]/30 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-all shadow-sm"
            >
              <ChevronLeft size={16} />
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
                    {page}
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
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default memo(DataTableCard);

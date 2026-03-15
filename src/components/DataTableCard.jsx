/**
 * DataTableCard – TanStack Table: sorting, search line, compact pagination. Memoized.
 */
import { useState, useMemo, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import ErrorAlert from './ui/ErrorAlert';

const CURRENCY_KEYS = ['balance'];
const isNumericColumn = (key) =>
  CURRENCY_KEYS.some((k) => key === k || key?.toLowerCase().includes(k)) ||
  /number|amount|balance|count|total/i.test(String(key));

/** Sawirka: dhammaan columns left; Action kaliya center – header iyo xogta isku toosan. */
function getColumnAlign(key) {
  if (key === 'actions') return 'center';
  return 'left';
}

const formatCell = (col, row) => {
  const value = row[col.key];
  const isCurrency = CURRENCY_KEYS.some((k) => col.key === k || col.key?.toLowerCase().includes(k));
  if (isCurrency) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    const display = !isNaN(num) ? num.toLocaleString() : '0';
    return (
      <span className="font-medium text-green-600 dark:text-green-400">
        ${display}
      </span>
    );
  }
  return value != null && value !== '' ? String(value) : '—';
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
  hasActions = false,
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

  // Server-side: onSearchSubmit → API returns paginated+filtered data; show data as-is. Else client-side filter.
  const filteredData = useMemo(() => {
    const list = data || [];
    if (onSearchSubmit) return list; // API pagination + search; no client filter
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
    getRowId: (row, index) =>
      String(row.acc_id ?? row.id ?? row[columns?.[0]?.key] ?? index),
  });

  const headerGradient = 'bg-[#0f3d5e] text-white';
  const stickyTh = `sticky left-0 z-[2] ${headerGradient} shadow-[4px_0_12px_-2px_rgba(0,0,0,0.2)]`;
  const stickyTd = (even) =>
    `sticky left-0 z-[1] ${even ? 'bg-white dark:bg-slate-900/50 group-hover:bg-slate-50' : 'bg-slate-50/70 dark:bg-slate-800/40 group-hover:bg-slate-100/80'} shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] border-r border-slate-100 dark:border-slate-700/50`;
  const thClass = (align, isFirst) =>
    `px-2 py-1.5 font-semibold whitespace-nowrap align-middle text-xs uppercase tracking-widest text-white/98 ${
      align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
    } ${isFirst ? stickyTh : headerGradient}`;
  const tdClass = (align, isFirst, rowEven) =>
    `px-2 py-1.5 text-slate-700 dark:text-slate-200 align-middle text-sm transition-all duration-200 ${isFirst ? stickyTd(rowEven) : ''} ${
      align === 'center' ? 'text-center' : 'text-left'
    }`;

  return (
    <Card className="overflow-hidden rounded-2xl shadow-md shadow-slate-200/60 dark:shadow-none border border-slate-200/70 dark:border-slate-700/80 bg-white dark:bg-slate-900/90">
      {/* Top bar: header actions only when !showDataPanel; full toolbar when showDataPanel */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-600/60 px-3 py-2 bg-white dark:bg-slate-900/95 isolate">
        {showDataPanel && (
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {onPageSizeChange && (
              <div className="relative flex items-center gap-2 shrink-0">
                <select
                  value={itemsPerPage}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="py-2 px-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] transition-shadow shadow-sm appearance-none min-w-0"
                  aria-label="Entries per page"
                >
                  {[5, 10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">entries per page</span>
              </div>
            )}
            <div className="relative z-[2] flex items-center gap-2 shrink-0 min-w-0">
              <label htmlFor="table-search" className="sr-only">Search</label>
              <div className="relative flex items-center w-56 sm:w-64 max-w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-[#1e3a5f]/30 focus-within:border-[#1e3a5f] transition-all overflow-hidden">
                <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0 pointer-events-none" aria-hidden />
                <input
                  id="table-search"
                  type="search"
                  value={searchValue ?? ''}
                  onChange={(e) => onSearchChange?.(e)}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  className="min-w-0 flex-1 py-2 pr-2 pl-1 text-sm border-0 bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none rounded-xl"
                  aria-label="Search"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.({ target: { value: '' } })}
                    className="p-2 mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 flex-shrink-0 ml-auto">
          {headerActions}
        </div>
      </div>

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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-x-auto -mx-px rounded-b-lg relative"
            >
            <table className="w-full text-sm min-w-[600px] border-collapse table-fixed">
              <colgroup>
                {(columns || []).map((col, i) => (
                  <col key={col.key} style={{ minWidth: i === 0 ? '3rem' : undefined }} />
                ))}
                {renderActions && <col key="actions" style={{ width: '7rem' }} />}
              </colgroup>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b-2 border-[#0f2a42]/90 shadow-sm">
                    {headerGroup.headers.map((header, hi) => (
                      <th
                        key={header.id}
                        className={`${thClass(header.column.columnDef.meta?.align || 'left', hi === 0)} border-r border-white/10 last:border-r-0 ${
                          header.column.id === 'actions' ? ' w-28' : ''
                        }`}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'flex items-center gap-1.5 cursor-pointer select-none hover:text-white transition-colors'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <span className="text-white/90 opacity-90">
                                {{
                                  asc: <ChevronUp size={14} />,
                                  desc: <ChevronDown size={14} />,
                                }[header.column.getIsSorted()] ?? null}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white dark:bg-slate-900/40">
                {isLoading ? (
                  [...Array(Math.min(5, itemsPerPage))].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50">
                      {(columns || []).map((_, colIndex) => (
                        <td
                          key={colIndex}
                          className={`px-2 py-1.5 border-r border-slate-100 dark:border-slate-700/50 align-middle text-left text-sm ${colIndex === 0 ? 'sticky left-0 z-[1] bg-white dark:bg-slate-800/50 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)]' : ''}`}
                        >
                          <span
                            className="block h-4 rounded-lg bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600/80 animate-pulse"
                            style={{ width: colIndex === 0 ? '60%' : colIndex % 2 === 0 ? '45%' : '70%' }}
                          />
                        </td>
                      ))}
                      {renderActions && (
                        <td className="px-2 py-1.5 text-center border-r border-slate-100 dark:border-slate-700/50">
                          <span className="block h-4 w-16 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 animate-pulse ml-auto" />
                        </td>
                      )}
                    </tr>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(columns?.length || 0) + (renderActions ? 1 : 0)}
                      className="px-2 py-6 text-center text-slate-500 dark:text-slate-400 text-sm"
                    >
                      {searchValue ? 'Natiijo ma jirto.' : 'Xog ma jirto.'}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      className={`group border-b border-slate-100 dark:border-slate-700/50 transition-all duration-200 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] ${
                        rowIndex % 2 === 0
                          ? 'bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          : 'bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      {row.getVisibleCells().map((cell, ci) => (
                        <td
                          key={cell.id}
                          className={`${tdClass(cell.column.columnDef.meta?.align || 'left', ci === 0, rowIndex % 2 === 0)} border-r border-slate-100 dark:border-slate-700/50 ${
                            cell.column.id === 'actions' ? ' w-28' : ''
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Pagination – only when data panel is shown */}
      {showDataPanel && (
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 border-t border-slate-200/80 dark:border-slate-600/60 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/40 text-sm text-slate-600 dark:text-slate-400 rounded-b-xl">
        <span className="font-medium">
          Showing {total === 0 ? '0' : from} to {to} of {total} entries
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPreviousPage?.()}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white text-slate-700 dark:text-slate-300 transition-all shadow-sm"
          >
            <ChevronLeft size={18} />
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
                  className={`min-w-[2.25rem] py-2 px-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                    isCurrent
                      ? 'bg-gradient-to-b from-[#1e3a5f] to-[#162d4a] border border-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20'
                      : 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700'
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
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white text-slate-700 dark:text-slate-300 transition-all shadow-sm"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      )}
    </Card>
  );
}

export default memo(DataTableCard);

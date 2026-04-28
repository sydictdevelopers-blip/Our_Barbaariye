import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, RefreshCw, Mail, Search } from 'lucide-react';
import Card from '../../../components/ui/Card';
import { fetchDataPaginated } from '../../../services/api';
import { swalError, swalSuccess } from '../../../utils/swal';
import { getSessionUBrId } from '../../../config/crudConfig';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** Server text patterns oo macnaheeda yahay error/warning halkii guul. */
const FAILURE_PATTERN = /lock|locked|not\s+registered|not\s+found|denied|forbidden|userlock|notreg/i;

/**
 * Inline panel oo lagu cusboonaysiiyo EMIS / ID-card-yada ardayda fasalka.
 *
 * Bulk update: rows oo dhan oo wax laga beddelay → hal "UPDATE DATA"
 *   button hoosta ayaa hal mar dhammaantood loo dirta backend-ka via
 *   `update_emis_student_id_sp` (parallel allSettled).
 */
export default function StudentEmisPanel({ cl_id, b_id, a_y_id, br_id, onClose }) {
  const { t } = useTranslation();
  const sessionUBrId = Number(getSessionUBrId()) || 0;

  const [rows, setRows] = useState([]);
  const [edited, setEdited] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [search, setSearch] = useState('');

  const filtersReady = !!(cl_id && a_y_id && br_id);

  const loadRows = useMemo(
    () => async () => {
      if (!filtersReady) return;
      setLoading(true);
      try {
        const res = await fetchDataPaginated({
          queryName: 'EmisIdCardList',
          page: 1,
          limit: 1000,
          cl_id,
          br_id,
          a_y_id,
        });
        const list = (res?.data ?? []).filter((r) => r.id != null);
        setRows(list);
        setEdited({});
      } catch (err) {
        swalError(t('swal.titles.error'), err.message);
      } finally {
        setLoading(false);
      }
    },
    [cl_id, br_id, a_y_id, filtersReady, t]
  );

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const setField = (id, value) => {
    setEdited((prev) => ({ ...prev, [id]: value }));
  };

  const valueOf = (row) => {
    const e = edited[row.id];
    if (e !== undefined) return e ?? '';
    return row.id_card ?? '';
  };

  const dirtyRows = useMemo(() => {
    return rows.filter((r) => {
      const e = edited[r.id];
      if (e === undefined) return false;
      return (e ?? '') !== (r.id_card ?? '');
    });
  }, [rows, edited]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (
      String(r.id).includes(q) ||
      String(r.student_name || '').toLowerCase().includes(q) ||
      String(r.id_card || '').toLowerCase().includes(q)
    ));
  }, [rows, search]);

  const handleUpdateAll = async () => {
    if (!sessionUBrId) {
      swalError(t('swal.titles.error'), t('emisPanel.errNoSession'));
      return;
    }
    if (dirtyRows.length === 0) return;

    setSavingAll(true);
    let okCount = 0;
    const failures = [];
    const successMsgs = [];
    try {
      const results = await Promise.allSettled(
        dirtyRows.map(async (row) => {
          const body = {
            fn: 'update_emis_student_id_sp',
            p_std_id: Number(row.id),
            p_id_card: String(valueOf(row)).trim(),
            p_u_br_id: sessionUBrId,
            oper: 'update',
          };
          const resp = await fetch(`${API_BASE}/all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const text = (await resp.text()).trim();
          if (!resp.ok) throw new Error(text || 'Failed');
          if (FAILURE_PATTERN.test(text)) {
            const e = new Error(text);
            e.isServerAlert = true;
            throw e;
          }
          return { row, body, text };
        })
      );

      const updatedById = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          okCount += 1;
          const { row, body, text } = r.value;
          updatedById[row.id] = body.p_id_card;
          if (text) successMsgs.push(text);
        } else {
          failures.push({ id: dirtyRows[i].id, message: r.reason?.message || 'Failed' });
        }
      });

      setRows((prev) => prev.map((r) => (
        Object.prototype.hasOwnProperty.call(updatedById, r.id)
          ? { ...r, id_card: updatedById[r.id] }
          : r
      )));
      setEdited((prev) => {
        const next = { ...prev };
        Object.keys(updatedById).forEach((id) => { delete next[id]; });
        return next;
      });

      if (failures.length === 0) {
        const uniq = Array.from(new Set(successMsgs));
        const text = uniq.length === 1 ? uniq[0] : (uniq[0] || '');
        await swalSuccess('', text);
      } else if (okCount === 0) {
        const uniqFails = Array.from(new Set(failures.map((f) => f.message)));
        const msg = uniqFails.length === 1
          ? uniqFails[0]
          : failures.map((f) => `#${f.id}: ${f.message}`).join('\n');
        swalError('', msg);
      } else {
        const msg = `${t('emisPanel.bulkPartial', { ok: okCount, fail: failures.length })}\n${failures.map((f) => `#${f.id}: ${f.message}`).join('\n')}`;
        swalError('', msg);
      }
    } finally {
      setSavingAll(false);
    }
  };

  const dirtyRowSet = useMemo(() => new Set(dirtyRows.map((r) => r.id)), [dirtyRows]);
  const inputCls =
    'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/30 focus:border-[#0f3d5e] font-mono text-sm';

  return (
    <Card className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-slate-200/80 dark:ring-slate-700/70 bg-white dark:bg-slate-900/90">
      {/* Header */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-[#0f3d5e] via-[#15507a] to-[#1a6296] text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight">
                {t('emisPanel.title')}
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                {t('emisPanel.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadRows}
              disabled={loading || savingAll}
              className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t('emisPanel.refresh')}
              title={t('emisPanel.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
                aria-label={t('emisPanel.close')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[11px] font-medium">
            <span className="opacity-80">{t('emisPanel.statTotal')}</span>
            <span className="font-bold">{rows.length}</span>
          </span>
          {dirtyRows.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/25 ring-1 ring-amber-200/40 text-[11px] font-semibold animate-pulse">
              <span>{t('emisPanel.statPending')}</span>
              <span className="font-bold">{dirtyRows.length}</span>
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="emis-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('emisPanel.searchPlaceholder')}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a6296]/30 focus:border-[#1a6296]/50 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
              aria-label="clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="overflow-auto max-h-[60vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1a6296]" />
            <span className="text-sm">{t('emisPanel.loading')}</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            {rows.length === 0 ? t('emisPanel.noData') : t('emisPanel.noMatch')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0f3d5e] text-white sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 w-20 font-semibold">{t('emisPanel.cols.id')}</th>
                <th className="text-left px-4 py-3 w-80 font-semibold">{t('emisPanel.cols.idCard')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('emisPanel.cols.student')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const inputId = `emis-idcard-${r.id}`;
                const isDirty = dirtyRowSet.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-slate-200 dark:border-slate-700 transition ${
                      isDirty
                        ? 'bg-amber-50/70 dark:bg-amber-900/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      {r.id}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        id={inputId}
                        type="text"
                        className={inputCls}
                        value={valueOf(r)}
                        onChange={(e) => setField(r.id, e.target.value)}
                        placeholder={t('emisPanel.cols.idCard')}
                      />
                    </td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-100 font-medium">
                      {r.student_name}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-slate-200/70 dark:border-slate-600/60 bg-slate-50/60 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={handleUpdateAll}
            disabled={savingAll || dirtyRows.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#0f3d5e] to-[#1a6296] text-white text-sm font-bold uppercase tracking-wide shadow-md shadow-[#0f3d5e]/20 hover:shadow-lg hover:from-[#0b3052] hover:to-[#155680] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {savingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('emisPanel.saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t('emisPanel.updateData')}
                {dirtyRows.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-md bg-white/20 text-xs font-extrabold">
                    {dirtyRows.length}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, RefreshCw } from 'lucide-react';
import Card from '../../../components/ui/Card';
import { fetchDataPaginated } from '../../../services/api';
import { swalError, swalSuccess } from '../../../utils/swal';
import { getSessionUBrId } from '../../../config/crudConfig';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** Server text patterns oo macnaheeda yahay error/warning halkii guul. */
const FAILURE_PATTERN = /lock|locked|not\s+registered|not\s+found|denied|forbidden|userlock|notreg/i;

/**
 * Inline panel oo lagu cusboonaysiiyo Name/Phone One/Phone Two ee
 * dhammaan responsibles-ka fasalka la cayimay. MA isticmaalo Modal —
 * waxaa lagu daabacayaa toos page-ka StudentsTab.
 *
 * Bulk update: rows oo dhan oo wax laga beddelay → hal "UPDATE DATA"
 *   button hoosta ayaa hal mar dhammaantood la dirta backend-ka.
 */
export default function StudentResponsiblesPanel({ cl_id, b_id, a_y_id, br_id, onClose }) {
  const { t } = useTranslation();
  // session u_br_id — kaliya UPDATE SP-ga loo dirayaa (audit trail). Fetch
  // function-ku weli wuxuu eegayaa br_id (branch-ka).
  const sessionUBrId = Number(getSessionUBrId()) || 0;

  const [rows, setRows] = useState([]);
  const [edited, setEdited] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const filtersReady = !!(cl_id && a_y_id && br_id);

  const loadRows = useMemo(
    () => async () => {
      if (!filtersReady) return;
      setLoading(true);
      try {
        const res = await fetchDataPaginated({
          queryName: 'ResponsiblesOneClass',
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

  const setField = (id, key, value) => {
    setEdited((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }));
  };

  const valueOf = (row, key) => {
    const e = edited[row.id];
    if (e && Object.prototype.hasOwnProperty.call(e, key)) return e[key] ?? '';
    return row[key] ?? '';
  };

  const dirtyRows = useMemo(() => {
    return rows.filter((r) => {
      const e = edited[r.id];
      if (!e) return false;
      return ['name', 'phone_one', 'phone_two'].some(
        (k) => Object.prototype.hasOwnProperty.call(e, k) && (e[k] ?? '') !== (r[k] ?? '')
      );
    });
  }, [rows, edited]);

  const handleUpdateAll = async () => {
    if (!sessionUBrId) {
      swalError(t('swal.titles.error'), t('responsiblesPanel.errNoSession'));
      return;
    }
    if (dirtyRows.length === 0) return;

    setSavingAll(true);
    let okCount = 0;
    const failures = [];   // { id, message } — fariimaha server-ka oo lagu calaamadeeyay error
    const successMsgs = []; // fariimaha server-ka ee guulaystay (in la helo translateMessage)
    try {
      const results = await Promise.allSettled(
        dirtyRows.map(async (row) => {
          const body = {
            fn: 'update_all_responsibles_one_class_sp',
            p_res_id: Number(row.id),
            p_full_name: String(valueOf(row, 'name')).trim(),
            p_phone_one: String(valueOf(row, 'phone_one')).trim(),
            p_phone_two: String(valueOf(row, 'phone_two')).trim(),
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
          // SP wuxuu soo celin karaa fariin "alert" ah xitaa marka HTTP=200.
          // Hubi haddii fariintu ay tahay "user locked" ama "not registered".
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
          updatedById[row.id] = {
            name: body.p_full_name,
            phone_one: body.p_phone_one,
            phone_two: body.p_phone_two,
          };
          if (text) successMsgs.push(text);
        } else {
          failures.push({ id: dirtyRows[i].id, message: r.reason?.message || 'Failed' });
        }
      });

      // Sync rows + clear edited state kuwa guulaystay
      setRows((prev) => prev.map((r) => (updatedById[r.id] ? { ...r, ...updatedById[r.id] } : r)));
      setEdited((prev) => {
        const next = { ...prev };
        Object.keys(updatedById).forEach((id) => { delete next[id]; });
        return next;
      });

      // Tus fariin server-ka kasoo baxday — sida modallada kale (StudentStateModal etc.)
      if (failures.length === 0) {
        // Hal text haddii uu yahay (kuwa kale isku dhig ah), tus toos. Haddii kala
        // duwan, tus first + count.
        const uniq = Array.from(new Set(successMsgs));
        const text = uniq.length === 1 ? uniq[0] : (uniq[0] || '');
        await swalSuccess('', text);
      } else if (okCount === 0) {
        // Dhammaantood error — tus fariimaha server-ka
        const uniqFails = Array.from(new Set(failures.map((f) => f.message)));
        const msg = uniqFails.length === 1
          ? uniqFails[0]
          : failures.map((f) => `#${f.id}: ${f.message}`).join('\n');
        swalError('', msg);
      } else {
        // Mixed — guul iyo error, tus summary
        const msg = `${t('responsiblesPanel.bulkPartial', { ok: okCount, fail: failures.length })}\n${failures.map((f) => `#${f.id}: ${f.message}`).join('\n')}`;
        swalError('', msg);
      }
    } finally {
      setSavingAll(false);
    }
  };

  const inputCls =
    'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]/30 focus:border-[#0f3d5e]';

  const dirtyRowSet = useMemo(() => new Set(dirtyRows.map((r) => r.id)), [dirtyRows]);

  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-700/80 bg-white dark:bg-slate-900/90">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-600/60 bg-gradient-to-r from-[#F1F5F9] to-[#EEF2F7] dark:from-slate-800/70 dark:to-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">
          {t('responsiblesPanel.title')}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label={t('responsiblesPanel.close')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="overflow-auto">
        {loading ? (
          <div className="text-center py-10 text-slate-500">{t('responsiblesPanel.loading')}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-slate-500">{t('responsiblesPanel.noData')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0f3d5e] text-white">
              <tr>
                <th className="text-left px-4 py-3 w-20 font-semibold">{t('responsiblesPanel.cols.id')}</th>
                <th className="text-left px-4 py-3 font-semibold">{t('responsiblesPanel.cols.name')}</th>
                <th className="text-left px-4 py-3 w-56 font-semibold">{t('responsiblesPanel.cols.phoneOne')}</th>
                <th className="text-left px-4 py-3 w-56 font-semibold">{t('responsiblesPanel.cols.phoneTwo')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const idName = `resp-name-${r.id}`;
                const idP1   = `resp-p1-${r.id}`;
                const idP2   = `resp-p2-${r.id}`;
                const isDirty = dirtyRowSet.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isDirty ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}`}
                  >
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{r.id}</td>
                    <td className="px-4 py-2">
                      <input
                        id={idName}
                        type="text"
                        className={inputCls}
                        value={valueOf(r, 'name')}
                        onChange={(e) => setField(r.id, 'name', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        id={idP1}
                        type="text"
                        className={inputCls}
                        value={valueOf(r, 'phone_one')}
                        onChange={(e) => setField(r.id, 'phone_one', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        id={idP2}
                        type="text"
                        className={inputCls}
                        value={valueOf(r, 'phone_two')}
                        onChange={(e) => setField(r.id, 'phone_two', e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-slate-200/70 dark:border-slate-600/60 bg-slate-50/60 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={handleUpdateAll}
            disabled={savingAll || dirtyRows.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0f3d5e] text-white text-sm font-semibold uppercase tracking-wide hover:bg-[#0b3052] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('responsiblesPanel.saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t('responsiblesPanel.updateData')}
                {dirtyRows.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/15 text-xs font-bold">
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

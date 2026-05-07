import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Delete-confirmation modal. Displays the row's id so the user can verify
 * they're deleting the right record before committing. Driven imperatively
 * via `confirmDelete()` in src/utils/confirmDelete.jsx.
 */
export default function DeleteConfirmModal({
  open,
  id,
  recordPreview,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConfirm?.(); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.();
      if (e.key === 'Enter' && !busy) handleConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  const hasId = id != null && id !== '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="del-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/30"
          onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel?.(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] to-[#0D9488]" />

            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start gap-3.5">
                <span className="shrink-0 w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center ring-1 ring-rose-100 dark:ring-rose-500/20">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" strokeWidth={2.2} />
                </span>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                    {t('deleteConfirm.title', 'Confirm Deletion')}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {t('deleteConfirm.subtitle', 'This action cannot be undone.')}
                  </p>
                </div>
              </div>

              {hasId && (
                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/30 px-4 py-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0B3C5D] dark:text-teal-300">
                    {t('deleteConfirm.recordId', 'Record ID')}
                  </span>
                  <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                    #{String(id)}
                  </span>
                </div>
              )}

              {recordPreview && (
                <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 leading-snug truncate">
                  {recordPreview}
                </div>
              )}

              <p className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                {t('deleteConfirm.question', 'ARE YOU SURE YOU WANT TO DELETE THIS RECORD?')}
              </p>
            </div>

            <div className="px-6 pb-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => onCancel?.()}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {t('deleteConfirm.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                autoFocus
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {t('deleteConfirm.confirm', 'Delete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

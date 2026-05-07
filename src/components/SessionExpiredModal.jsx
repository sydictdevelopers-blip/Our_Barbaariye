import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';

const AUTO_REDIRECT_MS = 10000;
const LOGIN_URL = '/frontend/login';

function goLogin() {
  try { window.sessionStorage?.removeItem('sessionExpiredNotice'); } catch (_) {}
  window.location.href = LOGIN_URL;
}

/**
 * Full-screen takeover surfaced when api.jsx's `_check401` dispatches
 * 'session-expired'. Auto-redirects after AUTO_REDIRECT_MS so the user
 * isn't trapped if they walk away, but the primary CTA goes immediately.
 */
export default function SessionExpiredModal() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(AUTO_REDIRECT_MS / 1000));

  // Render countdown in Arabic-Indic digits (٠-٩) when language is Arabic;
  // numberingSystem: 'arab' forces them regardless of locale variant.
  const isArabic = String(i18n.language || '').toLowerCase().startsWith('ar');
  const secondsLabel = new Intl.NumberFormat(
    isArabic ? 'ar' : i18n.language || 'en',
    isArabic ? { numberingSystem: 'arab' } : undefined,
  ).format(secondsLeft);

  useEffect(() => {
    const onExpired = () => {
      setSecondsLeft(Math.ceil(AUTO_REDIRECT_MS / 1000));
      setOpen(true);
    };
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, []);

  useEffect(() => {
    if (!open) return;
    const start = Date.now();
    const tick = setInterval(() => {
      const remainingMs = AUTO_REDIRECT_MS - (Date.now() - start);
      if (remainingMs <= 0) {
        clearInterval(tick);
        goLogin();
        return;
      }
      setSecondsLeft(Math.ceil(remainingMs / 1000));
    }, 250);
    return () => clearInterval(tick);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="session-expired-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 right-1/4 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl shadow-[0_30px_80px_-15px_rgba(0,0,0,0.5)] border border-white/40 overflow-hidden"
          >
            <div className="relative h-1.5 bg-slate-100 overflow-hidden">
              <motion.div
                key={`bar-${open}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_REDIRECT_MS / 1000, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-[#0f3d5e] via-sky-500 to-cyan-400"
              />
            </div>

            <div className="px-8 pt-10 pb-8 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
                className="relative mb-6"
              >
                <span className="absolute inset-0 rounded-full bg-[#0f3d5e]/10 blur-xl scale-125" />
                <span className="absolute inset-0 rounded-full bg-[#0f3d5e]/15 animate-ping" />
                <span className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#0f3d5e] to-[#0a2f4a] flex items-center justify-center shadow-lg shadow-[#0f3d5e]/40">
                  <Clock className="w-9 h-9 text-white" strokeWidth={2.2} />
                </span>
              </motion.div>

              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {t('login.sessionExpiredTitle')}
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-xs">
                {t('login.errors.sessionExpired')}
              </p>

              <p className="mt-5 text-xs font-medium text-slate-400 tabular-nums">
                {t('login.autoRedirectIn', { seconds: secondsLabel })}
              </p>

              <button
                type="button"
                onClick={goLogin}
                autoFocus
                className="group mt-6 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#0f3d5e] to-[#0a2f4a] hover:from-[#0c3250] hover:to-[#062535] text-white font-semibold text-sm transition-all shadow-lg shadow-[#0f3d5e]/40 hover:shadow-xl hover:shadow-[#0f3d5e]/50 hover:-translate-y-0.5 active:translate-y-0"
              >
                {t('login.loginAgain')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

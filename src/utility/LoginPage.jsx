import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Globe, Building2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setUser, switchBranch } from '../slices/uiSlice';
import { LANGUAGES } from '../i18n/i18n';
import { loginUser, fetchUserBranches } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Branch selection step
  const [step, setStep] = useState('login'); // 'login' | 'branch'
  const [pendingUser, setPendingUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState('');

  const LOGO_URL = 'https://sydimg.s3.eu-west-2.amazonaws.com/SYDICT/LOGO.jpeg';

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoFailed(false);
    img.onerror = () => setLogoFailed(true);
    img.src = LOGO_URL;
  }, []);

  const dispatchAndGo = async (u, chosenBrId) => {
    const initials = (u.username).slice(0, 2).toUpperCase();
    const finalBrId = chosenBrId ?? u.br_id;

    // Multi-branch users: re-issue JWT with the picked branch so backend
    // uses the chosen branch (not the default one returned by login_check).
    if (chosenBrId != null && chosenBrId !== u.br_id) {
      try {
        await dispatch(switchBranch(chosenBrId));
      } catch (e) {
        setError(e?.message || 'Branch switch failed');
        return;
      }
    }

    dispatch(setUser({
      usr_id: u.usr_id,
      p_id: u.p_id,
      name: u.username,
      fullName: u.username,
      username: u.username,
      u_br_id: u.u_br_id,
      br_id: finalBrId,
      user_type: u.user_type,
      initials,
    }));
    navigate('/', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const user = (username || '').trim();
    const pass = (password || '').trim();
    if (!user) { setError(t('login.errors.username')); return; }
    if (!pass) { setError(t('login.errors.password')); return; }

    setLoading(true);
    try {
      const resp = await loginUser(user, pass);
      if (!resp?.success) {
        setError(resp?.message || 'Login waa fashilmay');
        return;
      }
      const u = resp.user || {};
      if ((u.user_branch_count ?? resp.user_branch_count ?? 1) > 1) {
        // Multi-branch: fetch branch list then show picker
        setBranchLoading(true);
        setBranchError('');
        setPendingUser(u);
        const brResp = await fetchUserBranches();
        setBranchLoading(false);
        if (!brResp?.success || !brResp.branches?.length) {
          setBranchError(t('branch.error'));
          setStep('branch');
          return;
        }
        setBranches(brResp.branches);
        setStep('branch');
      } else {
        dispatchAndGo(u, null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = (br_id) => {
    if (!pendingUser) return;
    dispatchAndGo(pendingUser, br_id);
  };

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#0f3d5e] p-4">
      {/* ── Language switcher (top-right) ── */}
      <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors border border-white/15"
          >
            <Globe className="w-4 h-4" />
            <span className="font-semibold">{currentLang.flag}</span>
            <span className="hidden sm:inline">{currentLang.label}</span>
          </button>
          {langOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setLangOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden z-20">
                {LANGUAGES.map((lng) => (
                  <button
                    key={lng.code}
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage(lng.code);
                      setLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-start transition-colors ${
                      i18n.language === lng.code
                        ? 'bg-[#0f3d5e]/10 text-[#0f3d5e] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-bold w-6">{lng.flag}</span>
                    <span>{lng.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row bg-white"
      >
        {/* ── Left panel ── */}
        <div className="relative lg:w-[45%] bg-gradient-to-br from-[#0f3d5e] via-[#0a2f4a] to-[#062535] text-white p-10 flex flex-col items-center justify-center text-center min-h-[320px] lg:min-h-[560px] overflow-hidden">
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 -translate-x-1/2 translate-y-1/2 pointer-events-none" />
          <div className="absolute top-1/2 left-0 w-72 h-72 rounded-full bg-white/10 -translate-x-1/3 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-white/10 translate-x-1/3 translate-y-1/3 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center space-y-5">
            {/* ── Simple Logo ── */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden"
            >
              {!logoFailed ? (
                <img
                  src={LOGO_URL}
                  alt="Barbaariye logo"
                  className="w-20 h-20 lg:w-24 lg:h-24 object-contain select-none"
                  draggable={false}
                />
              ) : (
                <span className="text-[#0f3d5e] font-extrabold text-3xl">B</span>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="space-y-2"
            >
              <h2 className="text-3xl font-bold tracking-[0.25em] uppercase text-white">
                {t('login.welcome')}
              </h2>
              <h3 className="text-lg font-semibold tracking-widest uppercase text-white/85">
                {t('common.appName')}
              </h3>
              <p className="text-sm text-white/70 max-w-xs leading-relaxed mt-2">
                {t('login.subtitle')}<br />
                {t('login.instruction')}
              </p>
            </motion.div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 bg-white p-8 lg:p-12 flex flex-col justify-center overflow-hidden">
          <AnimatePresence mode="wait">

            {step === 'login' && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="max-w-sm mx-auto w-full"
              >
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-[#0f3d5e]">{t('login.signIn')}</h1>
                  <p className="text-sm text-slate-500 mt-1">{t('login.signInDesc')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                      <span className="shrink-0">⚠</span>
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('login.username')}
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#0f3d5e]/25 focus:border-[#0f3d5e] outline-none transition text-sm"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login.password')}
                      autoComplete="current-password"
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#0f3d5e]/25 focus:border-[#0f3d5e] outline-none transition text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0f3d5e] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 mt-2 rounded-xl bg-[#0f3d5e] hover:bg-[#0c3250] disabled:opacity-70 text-white font-semibold text-sm transition-colors shadow-md shadow-[#0f3d5e]/30"
                  >
                    {loading ? t('login.loading') : t('login.signIn')}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'branch' && (
              <motion.div
                key="branch-picker"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="max-w-sm mx-auto w-full"
              >
                <button
                  type="button"
                  onClick={() => { setStep('login'); setBranches([]); setPendingUser(null); setBranchError(''); }}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0f3d5e] mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('login.signIn')}
                </button>

                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-[#0f3d5e]">{t('branch.title')}</h1>
                  <p className="text-sm text-slate-500 mt-1">{t('branch.subtitle')}</p>
                </div>

                {branchError && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl mb-4">
                    <span className="shrink-0">⚠</span>
                    {branchError}
                  </div>
                )}

                {branchLoading ? (
                  <p className="text-sm text-slate-400 text-center py-8">{t('branch.loading')}</p>
                ) : (
                  <div className="space-y-2">
                    {branches.map((br) => (
                      <button
                        key={br.br_id}
                        type="button"
                        onClick={() => handleBranchSelect(br.br_id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 hover:border-[#0f3d5e] hover:bg-[#0f3d5e]/5 text-start transition-colors group"
                      >
                        <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0f3d5e]/10 flex items-center justify-center group-hover:bg-[#0f3d5e]/20 transition-colors">
                          <Building2 className="w-4 h-4 text-[#0f3d5e]" />
                        </span>
                        <span className="flex-1 font-medium text-slate-700 group-hover:text-[#0f3d5e] text-sm">{br.br_name}</span>
                        <span className="text-xs text-[#0f3d5e] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">{t('branch.select')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-6 pt-4 border-t border-white/10 text-white/75 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
          <nav className="flex items-center gap-5">
            <a href="#" className="font-semibold text-white hover:text-sky-300 transition-colors">
              SYD ICT SOLUTIONS
            </a>
            <a href="#" className="hover:text-sky-300 transition-colors">{t('footer.about')}</a>
            <a href="#" className="hover:text-sky-300 transition-colors">{t('footer.blog')}</a>
            <a href="#" className="hover:text-sky-300 transition-colors">{t('footer.licenses')}</a>
          </nav>
          <p className="text-center sm:text-right">
            ©2017- {new Date().getFullYear()}, {t('footer.rights')}{' '}
            <span className="text-rose-400">♥</span> by{' '}
            <span className="font-semibold text-white">SYD ICT SOLUTIONS</span> {t('footer.slogan')}
          </p>
        </div>
      </footer>
    </div>
  );
}

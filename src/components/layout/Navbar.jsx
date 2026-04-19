import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronDown, Sun, Moon, Menu, Globe, Building2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toggleDarkMode, setSidebarOpen, setBranch, logout } from '../../slices/uiSlice';
import { LANGUAGES } from '../../i18n/i18n';
import { fetchUserBranches } from '../../services/api';
import SearchInput from '../ui/SearchInput';

const fallbackUser = {
  initials: 'AS',
  name: 'AS Admin',
  fullName: 'Admin User',
  email: 'admin@barbaariye.com',
};

export default function Navbar({
  user: userProp,
  onSearch,
  searchPlaceholder,
  notificationCount,
  showSearch = true,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const userFromStore = useSelector((state) => state.ui.user);
  const user = userProp ?? userFromStore ?? fallbackUser;
  const darkMode = useSelector((state) => state.ui.darkMode);
  const [branchOpen, setBranchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userBranches, setUserBranches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const branchRef = useRef(null);
  const profileRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    if (!user?.usr_id) return;
    fetchUserBranches(user.usr_id).then((resp) => {
      if (resp?.success && resp.branches?.length) setUserBranches(resp.branches);
    });
  }, [user?.usr_id]);

  const currentBranch = userBranches.find((b) => b.br_id === user?.br_id) ?? userBranches[0] ?? null;

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];
  const placeholder = searchPlaceholder ?? t('navbar.searchPlaceholder');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (branchRef.current && !branchRef.current.contains(e.target)) setBranchOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearchQuery(v);
    onSearch?.(v);
  };

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-sm border-b border-slate-200/80 dark:border-slate-700/80 w-full">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0f3d5e]/40 to-transparent pointer-events-none" aria-hidden />
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <button
          onClick={() => dispatch(setSidebarOpen(true))}
          className="lg:hidden flex-shrink-0 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          aria-label={t('navbar.openMenu')}
        >
          <Menu className="w-5 h-5" />
        </button>
        {userBranches.length > 0 && (
          <div className="relative flex-shrink-0" ref={branchRef}>
            <button
              onClick={() => setBranchOpen(!branchOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[140px] sm:max-w-[180px]"
            >
              <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-[#0f3d5e] dark:text-teal-400" />
              <span className="truncate">{currentBranch?.br_name ?? '...'}</span>
              {userBranches.length > 1 && (
                <ChevronDown
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${branchOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>
            <AnimatePresence>
              {branchOpen && userBranches.length > 1 && (
                <motion.div
                  key="branch-dropdown"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 py-1.5 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-200/90 dark:border-slate-600/80 z-50"
                >
                  {userBranches.map((br) => {
                    const isActive = Number(br.br_id) === Number(user?.br_id);
                    return (
                      <button
                        key={br.br_id}
                        onClick={() => {
                          dispatch(setBranch(br.br_id));
                          setBranchOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          isActive
                            ? 'bg-[#0f3d5e]/10 text-[#0f3d5e] dark:text-teal-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Building2 className="w-4 h-4 flex-shrink-0 opacity-60" />
                        <span className="truncate">{br.br_name}</span>
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0f3d5e] dark:bg-teal-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {showSearch && (
          <div className="hidden md:block flex-1 min-w-0 max-w-xs lg:max-w-md">
            <SearchInput
              placeholder={placeholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="!max-w-none"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
        {/* Language switcher */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            aria-label={t('navbar.language')}
          >
            <Globe className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-semibold">{currentLang.flag}</span>
          </button>
          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 py-1.5 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-200/90 dark:border-slate-600/80 z-50 overflow-hidden"
              >
                {LANGUAGES.map((lng) => (
                  <button
                    key={lng.code}
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage(lng.code);
                      setLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                      i18n.language === lng.code
                        ? 'bg-slate-100 dark:bg-slate-700 text-[#0f3d5e] dark:text-white font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <span className="text-xs font-bold w-6">{lng.flag}</span>
                    <span>{lng.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => dispatch(toggleDarkMode())}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors duration-200"
          aria-label={t('navbar.toggleDark')}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors duration-200">
          <Bell className="w-5 h-5" />
          {notificationCount != null && notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
              {notificationCount}
            </span>
          )}
        </button>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-teal-900/20">
              {user.initials || 'U'}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200">
              {user.name}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 py-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-200/90 dark:border-slate-600/80 z-50 overflow-hidden"
              >
                <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-600">
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    {user.fullName || user.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  {t('navbar.profile')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(logout());
                    navigate('/login', { replace: true });
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600"
                >
                  {t('navbar.logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

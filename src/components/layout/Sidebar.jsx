import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toggleSidebarCollapse, setSidebarOpen } from '../../slices/uiSlice';
import { defaultMenuItems } from '../../config/menuConfig';
import { deserializePrivilege, filterMenuByPrivilege } from '../../utils/privilege';

const defaultUser = { initials: 'AS', name: 'Admin User', role: 'Administrator' };

export default function Sidebar({
  menuItems: rawMenuItems = defaultMenuItems,
  user = defaultUser,
  logo = 'Barbaariye',
}) {
  const sessionUser = useSelector((state) => state.ui.user);
  const menuItems = useMemo(() => {
    const allowed = deserializePrivilege(sessionUser?.privalage);
    return filterMenuByPrivilege(rawMenuItems, allowed, sessionUser?.user_type);
  }, [rawMenuItems, sessionUser?.privalage, sessionUser?.user_type]);
  const location = useLocation();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { sidebarCollapsed, sidebarOpen } = useSelector((state) => state.ui);
  const [openMenus, setOpenMenus] = useState({});
  const [hoveredSubmenu, setHoveredSubmenu] = useState(null);
  const closeTimeoutRef = useRef(null);
  const isRtl = i18n.language === 'ar';
  const tr = (item) => (item.labelKey ? t(item.labelKey, item.label) : item.label);

  useEffect(() => {
    if (!sidebarCollapsed) setHoveredSubmenu(null);
  }, [sidebarCollapsed]);

  // Fur kaliya parent-ka ugu horreeya ee leh child active ah (kaliya mid furan, dhammaan kale xiran)
  useEffect(() => {
    const path = location.pathname;
    const first = menuItems.find((item) => item.children?.some((c) => c.path === path));
    if (first) setOpenMenus({ [first.id]: true });
  }, [location.pathname, menuItems]);

  const isActive = (path) => path && location.pathname === path;
  const hasActiveChild = (item) => item.children?.some((c) => c.path === location.pathname);
  // Kaliya parent-ka ugu horreeya ee leh child active ah (si Finance iyo HRM labadoodba u aan la doorin)
  const activeParentId = menuItems.find((item) => hasActiveChild(item))?.id ?? null;

  const toggleMenu = (id) => {
    setOpenMenus((prev) => {
      const willOpen = !prev[id];
      if (willOpen) return { [id]: true };
      return { ...prev, [id]: false };
    });
  };

  const handleCloseMobile = () => {
    if (window.innerWidth < 1024) dispatch(setSidebarOpen(false));
  };

  const sidebarContent = (
    <div className="flex flex-col h-full font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header: logo + collapse */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 lg:border-none">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold text-white tracking-tight uppercase">
            {logo}
          </h1>
        )}
        <button
          onClick={() => dispatch(toggleSidebarCollapse())}
          className="hidden lg:flex p-2 rounded-xl hover:bg-white/10 text-white/90 transition-colors duration-200"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          onClick={() => dispatch(setSidebarOpen(false))}
          className="lg:hidden p-2 rounded-xl hover:bg-white/10 text-white"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User card */}
      <div className="p-3">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 mb-4 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-teal-900/30 ring-2 ring-white/20">
            {user.initials || 'U'}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user.name}</p>
              <p className="text-white/60 text-xs font-medium truncate">{user.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav: main + sub-menus */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return item.children ? (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={(e) => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
                if (sidebarCollapsed) {
                  setHoveredSubmenu({ id: item.id, item, rect: e.currentTarget.getBoundingClientRect() });
                }
              }}
              onMouseLeave={() => {
                if (!sidebarCollapsed) return;
                closeTimeoutRef.current = setTimeout(() => setHoveredSubmenu(null), 180);
              }}
            >
              <button
                onClick={() => toggleMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-start border-s-2 ${
                  activeParentId === item.id
                    ? 'bg-teal-500/30 text-white font-semibold shadow-inner border-teal-400'
                    : 'border-transparent text-white/85 hover:bg-white/12 font-medium'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                {Icon && <Icon className="w-5 h-5 flex-shrink-0 opacity-95" />}
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-sm">{tr(item)}</span>
                    <ChevronDown
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                        openMenus[item.id] ? 'rotate-180' : ''
                      }`}
                    />
                  </>
                )}
              </button>
              <AnimatePresence>
                {openMenus[item.id] && !sidebarCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden ms-5 ps-4 mt-1 mb-2 pt-1 border-s-2 border-teal-400/50 space-y-1"
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                      <Link
                        key={child.id}
                        to={child.path}
                        onClick={handleCloseMobile}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive(child.path)
                            ? 'bg-teal-500/30 text-white border-l-2 border-teal-400 -ml-[2px] pl-[14px] font-semibold'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {ChildIcon && <ChildIcon className="w-4 h-4 flex-shrink-0 opacity-90" />}
                        <span className="capitalize">{tr(child)}</span>
                      </Link>
                    ); })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              key={item.id}
              to={item.path}
              onClick={handleCloseMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium border-l-2 ${
                isActive(item.path) ? 'bg-teal-500/30 text-white font-semibold border-teal-400' : 'border-transparent text-white/85 hover:bg-white/12'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0 opacity-95" />}
              {!sidebarCollapsed && <span>{tr(item)}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  const flyoutEl =
    sidebarCollapsed && hoveredSubmenu ? (
      <AnimatePresence>
        <motion.div
          key={hoveredSubmenu.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => {
            if (closeTimeoutRef.current) {
              clearTimeout(closeTimeoutRef.current);
              closeTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            closeTimeoutRef.current = setTimeout(() => setHoveredSubmenu(null), 150);
          }}
          style={{
            position: 'fixed',
            ...(isRtl
              ? { right: 80, top: hoveredSubmenu.rect.top }
              : { left: 80, top: hoveredSubmenu.rect.top }),
            zIndex: 60,
          }}
          className={`min-w-[176px] w-max max-w-[220px] py-0 rounded-b-lg shadow-lg shadow-slate-900/40 bg-gradient-to-b from-[#0f3d5e] via-[#0e3856] to-[#0a2a3d] border border-white/10 font-['Plus_Jakarta_Sans',sans-serif] ring-1 ring-black/5 ${
            isRtl ? 'rounded-l-lg border-r-0' : 'rounded-r-lg border-l-0'
          }`}
        >
          <div className={`${isRtl ? 'border-r-2 rounded-l-lg' : 'border-l-2 rounded-r-lg'} border-teal-400/60 overflow-hidden`}>
            <p className="px-3 py-2.5 text-teal-300/95 text-[11px] font-semibold uppercase tracking-wider border-b border-white/10">
              {tr(hoveredSubmenu.item)}
            </p>
            <div className="py-1.5 px-0.5 space-y-0.5">
              {hoveredSubmenu.item.children.map((child) => {
                const ChildIcon = child.icon;
                return (
                <Link
                  key={child.id}
                  to={child.path}
                  onClick={() => { handleCloseMobile(); setHoveredSubmenu(null); }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all duration-200 mx-1.5 rounded-md ${
                    isActive(child.path)
                      ? 'bg-teal-500/30 text-white border-l-2 border-teal-400 -ml-[2px] pl-2.5 font-semibold'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {ChildIcon && <ChildIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-90" />}
                  <span className="capitalize">{tr(child)}</span>
                </Link>
              ); })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    ) : null;

  return (
    <>
      {typeof document !== 'undefined' && flyoutEl
        ? createPortal(flyoutEl, document.body)
        : null}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(setSidebarOpen(false))}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed top-0 h-full bg-gradient-to-b from-[#0f3d5e] via-[#0d3552] to-[#0a2a3d] z-50 hidden lg:flex flex-col shadow-xl shadow-slate-900/25 ${
          isRtl ? 'right-0 border-l border-white/5' : 'left-0 border-r border-white/5'
        }`}
      >
        <div className={`absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-teal-400/40 to-transparent pointer-events-none ${isRtl ? 'left-0' : 'right-0'}`} aria-hidden />
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: isRtl ? 300 : -300 }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? 300 : -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 z-50 w-[280px] max-w-[85vw] lg:hidden h-full bg-gradient-to-b from-[#0f3d5e] via-[#0d3552] to-[#0a2a3d] shadow-2xl shadow-slate-900/30 ${
              isRtl ? 'right-0 border-l border-white/5' : 'left-0 border-r border-white/5'
            }`}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

import { motion, LayoutGroup } from 'framer-motion';

/**
 * Tabs – premium segmented-pill with:
 *   • sliding active indicator (framer-motion layoutId)
 *   • animated aurora background behind the bar
 *   • inner highlight + soft glow
 */
export default function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) {
  return (
    <LayoutGroup id="entity-tabs">
      <div className={`relative isolate ${className}`}>
        {/* ── Aurora / glow background ── */}
        <div className="pointer-events-none absolute -inset-3 -z-10 overflow-hidden rounded-[28px]">
          <motion.div
            aria-hidden
            className="absolute -top-10 -left-10 w-60 h-60 rounded-full blur-3xl opacity-35"
            style={{ background: 'radial-gradient(circle, #0D9488 0%, transparent 70%)' }}
            animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-16 right-0 w-72 h-72 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, #0B3C5D 0%, transparent 70%)' }}
            animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }}
            animate={{ x: [0, 25, 0], y: [0, -15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* ── Tab bar ── */}
        <div
          role="tablist"
          aria-label="Tabs"
          style={{
            backgroundImage: `
              linear-gradient(135deg, rgba(11,60,93,0.92) 0%, rgba(15,74,111,0.88) 45%, rgba(13,148,136,0.82) 100%)
            `,
          }}
          className="
            relative flex items-center gap-1 p-1.5 rounded-2xl
            backdrop-blur-xl
            border border-white/15
            shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_10px_30px_-10px_rgba(11,60,93,0.55)]
            overflow-x-auto
            scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          "
        >
          {/* subtle inner sheen */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              backgroundImage:
                'radial-gradient(600px circle at 0% 0%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(500px circle at 100% 100%, rgba(56,189,248,0.18), transparent 60%)',
            }}
          />
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex-none inline-flex items-center justify-center gap-2
                  py-2 px-4 text-[0.875rem] font-medium cursor-pointer rounded-xl
                  transition-colors duration-200 whitespace-nowrap
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                  ${
                    isActive
                      ? 'text-white'
                      : 'text-white/75 hover:text-white'
                  }
                `}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-tab-pill"
                    className="
                      absolute inset-0 rounded-xl overflow-hidden
                      bg-gradient-to-b from-white to-slate-100
                      shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(11,60,93,0.08)]
                      ring-1 ring-white/60
                    "
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  >
                    {/* shimmer sweep */}
                    <motion.span
                      aria-hidden
                      className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#0D9488]/15 to-transparent"
                      animate={{ x: ['0%', '420%'] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                    />
                  </motion.span>
                )}
                <span className={`relative z-10 flex items-center gap-2 ${isActive ? 'text-[#0B3C5D]' : ''}`}>
                  {Icon && (
                    <span
                      className={`
                        inline-flex items-center justify-center w-5 h-5 rounded-md transition-all
                        ${
                          isActive
                            ? 'bg-[#0B3C5D]/10 text-[#0D9488]'
                            : 'bg-white/15 text-white/80'
                        }
                      `}
                    >
                      <Icon size={12} className="shrink-0" aria-hidden="true" />
                    </span>
                  )}
                  <span className={isActive ? 'font-semibold' : ''}>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}

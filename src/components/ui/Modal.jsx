import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal - Reusable modal component
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Called when modal should close
 * @param {string} [title] - Header title (optional if header is custom)
 * @param {ReactNode} children - Modal body content
 * @param {ReactNode} [footer] - Footer content (buttons, etc.)
 * @param {ReactNode} [header] - Custom header (overrides title if provided)
 * @param {string} [size] - sm | md | lg | xl
 * @param {boolean} [showCloseButton=true] - Show X button
 * @param {boolean} [closeOnOverlay=false] - Close when clicking overlay (default: false — close only via X button)
 * @param {boolean} [showHeader=true] - Show header section
 * @param {string} [className] - Extra class for modal container
 * @param {string} [bodyClassName] - Extra class for body
 * @param {string} [footerClassName] - Extra class for footer
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  header,
  size = 'md',
  showCloseButton = true,
  closeOnOverlay = false,
  showHeader = true,
  pageScroll = false,
  className = '',
  bodyClassName = '',
  footerClassName = '',
}) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  const closeBtn = (
    <button
      onClick={onClose}
      className="p-2 rounded-xl text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200"
      aria-label="Close"
    >
      <X className="w-5 h-5" />
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnOverlay ? onClose : undefined}
            className="absolute inset-0 bg-slate-900/30 dark:bg-slate-950/45 backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
            className={`relative w-full ${sizes[size] || sizes.md} ${pageScroll ? '' : 'max-h-[80vh] overflow-hidden'} flex flex-col rounded-2xl
              bg-white dark:bg-slate-800/95
              shadow-[0_25px_50px_-12px_rgba(15,23,42,0.15),0_0_0_1px_rgba(0,0,0,0.04)]
              dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.06)]
              ring-1 ring-slate-200/60 dark:ring-slate-600/50
              ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0d9488] to-[#0B3C5D] opacity-90" aria-hidden />
            {showHeader && (
              <div className="flex items-center justify-between gap-4 px-6 py-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/90 dark:to-slate-800/70 border-b border-slate-200/60 dark:border-slate-600/50">
                <div className="flex-1 min-w-0">
                  {header ?? (
                    <h2 id="modal-title" className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight">
                      {title}
                    </h2>
                  )}
                </div>
                {showCloseButton && <div className="flex-shrink-0">{closeBtn}</div>}
              </div>
            )}
            <div className={`flex-1 ${pageScroll ? '' : 'overflow-y-auto'} p-6 bg-slate-50/70 dark:bg-slate-900/30 ${bodyClassName}`}>
              {children}
            </div>
            {footer != null && (
              <div
                className={`flex justify-end gap-2 px-6 py-4 bg-gradient-to-t from-slate-50 to-white dark:from-slate-800/70 dark:to-slate-800/90 border-t border-slate-200/60 dark:border-slate-600/50 ${footerClassName}`}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

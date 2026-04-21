import { motion } from 'framer-motion';

const variants = {
  edit: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white ring-1 ring-inset ring-emerald-600/20 hover:ring-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30 dark:hover:bg-emerald-500 dark:hover:text-white',
  delete: 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white ring-1 ring-inset ring-rose-600/20 hover:ring-rose-600 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30 dark:hover:bg-rose-500 dark:hover:text-white',
  success: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white ring-1 ring-inset ring-emerald-600/20 hover:ring-emerald-600',
  warning: 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white ring-1 ring-inset ring-amber-600/20 hover:ring-amber-600 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30',
};

export default function ActionButton({
  variant = 'edit',
  'aria-label': ariaLabel,
  children,
  className = '',
  ...props
}) {
  const variantClass = variants[variant] || variants.edit;
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${variantClass} ${className}`}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </motion.button>
  );
}

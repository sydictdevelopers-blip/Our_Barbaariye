import DateInput from './DateInput';

export default function Input({
  label,
  error,
  id,
  type = 'text',
  className = '',
  inputClassName = '',
  ...props
}) {
  const inputId = id || (label ? `input-${label.replace(/\s/g, '-').toLowerCase()}` : undefined);
  const innerCls = `
    w-full px-4 py-2 rounded-xl border text-slate-800 dark:text-slate-200
    bg-white dark:bg-slate-700/50
    border-slate-200 dark:border-slate-600
    placeholder-slate-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-[#0f3d5e] focus:border-transparent
    disabled:opacity-60 disabled:cursor-not-allowed
    ${error ? 'border-red-500 dark:border-red-500' : ''}
    ${inputClassName}
  `;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      {type === 'date' ? (
        <DateInput id={inputId} className={innerCls} {...props} />
      ) : (
        <input id={inputId} type={type} className={innerCls} {...props} />
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

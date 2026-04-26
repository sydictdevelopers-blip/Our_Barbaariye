import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

/**
 * Renders an option label with an Active/Inactive badge when the option carries
 * a `state` field. Used inside the dropdown menu only — the selected value
 * shows just the label so the input stays compact.
 */
function renderOptionWithState(opt, meta) {
  if (meta?.context !== 'menu' || !opt?.state) return opt?.label ?? '';
  const isActive = String(opt.state).toLowerCase() === 'active';
  const badgeClass = isActive
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-500 border border-slate-200';
  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <span className="truncate">{opt.label}</span>
      <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${badgeClass}`}>
        {isActive ? 'Active' : opt.state}
      </span>
    </div>
  );
}

const select2Styles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '12px',
    borderColor: state.isFocused ? '#0f3d5e' : 'rgb(226 232 240)',
    '&:hover': { borderColor: state.isFocused ? '#0f3d5e' : 'rgb(203 213 225)' },
    boxShadow: state.isFocused ? '0 0 0 2px rgba(15, 61, 94, 0.2)' : 'none',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '12px',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    cursor: state.isDisabled ? 'default' : 'pointer',
    backgroundColor: state.isDisabled ? 'transparent' : state.isSelected ? '#0f3d5e' : state.isFocused ? 'rgb(241 245 249)' : 'white',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'rgb(30 41 59)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgb(148 163 184)',
  }),
  input: (base) => ({
    ...base,
    color: 'rgb(30 41 59)',
  }),
};

const darkSelect2Styles = {
  ...select2Styles,
  control: (base, state) => ({
    ...base,
    backgroundColor: 'rgb(51 65 85 / 0.5)',
    borderColor: state.isFocused ? '#0f3d5e' : 'rgb(71 85 105)',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'rgb(51 65 85)',
    borderRadius: '12px',
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    cursor: state.isDisabled ? 'default' : 'pointer',
    backgroundColor: state.isDisabled ? 'transparent' : state.isSelected ? '#0f3d5e' : state.isFocused ? 'rgb(71 85 105)' : 'rgb(51 65 85)',
  }),
  singleValue: (base) => ({ ...base, color: 'rgb(226 232 240)' }),
  input: (base) => ({ ...base, color: 'rgb(226 232 240)' }),
};

export default function Select2({
  options = [],
  loadOptions,
  value,
  selectedLabel,
  onChange,
  placeholder = 'Select...',
  isLoading = false,
  isDisabled = false,
  onMenuOpen,
  className = '',
  styles: stylesOverride,
  ...props
}) {
  const isDark = document.documentElement.classList.contains('dark');
  const baseStyles = isDark ? darkSelect2Styles : select2Styles;
  const styles = stylesOverride
    ? [...new Set([...Object.keys(baseStyles), ...Object.keys(stylesOverride)])].reduce((acc, k) => {
        acc[k] = (base, state) => {
          const a = baseStyles[k] ? baseStyles[k](base, state) : base;
          return stylesOverride[k] ? stylesOverride[k](a, state) : a;
        };
        return acc;
      }, {})
    : baseStyles;
  const selectedOpt = options?.find((o) => String(o.value) === String(value));
  const displayValue = selectedOpt ?? (value != null && value !== '' ? { value, label: selectedLabel ?? String(value) } : null);
  // Lazy: don't fetch dropdown data on mount. Only when the user opens the
  // menu — avoids a wave of background requests when a tab loads.
  const [defaultOpts, setDefaultOpts] = useState(false);
  // When the session branch changes, every cached "default 25" becomes stale
  // (the SP filters by the new branch). Reset our cache and force AsyncSelect
  // to remount so its own `cacheOptions` is dropped too.
  const sessionBrId = useSelector((s) => s?.ui?.user?.br_id ?? '');
  useEffect(() => {
    setDefaultOpts(false);
  }, [sessionBrId]);

  const handleMenuOpen = useCallback(async () => {
    onMenuOpen?.();
    if (defaultOpts !== false) return; // already loaded once
    if (!loadOptions) return;
    try {
      const opts = await loadOptions('');
      setDefaultOpts(Array.isArray(opts) ? opts : []);
    } catch {
      setDefaultOpts([]);
    }
  }, [defaultOpts, loadOptions, onMenuOpen]);

  const common = {
    ...props,
    value: displayValue,
    onChange: (v) => {
      if (v?.isHint || v?.value === '__hint__') return;
      onChange?.({ target: { name: props.name, value: v?.value ?? '', label: v?.label } });
    },
    placeholder,
    isDisabled,
    isClearable: true,
    isSearchable: true,
    openMenuOnFocus: true,
    tabSelectsValue: false,
    styles,
    classNamePrefix: 'select2',
    menuPortalTarget: typeof document !== 'undefined' ? document.body : null,
    menuPosition: 'fixed',
    menuPlacement: 'auto',
    menuShouldScrollIntoView: false,
  };

  if (loadOptions) {
    return (
      <div className={className}>
        <AsyncSelect
          // Remount when the session branch changes — drops react-select's
          // internal cacheOptions cache so the next open hits the backend
          // with the new branch context.
          key={`brh-${sessionBrId}`}
          {...common}
          loadOptions={loadOptions}
          defaultOptions={defaultOpts}
          onMenuOpen={handleMenuOpen}
          cacheOptions
          getOptionLabel={(opt) => (opt?.label != null ? String(opt.label) : opt?.value != null ? String(opt.value) : '')}
          getOptionValue={(opt) => opt?.value}
          formatOptionLabel={renderOptionWithState}
        />
      </div>
    );
  }

  const opt = options.map((o) => ({ value: o.value, label: o.label ?? String(o.value ?? '') }));
  const selected = opt.find((o) => String(o.value) === String(value)) ?? null;
  return (
    <div className={className}>
      <Select
        {...common}
        options={opt}
        value={selected}
      />
    </div>
  );
}

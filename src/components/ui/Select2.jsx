import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { tDb } from '../../i18n/i18n';

const ADD_NEW_VALUE = '__add_new__';

/**
 * Renders an option label with an Active/Inactive badge when the option carries
 * a `state` field. Used inside the dropdown menu only — the selected value
 * shows just the label so the input stays compact. Both label and state badge
 * pass through tDb so fixed-vocabulary values translate with the active language.
 */
function renderOptionWithState(opt, meta) {
  if (meta?.context !== 'menu' || !opt?.state) return tDb(opt?.label ?? '');
  const isActive = String(opt.state).toLowerCase() === 'active';
  const badgeClass = isActive
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600';
  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <span className="truncate">{tDb(opt.label)}</span>
      <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${badgeClass}`}>
        {tDb(opt.state)}
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
  onCreate,
  createLabel,
  className = '',
  styles: stylesOverride,
  ...props
}) {
  // Subscribe to i18n so the rendered labels (via getOptionLabel/formatOptionLabel)
  // re-evaluate when the user switches language.
  useTranslation();
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

  // Custom NoOptionsMessage component — reads the inputValue from selectProps
  // (react-select's source of truth) and renders a clickable Add-New affordance
  // when onCreate is wired. Going through `components.NoOptionsMessage` is
  // more reliable than the `noOptionsMessage` prop, which tab callers often
  // override via {...f.props} at the end of their JSX, silently masking ours.
  const customComponents = useMemo(() => {
    if (!onCreate) return undefined;
    const NoOptionsMessage = (innerProps) => {
      const inputValue = innerProps.selectProps?.inputValue ?? '';
      const trimmed = String(inputValue).trim();
      if (!trimmed) {
        return (
          <div className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500 text-center">
            {props.noOptionsMessage ? props.noOptionsMessage({ inputValue }) : 'No matching results'}
          </div>
        );
      }
      const label = createLabel ? createLabel(trimmed) : `+ Add New "${trimmed}"`;
      return (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onCreate(trimmed); }}
          className="w-full text-left px-3 py-2 text-sm text-[#0f3d5e] dark:text-teal-300 font-semibold hover:bg-[#0f3d5e]/5 dark:hover:bg-teal-400/10 transition-colors"
        >
          {label}
        </button>
      );
    };
    return { NoOptionsMessage };
  }, [onCreate, createLabel, props.noOptionsMessage]);

  const common = {
    ...props,
    value: displayValue,
    onChange: (v) => {
      if (v?.isHint || v?.value === '__hint__') return;
      // AsyncCreatableSelect emits __addNew__ via getNewOptionData; intercept
      // the click here so we open the caller's create flow instead of
      // committing the synthetic option as the field's value.
      if (v?.__addNew__ || v?.value === ADD_NEW_VALUE) {
        onCreate?.(String(v?.__searchText ?? '').trim());
        return;
      }
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
          // Remount when the session branch changes so cached options scoped
          // to the previous branch are dropped.
          key={`brh-${sessionBrId}-${onCreate ? 'create' : 'plain'}`}
          {...common}
          loadOptions={loadOptions}
          defaultOptions={defaultOpts}
          onMenuOpen={handleMenuOpen}
          cacheOptions={!onCreate}
          components={customComponents}
          getOptionLabel={(opt) => {
            const raw = opt?.label != null ? String(opt.label) : opt?.value != null ? String(opt.value) : '';
            return tDb(raw);
          }}
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
        getOptionLabel={(o) => {
          const raw = o?.label != null ? String(o.label) : o?.value != null ? String(o.value) : '';
          return tDb(raw);
        }}
        formatOptionLabel={renderOptionWithState}
      />
    </div>
  );
}

import Select from 'react-select';
import AsyncSelect from 'react-select/async';

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
  ...props
}) {
  const isDark = document.documentElement.classList.contains('dark');
  const styles = isDark ? darkSelect2Styles : select2Styles;
  const selectedOpt = options?.find((o) => String(o.value) === String(value));
  const displayValue = selectedOpt ?? (value != null && value !== '' ? { value, label: selectedLabel ?? String(value) } : null);
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
          {...common}
          loadOptions={loadOptions}
          defaultOptions
          cacheOptions
          getOptionLabel={(opt) => (opt?.label != null ? String(opt.label) : opt?.value != null ? String(opt.value) : '')}
          getOptionValue={(opt) => opt?.value}
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

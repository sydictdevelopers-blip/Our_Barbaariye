import { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../components/ui/Modal';
import * as swal from '../utils/swal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select2 from '../components/ui/Select2';
import { crud, fetchSelectOptions } from '../services/api';

/** Auto-detect valueKey (first *_id) iyo labelKey (first *_name ama column 2) */
function detectKeys(columns, row) {
  const keys = columns?.map((c) => c.key) ?? (row ? Object.keys(row) : []);
  const valueKey = keys.find((k) => k.endsWith('_id')) || keys.find((k) => k === 'id') || keys[0];
  const labelKey = keys.find((k) => k.endsWith('_name') || k.endsWith('_title')) || keys.find((k) => k !== valueKey) || keys[1] || keys[0];
  return { valueKey: valueKey || 'id', labelKey: labelKey || valueKey || 'id' };
}

const HINT_LABEL = '💡 Waxaa jira wax ka badan 25 xog – geli erey raadinta si aad u hesho';
const selectCache = {}; // Cache per optionsKey (+ extra params signature)

function cacheKeyFor(optionsKey, extra) {
  const entries = Object.entries(extra || {}).filter(([, v]) => v !== '' && v != null);
  if (!entries.length) return optionsKey;
  const sig = entries.sort().map(([k, v]) => `${k}=${v}`).join(',');
  return `${optionsKey}::${sig}`;
}

/** Soo qabo 25 row ugu horreeya, marka xaraf 1+ la qoro → client-cache filter + API fallback */
async function loadOptionsForKey(optionsKey, search = '', useCache = true, extra = {}) {
  const ck = cacheKeyFor(optionsKey, extra);
  const cacheEntry = selectCache[ck] ?? { items: [], cached: false };
  selectCache[ck] = cacheEntry;
  const searchLower = search.trim().toLowerCase();
  const isFirstOpen = !searchLower && !cacheEntry.cached;

  // 1. First open: fetch 25 rows
  if (isFirstOpen) {
    const res = await fetchSelectOptions(optionsKey, 25, '', extra).catch(() => ({}));
    const rows = res?.data || [];
    const cols = res?.columns || (rows[0] && Object.keys(rows[0]).map((key) => ({ key })));
    const { valueKey, labelKey } = detectKeys(cols, rows[0]);
    const items = rows.map((r) => ({ value: r[valueKey], label: r[labelKey] ?? String(r[valueKey] ?? '') }));
    cacheEntry.items = items;
    cacheEntry.cached = true;
    const opts = [...items];
    if (items.length >= 25) opts.push({ value: '__hint__', label: HINT_LABEL, isHint: true });
    return opts;
  }

  // 2. Empty search + cached: return the cached 25
  if (!searchLower) {
    const opts = [...cacheEntry.items];
    if (cacheEntry.items.length >= 25) opts.push({ value: '__hint__', label: HINT_LABEL, isHint: true });
    return opts;
  }

  // 3. Search (1+ chars): client-side cache filter first
  if (useCache && cacheEntry.items.length > 0) {
    const matched = cacheEntry.items.filter(
      (item) => !item.isHint && String(item.label ?? '').toLowerCase().includes(searchLower)
    );
    if (matched.length > 0) return matched;
  }

  // 4. Cache miss → hit API
  const res = await fetchSelectOptions(optionsKey, 20, search, extra).catch(() => ({}));
  const rows = res?.data || [];
  const cols = res?.columns || (rows[0] && Object.keys(rows[0]).map((key) => ({ key })));
  const { valueKey, labelKey } = detectKeys(cols, rows[0]);
  const newItems = rows.map((r) => ({ value: r[valueKey], label: r[labelKey] ?? String(r[valueKey] ?? '') }));
  if (newItems.length > 0) {
    const existingIds = new Set(cacheEntry.items.map((x) => x.value));
    newItems.forEach((item) => {
      if (!existingIds.has(item.value)) {
        cacheEntry.items.push(item);
        existingIds.add(item.value);
      }
    });
  }
  return newItems;
}

/** Submit – kaliya /api/all (fn + params + oper). Returns { success, message } ka imaanaya DB (alerts table). */
async function submitOperation(config, form, operation) {
  const params = config.toParams(form);
  return await crud({ operation, fn: config.fn, params });
}

/**
 * CrudModal – Form for Save / Update / Delete
 * config: { fn, toParams, validate, fields, title }
 */
export default function CrudModal({
  isOpen,
  onClose,
  config,
  initialForm = {},
  mode = 'insert',
  onSuccess,
}) {
  if (!config) return null;
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchedLabels, setFetchedLabels] = useState({});
  const selectedLabelRef = useRef({});

  useEffect(() => {
    if (isOpen) setForm(initialForm && typeof initialForm === 'object' ? { ...initialForm } : {});
    if (!isOpen) {
      setFetchedLabels({});
      selectedLabelRef.current = {};
    }
  }, [isOpen]);

  const extraParamsFor = useCallback((f, source) => {
    if (!f?.dependsOn) return {};
    return Object.fromEntries(
      Object.entries(f.dependsOn).map(([backendKey, formKey]) => [backendKey, source?.[formKey] ?? ''])
    );
  }, []);

  useEffect(() => {
    if (!isOpen || !config?.fields) return;
    const init = initialForm && typeof initialForm === 'object' ? initialForm : {};
    config.fields
      .filter((f) => f.optionsKey && (f.nameKey ?? f.labelRowKey) && (init[f.name] != null && init[f.name] !== '') && !init[`${f.name}_label`])
      .forEach((f) => {
        const searchVal = String(init[f.name]).trim();
        const extra = extraParamsFor(f, init);
        loadOptionsForKey(f.optionsKey, searchVal.length >= 1 ? searchVal : '', false, extra)
          .then((opts) => {
            const found = opts.find((o) => String(o.value) === String(init[f.name]));
            if (found?.label) setFetchedLabels((prev) => ({ ...prev, [f.name]: found.label }));
          })
          .catch(() => {});
      });
  }, [isOpen, config?.fields, initialForm, extraParamsFor]);

  const createLoadOptions = useCallback((optionsKey, getExtra) => {
    if (!optionsKey) return undefined;
    let debounceTimer;
    return (inputValue) => {
      return new Promise((resolve) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadOptionsForKey(optionsKey, inputValue || '', true, getExtra?.() || {}).then(resolve);
        }, 250);
      });
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    const updates = { [name]: val };
    if (e.target.label != null && config?.fields?.some((f) => f.name === name && (f.nameKey ?? f.labelRowKey))) {
      updates[`${name}_label`] = e.target.label;
      selectedLabelRef.current[name] = e.target.label;
    }
    // Reset dependents: haddii field-kan la bedelay loo isticmaalo dependsOn field kale, clear-garee
    config?.fields?.forEach((depF) => {
      if (depF.dependsOn && Object.values(depF.dependsOn).includes(name)) {
        updates[depF.name] = '';
        updates[`${depF.name}_label`] = '';
        delete selectedLabelRef.current[depF.name];
      }
    });
    setForm((prev) => ({ ...prev, ...updates }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const runValidation = () => {
    const currentMode = mode === 'update' ? 'update' : 'insert';
    const errs = config.validate ? config.validate(form, currentMode) : {};
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (operation) => {
    if (!runValidation()) return;
    setLoading(true);
    try {
      const result = await submitOperation(config, form, operation);
      onClose();
      onSuccess?.();
      await swal.swalSuccess('Wa la guulaystey', result?.message || '');
    } catch (err) {
      const msg = err?.message || '';
      const isConnectionError = /failed to fetch|networkerror|load failed|econnrefused|err_network|connection/i.test(msg);
      const isGeneralValidationError = /invalid input syntax|weydiinta|select \* from|xuduudaha|type numeric|type integer/i.test(msg);
      if (isConnectionError) {
        setErrors({ submit: '' });
        swal.swalError('Isku xirka wuu fashilmay', 'Database-ga lama xiriin karin. Hubi in backend-ku socdo.');
      } else if (isGeneralValidationError) {
        setErrors({ submit: '' });
        swal.swalError('Xog xareenta.', '');
      } else {
        setErrors({ submit: '' });
        swal.swalError(msg, '');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    handleSubmit('insert');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    handleSubmit('update');
  };

  const handleClose = () => {
    setForm({});
    setErrors({});
    onClose();
  };

  const isEdit = mode === 'update';
  const showUpdate = !!config.fn;

  const FieldWrapper = ({ label, error, children }) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}
      {children}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );

  const getInputClasses = (fieldName) =>
    `w-full px-4 py-2 rounded-xl border text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e] focus:border-transparent ${errors[fieldName] ? 'border-red-500 dark:border-red-500' : ''}`;

  const getOptions = (f) => f.options ?? [];

  const renderField = (f) => {
    const val = form[f.name];
    const opts = getOptions(f);
    if (f.type === 'hidden') {
      return <input key={f.name} type="hidden" name={f.name} value={val ?? f.default ?? ''} readOnly />;
    }
    if (f.type === 'select') {
      const key = f.optionsKey;
      const useAsync = !!key;
      const extra = extraParamsFor(f, form);
      const hasDeps = !!f.dependsOn;
      const depsUnmet = hasDeps && Object.values(extra).some((v) => v === '' || v == null);
      const depSig = hasDeps ? Object.values(extra).join('|') : '';
      return (
        <FieldWrapper key={f.name} label={f.label} error={errors[f.name]}>
          <Select2
            key={hasDeps ? `${f.name}:${depSig}` : f.name}
            name={f.name}
            value={val ?? ''}
            selectedLabel={(f.nameKey ?? f.labelRowKey) ? (form[`${f.name}_label`] ?? selectedLabelRef.current[f.name] ?? fetchedLabels[f.name]) : undefined}
            onChange={handleChange}
            options={useAsync ? [] : opts}
            loadOptions={useAsync ? createLoadOptions(key, () => extraParamsFor(f, form)) : undefined}
            placeholder={depsUnmet ? 'Marka hore dooro kala xiriirka...' : (f.placeholder ?? 'Raadi...')}
            isDisabled={depsUnmet}
            noOptionsMessage={() => 'Xogtaad raadisay ma jirto'}
            loadingMessage={() => 'Waa la baarayaa...'}
            isOptionDisabled={(opt) => opt?.isHint}
            formatOptionLabel={(opt) =>
              opt?.isHint ? <span className="text-slate-500 italic">{opt.label}</span> : opt?.label
            }
            className={errors[f.name] ? '[&_.select2__control]:border-red-500' : ''}
            {...f.props}
          />
        </FieldWrapper>
      );
    }
    if (f.type === 'radio') {
      return (
        <FieldWrapper key={f.name} label={f.label} error={errors[f.name]}>
          <div className="flex flex-wrap gap-4">
            {opts.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={f.name}
                  value={opt.value}
                  checked={val === opt.value}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#0f3d5e]"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </FieldWrapper>
      );
    }
    if (f.type === 'textarea') {
      return (
        <FieldWrapper key={f.name} label={f.label} error={errors[f.name]}>
          <textarea
            name={f.name}
            value={val ?? ''}
            onChange={handleChange}
            rows={f.rows ?? 3}
            placeholder={f.placeholder}
            className={getInputClasses(f.name)}
            {...f.props}
          />
        </FieldWrapper>
      );
    }
    if (f.type === 'checkbox') {
      return (
        <FieldWrapper key={f.name} label={f.label} error={errors[f.name]}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name={f.name}
              checked={!!val}
              onChange={handleChange}
              className="w-4 h-4 rounded text-[#0f3d5e]"
              {...f.props}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">{f.placeholder || f.label}</span>
          </label>
        </FieldWrapper>
      );
    }
    return (
      <Input
        key={f.name}
        label={f.label}
        name={f.name}
        type={f.type || 'text'}
        value={val ?? ''}
        onChange={handleChange}
        placeholder={f.placeholder}
        error={errors[f.name]}
        {...f.props}
      />
    );
  };

  const formClass = config.gridCols === 2
    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
    : 'space-y-4';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={config.title}
      size={config.modalSize || 'md'}
      footer={
        <div className="flex justify-end gap-2 w-full flex-wrap">
          {!isEdit && (
            <Button type="button" onClick={handleSave} disabled={loading}>
              {loading ? '...' : 'Save'}
            </Button>
          )}
          {isEdit && showUpdate && (
            <>
              <Button type="button" onClick={handleUpdate} disabled={loading}>
                {loading ? '...' : 'Update'}
              </Button>
            </>
          )}
          <Button type="button" variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </div>
      }
    >
      <form id="crud-form" onSubmit={(e) => { e.preventDefault(); isEdit ? handleUpdate(e) : handleSave(e); }} className={formClass}>
        {errors.submit && <p className={`text-sm text-red-600 ${config.gridCols === 2 ? 'md:col-span-2' : ''}`}>{errors.submit}</p>}
        {config.fields
          ?.filter((f) => !f.showOnMode || f.showOnMode === (isEdit ? 'update' : 'insert'))
          .map((f) => renderField(f))}
      </form>
    </Modal>
  );
}

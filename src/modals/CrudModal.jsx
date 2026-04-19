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
const selectCache = {}; // Cache per optionsKey

/** Soo qabo 25 row ugu horreeya, search marka 2+ xaraf – cache + hint */
async function loadOptionsForKey(optionsKey, search = '', useCache = true) {
  const cacheEntry = selectCache[optionsKey] ?? { items: [], cached: false };
  selectCache[optionsKey] = cacheEntry;
  const searchLower = search.trim().toLowerCase();
  const isFirstOpen = !searchLower && !cacheEntry.cached;
  const isSearch = searchLower.length >= 2 || (!useCache && searchLower.length >= 1);

  // 1. First open: fetch 25 rows
  if (isFirstOpen) {
    const res = await fetchSelectOptions(optionsKey, 25, '').catch(() => ({}));
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

  // 2. Search: check cache first (client-side filter)
  if (isSearch && useCache && cacheEntry.items.length > 0) {
    const matched = cacheEntry.items.filter(
      (item) => !item.isHint && String(item.label ?? '').toLowerCase().includes(searchLower)
    );
    if (matched.length > 0) return matched;
  }

  // 3. Search: fetch from API – haddii wax la helin, muuji "Xogtaad raadisay ma jirto"
  if (isSearch) {
    const res = await fetchSelectOptions(optionsKey, 20, search).catch(() => ({}));
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
      return newItems;
    }
    return [];
  }

  // 4. Fallback: cached 25 + hint
  const opts = [...cacheEntry.items];
  if (cacheEntry.items.length >= 25) opts.push({ value: '__hint__', label: HINT_LABEL, isHint: true });
  return opts;
}

/** Submit – kaliya /api/all (fn + params + oper) */
async function submitOperation(config, form, operation) {
  const params = config.toParams(form);
  await crud({ operation, fn: config.fn, params });
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

  useEffect(() => {
    if (!isOpen || !config?.fields) return;
    const init = initialForm && typeof initialForm === 'object' ? initialForm : {};
    config.fields
      .filter((f) => f.optionsKey && (f.nameKey ?? f.labelRowKey) && (init[f.name] != null && init[f.name] !== '') && !init[`${f.name}_label`])
      .forEach((f) => {
        const searchVal = String(init[f.name]).trim();
        loadOptionsForKey(f.optionsKey, searchVal.length >= 1 ? searchVal : '', false)
          .then((opts) => {
            const found = opts.find((o) => String(o.value) === String(init[f.name]));
            if (found?.label) setFetchedLabels((prev) => ({ ...prev, [f.name]: found.label }));
          })
          .catch(() => {});
      });
  }, [isOpen, config?.fields, initialForm]);

  const createLoadOptions = useCallback((optionsKey) => {
    if (!optionsKey) return undefined;
    let debounceTimer;
    return (inputValue) => {
      return new Promise((resolve) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadOptionsForKey(optionsKey, inputValue || '').then(resolve);
        }, 400);
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
    setForm((prev) => ({ ...prev, ...updates }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const runValidation = () => {
    const errs = config.validate ? config.validate(form) : {};
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (operation) => {
    if (!runValidation()) return;
    setLoading(true);
    try {
      await submitOperation(config, form, operation);
      onClose();
      onSuccess?.();
      const msg = operation === 'insert' ? 'Xogtada waa lagu daray.' : operation === 'update' ? 'Xogtada waa la cusboonaysiiyay.' : 'Xogtada waa la tirtay.';
      await swal.swalSuccess('Wa la guulaystey', msg);
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
      return (
        <FieldWrapper key={f.name} label={f.label} error={errors[f.name]}>
          <Select2
            name={f.name}
            value={val ?? ''}
            selectedLabel={(f.nameKey ?? f.labelRowKey) ? (form[`${f.name}_label`] ?? selectedLabelRef.current[f.name] ?? fetchedLabels[f.name]) : undefined}
            onChange={handleChange}
            options={useAsync ? [] : opts}
            loadOptions={useAsync ? createLoadOptions(key) : undefined}
            placeholder={f.placeholder ?? 'Raadi...'}
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={config.title}
      size="md"
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
      <form id="crud-form" onSubmit={(e) => { e.preventDefault(); isEdit ? handleUpdate(e) : handleSave(e); }} className="space-y-4">
        {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}
        {config.fields?.map((f) => renderField(f))}
      </form>
    </Modal>
  );
}

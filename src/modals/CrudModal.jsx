import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Info, PlayCircle, Plus } from 'lucide-react';
import Modal from '../components/ui/Modal';
import ModuleHelpModal from '../components/ModuleHelpModal';
import * as swal from '../utils/swal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select2 from '../components/ui/Select2';
import { useSelector } from 'react-redux';
import { crud, fetchSelectOptions, fetchModuleHelp, uploadNewStudentImage } from '../services/api';
import { CRUD_CONFIG } from '../config/crudConfig';
import { selectIsReadOnlyBranch } from '../slices/uiSlice';
import { resizeImageToBudget } from '../utils/resizeImage';

/** Auto-detect valueKey (first *_id) iyo labelKey (first *_name ama column 2) */
function detectKeys(columns, row) {
  const keys = columns?.map((c) => c.key) ?? (row ? Object.keys(row) : []);
  const valueKey = keys.find((k) => k.endsWith('_id')) || keys.find((k) => k === 'id') || keys[0];
  const labelKey = keys.find((k) => k.endsWith('_name') || k.endsWith('_title')) || keys.find((k) => k !== valueKey) || keys[1] || keys[0];
  return { valueKey: valueKey || 'id', labelKey: labelKey || valueKey || 'id' };
}

const HINT_LABEL = '💡 Waxaa jira wax ka badan 25 xog – geli erey raadinta si aad u hesho';
const selectCache = {};

/** Read the user's currently selected branch from the auth blob — used to
 *  scope the dropdown cache so switching branches does not surface stale rows. */
function getSessionBrId() {
  if (typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage?.getItem('brabaariye_user');
    if (!stored) return '';
    return JSON.parse(stored)?.br_id ?? '';
  } catch {
    return '';
  }
}

function cacheKeyFor(optionsKey, extra) {
  const entries = Object.entries(extra || {}).filter(([, v]) => v !== '' && v != null);
  const brId = getSessionBrId();
  if (brId !== '') entries.push(['__br', brId]);
  if (!entries.length) return optionsKey;
  const sig = entries.sort().map(([k, v]) => `${k}=${v}`).join(',');
  return `${optionsKey}::${sig}`;
}

// Option keys that surface academic years — for these, the active row should
// always render first in the dropdown. Defense-in-depth: backend SQL also
// orders this way, but SP-driven keys (e.g. result_academic_options) need
// the sort applied client-side.
const ACADEMIC_YEAR_OPTION_KEYS = new Set(['academic_options', 'academicYeartab', 'result_academic_options']);

function sortActiveFirstIfAcademic(optionsKey, items) {
  if (!ACADEMIC_YEAR_OPTION_KEYS.has(optionsKey)) return items;
  return [...items].sort((a, b) => {
    const aActive = String(a.state ?? '').trim().toLowerCase() === 'active' ? 0 : 1;
    const bActive = String(b.state ?? '').trim().toLowerCase() === 'active' ? 0 : 1;
    return aActive - bActive;
  });
}

async function loadOptionsForKey(optionsKey, search = '', useCache = true, extra = {}) {
  const ck = cacheKeyFor(optionsKey, extra);
  const cacheEntry = selectCache[ck] ?? { items: [], cached: false };
  selectCache[ck] = cacheEntry;
  const searchLower = search.trim().toLowerCase();
  const isFirstOpen = !searchLower && !cacheEntry.cached;

  if (isFirstOpen) {
    const res = await fetchSelectOptions(optionsKey, 25, '', extra).catch(() => ({}));
    const rows = res?.data || [];
    const cols = res?.columns || (rows[0] && Object.keys(rows[0]).map((key) => ({ key })));
    const { valueKey, labelKey } = detectKeys(cols, rows[0]);
    const items = sortActiveFirstIfAcademic(optionsKey, rows.map((r) => {
      const item = { value: r[valueKey], label: r[labelKey] ?? String(r[valueKey] ?? '') };
      if (r.state != null) item.state = String(r.state);
      return item;
    }));
    cacheEntry.items = items;
    cacheEntry.cached = true;
    const opts = [...items];
    if (items.length >= 25) opts.push({ value: '__hint__', label: HINT_LABEL, isHint: true });
    return opts;
  }

  if (!searchLower) {
    const opts = sortActiveFirstIfAcademic(optionsKey, [...cacheEntry.items]);
    if (cacheEntry.items.length >= 25) opts.push({ value: '__hint__', label: HINT_LABEL, isHint: true });
    return opts;
  }

  if (useCache && cacheEntry.items.length > 0) {
    const matched = cacheEntry.items.filter(
      (item) => !item.isHint && String(item.label ?? '').toLowerCase().includes(searchLower)
    );
    if (matched.length > 0) return matched;
  }

  const res = await fetchSelectOptions(optionsKey, 20, search, extra).catch(() => ({}));
  const rows = res?.data || [];
  const cols = res?.columns || (rows[0] && Object.keys(rows[0]).map((key) => ({ key })));
  const { valueKey, labelKey } = detectKeys(cols, rows[0]);
  const newItems = sortActiveFirstIfAcademic(optionsKey, rows.map((r) => {
    const item = { value: r[valueKey], label: r[labelKey] ?? String(r[valueKey] ?? '') };
    if (r.state != null) item.state = String(r.state);
    return item;
  }));
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

async function submitOperation(config, form, operation) {
  const params = config.toParams(form);
  return await crud({ operation, fn: config.fn, params });
}

/**
 * Image-upload field. Picks a local image, uploads to S3 immediately,
 * and pushes the public URL into the form via onChange (synthetic event).
 */
function ImageUploadField({ name, value, label, error, onChange, t, disabled }) {
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const inputId = `crud-${name}`;
  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png'];
    const ALLOWED_EXT = /\.(jpe?g|png)$/i;
    const MAX_BYTES = 300 * 1024;
    if (!ALLOWED_MIME.includes(String(f.type || '').toLowerCase()) || !ALLOWED_EXT.test(f.name || '')) {
      setErrMsg(t('crudModal.imageOnly', { defaultValue: 'Only JPG, JPEG, or PNG images are allowed' }));
      return;
    }
    setErrMsg('');
    setBusy(true);
    try {
      // Auto-shrink oversized photos client-side before upload — phone cams
      // routinely emit multi-MB files and the backend hard-caps at 300 KB.
      const uploadFile = f.size > MAX_BYTES ? await resizeImageToBudget(f, MAX_BYTES) : f;
      const resp = await uploadNewStudentImage(uploadFile);
      const url = resp?.image || '';
      onChange({ target: { name, value: url } });
    } catch (err) {
      setErrMsg(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          disabled={busy || disabled}
          onChange={handleFile}
          className="text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#0f3d5e] file:text-white file:cursor-pointer hover:file:bg-[#0d3553] disabled:opacity-60"
        />
        {value && !busy && (
          <a href={value} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={value} alt="preview" className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
          </a>
        )}
        {busy && <span className="text-xs text-slate-500">{t('crudModal.uploading', { defaultValue: 'Uploading...' })}</span>}
      </div>
      {(error || errMsg) && (
        <p className="text-sm text-red-600 dark:text-red-400">{errMsg || error}</p>
      )}
    </div>
  );
}

function FieldWrapper({ label, error, children, formatError }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      {children}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{formatError ? formatError(error) : error}</p>}
    </div>
  );
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
  moduleKey,
}) {
  if (!config) return null;

  const { t, i18n } = useTranslation();
  const isReadOnly = useSelector(selectIsReadOnlyBranch);
  // If the string looks like an i18n key (e.g. "students.registerForm.fields.fullName")
  // run it through t(); otherwise return as-is. Static labels like "Class" remain unchanged.
  const tr = (s) => {
    if (s == null) return s;
    const str = String(s);
    if (!str.includes('.')) return str;
    return t(str, { defaultValue: str });
  };
  const trOpts = (opts) => Array.isArray(opts) ? opts.map((o) => ({ ...o, label: tr(o.label) })) : opts;
  // Validation messages from crudConfig look like "<label-or-i18n-key> required".
  // Translate the key fragment + the trailing word.
  const trError = (msg) => {
    if (!msg) return msg;
    const m = String(msg);
    const idx = m.lastIndexOf(' required');
    if (idx !== -1) {
      const labelPart = m.slice(0, idx);
      const requiredWord = t('common.required', { defaultValue: 'required' });
      return `${tr(labelPart)} ${requiredWord}`;
    }
    // Pass through tr() so extraValidate-returned i18n keys (e.g.
    // "academicSetup.academicYearTab.errEndAfterStart") get translated too.
    return tr(m);
  };
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchedLabels, setFetchedLabels] = useState({});
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPreview, setHelpPreview] = useState(null);
  // Sub-modal state for the inline "+ Add New" responsible flow.
  // open=true renders a nested <CrudModal/> below; on save we refetch the parent
  // dropdown and select the new row automatically.
  const [subModal, setSubModal] = useState({ open: false });
  const selectedLabelRef = useRef({});

  const helpKey = moduleKey || config.moduleKey || '';

  useEffect(() => {
    if (isOpen) {
      const init = initialForm && typeof initialForm === 'object' ? { ...initialForm } : {};
      // Apply field defaults for any slot still empty — covers insert mode (date→today,
      // hidden→session vals, etc.) without overwriting existing values on update.
      config?.fields?.forEach((f) => {
        if (init[f.name] == null || init[f.name] === '') {
          const dflt = typeof f.default === 'function' ? f.default() : f.default;
          if (dflt != null && dflt !== '') init[f.name] = dflt;
        }
      });
      setForm(init);
    }
    if (!isOpen) {
      setFetchedLabels({});
      selectedLabelRef.current = {};
    }
  }, [isOpen]);

  // Soo qaad sharaxaadda module-ka marka modal-ka la furo
  useEffect(() => {
    if (!isOpen || !helpKey) { setHelpPreview(null); return; }
    fetchModuleHelp(helpKey, i18n.language || 'so')
      .then((row) => setHelpPreview(row || null))
      .catch(() => setHelpPreview(null));
  }, [isOpen, helpKey, i18n.language]);

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
      // crud() returns the SP's first-column reply as a plain string, e.g.
      // "This information is correctly registered" or "This information has
      // been already exist". translateMessage in swal.js pattern-matches that
      // text to the active language; the result-string is also accepted as an
      // {message} object for legacy callers.
      const result = await submitOperation(config, form, operation);
      const replyText = typeof result === 'string' ? result : (result?.message || '');
      // "Already exists" / "not registered" are not real successes — show them
      // as warnings so the user notices the record was rejected by the SP.
      const isWarning = /already\s+exists?|not\s+registered|in\s+use|cannot\s+(?:delete|change)/i.test(replyText);
      onClose();
      // Pass the saved form so a parent CrudModal (in the Add-New flow) can
      // find the newly created row by name + phone after a refetch.
      onSuccess?.(form, result);
      if (isWarning) {
        // SP rejected the operation (already exists, in use, not registered).
        // "Laguma guuleysan" / "Not succeeded" / "لم يتم بنجاح" header makes
        // it visually distinct from a success.
        await swal.swalError(t('swal.titles.notSucceeded', { defaultValue: 'Not succeeded' }), replyText);
      } else {
        await swal.swalSuccess(t('swal.titles.success', { defaultValue: 'Success' }), replyText);
      }
    } catch (err) {
      const msg = err?.message || '';
      const isConnectionError = /failed to fetch|networkerror|load failed|econnrefused|err_network|connection/i.test(msg);
      const isGeneralValidationError = /invalid input syntax|weydiinta|select \* from|xuduudaha|type numeric|type integer/i.test(msg);
      if (isConnectionError) {
        setErrors({ submit: '' });
        swal.swalError('Isku xirka wuu fashilmay', 'Database-ga lama xiriin karin. Hubi in backend-ku socdo.');
      } else if (isGeneralValidationError) {
        setErrors({ submit: '' });
        swal.swalError(t('swal.titles.validationError', { defaultValue: 'Validation error' }), '');
      } else {
        setErrors({ submit: '' });
        swal.swalError(msg, '');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (e) => { e.preventDefault(); handleSubmit('insert'); };
  const handleUpdate = (e) => { e.preventDefault(); handleSubmit('update'); };
  const handleClose = () => { setForm({}); setErrors({}); onClose(); };

  // Sub-modal "+ Add New" flow — invoked when the user picks the inline Add-New
  // button inside an unmatched search. After save, refetch the parent dropdown
  // and select the newly created row automatically.
  const handleSubModalSuccess = useCallback(async (savedForm) => {
    const f = subModal.returnField;
    const seedField = subModal.seedField || 'p_name_sp';
    const lookupName = String(savedForm?.[seedField] ?? subModal.searchText ?? '').trim();
    if (!f || !lookupName) {
      setSubModal({ open: false });
      return;
    }
    const extra = extraParamsFor(f, form);
    // Drop any cached results for this dropdown so we hit the backend fresh.
    const ck = cacheKeyFor(f.optionsKey, extra);
    delete selectCache[ck];
    let opts = [];
    try {
      opts = await loadOptionsForKey(f.optionsKey, lookupName, false, extra);
    } catch { opts = []; }
    const lc = lookupName.toLowerCase();
    const found = opts.find((o) =>
      !o.isHint && String(o.label || '').toLowerCase().includes(lc)
    ) || opts.find((o) => !o.isHint);
    if (found?.value != null) {
      setForm((prev) => ({
        ...prev,
        [f.name]: String(found.value),
        [`${f.name}_label`]: found.label,
      }));
      selectedLabelRef.current[f.name] = found.label;
      if (errors[f.name]) setErrors((prev) => ({ ...prev, [f.name]: '' }));
    }
    setSubModal({ open: false });
  }, [subModal, form, extraParamsFor, errors]);

  const isEdit = mode === 'update';
  const showUpdate = !!config.fn;

  const getInputClasses = (fieldName) =>
    `w-full px-4 py-2 rounded-xl border text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e] focus:border-transparent ${errors[fieldName] ? 'border-red-500 dark:border-red-500' : ''}`;

  const getOptions = (f) => trOpts(f.options ?? []);

  const renderField = (f) => {
    const val = form[f.name];
    const opts = getOptions(f);
    const fLabel = tr(f.label);
    const fPh = tr(f.placeholder);
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
      // Inline "+ Add New" — when f.addNewConfigKey is set we hand Select2 an
      // `onCreate` callback. Internally Select2 swaps to AsyncCreatableSelect,
      // which renders a "+ Add New 'X'" affordance whenever the typed text
      // doesn't match an existing option. Clicking it opens a nested CrudModal
      // pre-filled with the search text via the SubModal flow below.
      const noResultsMsg = () => t('crudModal.noResults', { defaultValue: 'Xogtaad raadisay ma jirto' });
      const handleCreate = f.addNewConfigKey
        ? (q) => {
            if (!q) return;
            // Two seed strategies:
            //   * f.addNewSeed (function) returns a {field: value} object — lets
            //     the caller route the typed text to different inputs based on
            //     content (e.g. "612345" → tel_sp, "Cali Maxamed" → p_name_sp).
            //   * f.addNewSearchKey (string, legacy) names a single field to
            //     receive the full search text.
            const seedFromFn = typeof f.addNewSeed === 'function' ? f.addNewSeed(q) : null;
            const seedObj = (seedFromFn && typeof seedFromFn === 'object')
              ? seedFromFn
              : { [f.addNewSearchKey || 'p_name_sp']: q };
            setSubModal({
              open: true,
              configKey: f.addNewConfigKey,
              returnField: f,
              seedObj,
            });
          }
        : undefined;
      return (
        <FieldWrapper key={f.name} label={fLabel} error={errors[f.name]} formatError={trError}>
          <Select2
            key={hasDeps ? `${f.name}:${depSig}` : f.name}
            name={f.name}
            value={val ?? ''}
            selectedLabel={(f.nameKey ?? f.labelRowKey) ? (form[`${f.name}_label`] ?? selectedLabelRef.current[f.name] ?? fetchedLabels[f.name]) : undefined}
            onChange={handleChange}
            options={useAsync ? [] : opts}
            loadOptions={useAsync ? createLoadOptions(key, () => extraParamsFor(f, form)) : undefined}
            placeholder={fPh ?? t('crudModal.search', { defaultValue: 'Raadi...' })}
            isDisabled={depsUnmet}
            noOptionsMessage={noResultsMsg}
            onCreate={handleCreate}
            createLabel={() => {
              const prefix = t('crudModal.addNew', { defaultValue: '+ Add New' });
              const entity = f.addNewConfigKey ? tr(CRUD_CONFIG[f.addNewConfigKey]?.title) : '';
              return entity ? `${prefix} ${entity}` : prefix;
            }}
            loadingMessage={() => t('crudModal.loading', { defaultValue: 'Waa la baarayaa...' })}
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
        <FieldWrapper key={f.name} label={fLabel} error={errors[f.name]} formatError={trError}>
          <div className="flex flex-wrap gap-4">
            {opts.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name={f.name} value={opt.value} checked={val === opt.value} onChange={handleChange} className="w-4 h-4 text-[#0f3d5e]" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </FieldWrapper>
      );
    }
    if (f.type === 'textarea') {
      return (
        <FieldWrapper key={f.name} label={fLabel} error={errors[f.name]} formatError={trError}>
          <textarea name={f.name} value={val ?? ''} onChange={handleChange} rows={f.rows ?? 3} placeholder={fPh} className={getInputClasses(f.name)} {...f.props} />
        </FieldWrapper>
      );
    }
    if (f.type === 'checkbox') {
      return (
        <FieldWrapper key={f.name} label={fLabel} error={errors[f.name]} formatError={trError}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name={f.name} checked={!!val} onChange={handleChange} className="w-4 h-4 rounded text-[#0f3d5e]" {...f.props} />
            <span className="text-sm text-slate-600 dark:text-slate-400">{fPh || fLabel}</span>
          </label>
        </FieldWrapper>
      );
    }
    if (f.type === 'image-upload') {
      return (
        <ImageUploadField
          key={f.name}
          name={f.name}
          value={val ?? ''}
          label={fLabel}
          error={errors[f.name] ? trError(errors[f.name]) : ''}
          onChange={handleChange}
          t={t}
        />
      );
    }
    return (
      <Input
        key={f.name}
        id={`crud-${f.name}`}
        label={fLabel}
        name={f.name}
        type={f.type || 'text'}
        value={val ?? ''}
        onChange={handleChange}
        placeholder={fPh}
        error={errors[f.name] ? trError(errors[f.name]) : ''}
        {...f.props}
      />
    );
  };

  const formClass =
    config.gridCols === 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' :
    config.gridCols === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' :
    'space-y-4';
  const hasDesc = !!helpPreview?.description;
  const hasVideo = !!helpPreview?.video_url;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        pageScroll={!!config.pageScroll}
        header={
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100 tracking-tight truncate">
              {tr(config.title)}
            </h2>
            {helpKey && (
              <button
                type="button"
                title="Sharaxaad / Video"
                onClick={() => setHelpOpen(true)}
                className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0f3d5e]/10 hover:bg-[#0f3d5e]/20 dark:bg-white/10 dark:hover:bg-white/20 text-[#0f3d5e] dark:text-slate-300 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        }
        size={config.modalSize || 'md'}
        footer={
          <div className="flex justify-end gap-2 w-full flex-wrap">
            {!isReadOnly && !isEdit && (
              <Button type="button" onClick={handleSave} disabled={loading}>
                {loading ? '...' : t('common.save', { defaultValue: 'Save' })}
              </Button>
            )}
            {!isReadOnly && isEdit && showUpdate && (
              <Button type="button" onClick={handleUpdate} disabled={loading}>
                {loading ? '...' : t('common.update', { defaultValue: 'Update' })}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={handleClose}>
              {t('common.close', { defaultValue: 'Close' })}
            </Button>
          </div>
        }
      >
        {/* Help preview banner – muuqda kaliya haddii sharaxaad ama video jiro */}
        {(hasDesc || hasVideo) && (
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="w-full mb-4 flex items-start gap-3 rounded-xl border border-[#0f3d5e]/20 bg-[#0f3d5e]/5 hover:bg-[#0f3d5e]/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 px-4 py-3 text-start transition-colors group"
          >
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0f3d5e] dark:text-teal-400" />
            <div className="flex-1 min-w-0">
              {helpPreview?.title && (
                <p className="text-xs font-semibold text-[#0f3d5e] dark:text-teal-400 mb-0.5">
                  {helpPreview.title}
                </p>
              )}
              {hasDesc && (
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {helpPreview.description}
                </p>
              )}
              <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-[#0f3d5e]/70 dark:text-teal-400/80 group-hover:text-[#0f3d5e] dark:group-hover:text-teal-300 transition-colors">
                {hasVideo && <PlayCircle className="w-3 h-3" />}
                {hasVideo ? 'Arag sharaxaadda iyo video-ga →' : 'Arag sharaxaadda buuxda →'}
              </span>
            </div>
          </button>
        )}

        <form
          id="crud-form"
          onSubmit={(e) => { e.preventDefault(); isEdit ? handleUpdate(e) : handleSave(e); }}
          className={formClass}
        >
          {errors.submit && <p className={`text-sm text-red-600 ${config.gridCols === 3 ? 'md:col-span-2 lg:col-span-3' : config.gridCols === 2 ? 'md:col-span-2' : ''}`}>{errors.submit}</p>}
          {config.fields
            ?.filter((f) => !f.showOnMode || f.showOnMode === (isEdit ? 'update' : 'insert'))
            .filter((f) => !f.showWhen || f.showWhen(form))
            .map((f) => renderField(f))}
        </form>
      </Modal>

      {helpKey && (
        <ModuleHelpModal
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          moduleKey={helpKey}
          moduleLabel={tr(config.title) || helpKey}
        />
      )}

      {/* Inline + Add New sub-modal (e.g. registers a Responsible without leaving
          the Student Register flow). On save, the parent dropdown is refetched
          and the new row is selected automatically. */}
      {subModal.open && CRUD_CONFIG[subModal.configKey] && (
        <CrudModal
          isOpen={true}
          onClose={() => setSubModal({ open: false })}
          config={CRUD_CONFIG[subModal.configKey]}
          initialForm={subModal.seedObj || { p_name_sp: '' }}
          mode="insert"
          onSuccess={handleSubModalSuccess}
          moduleKey={subModal.configKey}
        />
      )}
    </>
  );
}

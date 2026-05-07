import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Upload, Save, PlayCircle, Youtube, Video, Search } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select2 from '../../components/ui/Select2';
import ActionButton from '../../components/ui/ActionButton';
import Modal from '../../components/ui/Modal';
import {
  fetchAllModuleHelp,
  saveModuleHelp,
  deleteModuleHelp,
  uploadModuleVideo,
  resolveMediaUrl,
} from '../../services/api';
import { swalError, swalSuccess, swalConfirm } from '../../utils/swal';
import { confirmDelete } from '../../utils/confirmDelete';
import { defaultMenuItems } from '../../config/menuConfig';
import { LANGUAGES } from '../../i18n/i18n';

/** Ka soo saar dhamaan module keys-ka menu-ga (tabs-ka + path-yada). */
function collectModuleKeys(items) {
  const out = [];
  const walk = (arr) => {
    for (const it of arr || []) {
      if (!it) continue;
      if (it.tabs?.length) {
        for (const tab of it.tabs) {
          out.push({
            key: tab.entityKey || tab.id,
            label: tab.label || tab.id,
            group: it.label,
          });
        }
      }
      if (it.children) walk(it.children);
    }
  };
  walk(items);
  return out;
}

function isLocalFile(url) {
  return !!url && String(url).startsWith('/uploads');
}

function toEmbedUrl(url) {
  if (!url) return '';
  const str = String(url).trim();
  const ytMatch = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vmMatch = str.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  return str;
}

const emptyForm = { mh_id: 0, module_key: '', lang: 'so', title: '', description: '', video_url: '' };

export default function ModuleVideosPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState(null);

  const moduleOptions = useMemo(
    () => collectModuleKeys(defaultMenuItems).map((m) => ({ value: m.key, label: `${m.label} (${m.key})` })),
    []
  );

  const langOptions = useMemo(
    () => LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAllModuleHelp();
      setRows(list || []);
    } catch (err) {
      swalError(err?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterLang && r.lang !== filterLang) return false;
      if (!q) return true;
      return (
        String(r.module_key || '').toLowerCase().includes(q) ||
        String(r.title || '').toLowerCase().includes(q) ||
        String(r.description || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterLang]);

  const openAdd = () => { setForm(emptyForm); setUploadProgress(0); setOpen(true); };
  const openEdit = (row) => {
    setForm({
      mh_id: row.mh_id,
      module_key: row.module_key,
      lang: row.lang,
      title: row.title || '',
      description: row.description || '',
      video_url: row.video_url || '',
    });
    setUploadProgress(0);
    setOpen(true);
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadProgress(1);
      const res = await uploadModuleVideo(file, setUploadProgress);
      setForm((f) => ({ ...f, video_url: res.url }));
      setUploadProgress(100);
    } catch (err) {
      swalError(err?.message || 'Upload failed');
      setUploadProgress(0);
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.module_key) { swalError(t('help.moduleRequired', { defaultValue: 'Fadlan dooro module' })); return; }
    if (!String(form.title ?? '').trim()) {
      swalError(t('help.titleRequired', { defaultValue: 'Title-ka waa lagama maarmaan' }));
      return;
    }
    const url = String(form.video_url ?? '').trim();
    if (url && !/^https?:\/\//i.test(url)) {
      swalError(t('help.urlInvalid', { defaultValue: 'Video URL waa inuu ku bilaabmaa http:// ama https://' }));
      return;
    }
    setSaving(true);
    try {
      await saveModuleHelp({ ...form, oper: 'insert' });
      await swalSuccess(t('swal.titles.success'), t('swal.texts.saved'));
      setOpen(false);
      load();
    } catch (err) {
      swalError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirmDelete({ id: row.mh_id, label: 'Module Video', recordPreview: row.title || row.module_key });
    if (!ok) return;
    try {
      await deleteModuleHelp(row.mh_id);
      swalSuccess(t('swal.titles.success'), t('swal.texts.deleted'));
      load();
    } catch (err) {
      swalError(err?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm shadow-slate-200/40 dark:shadow-slate-900/30">
        <div className="h-[3px] bg-gradient-to-r from-[#0B3C5D] via-[#0f4a6f] to-[#0D9488]" />
        <div className="px-5 py-4 bg-white dark:bg-slate-900/90 border-b border-slate-200/70 dark:border-slate-700/60 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-[#0f3d5e] dark:text-slate-200" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              {t('help.pageTitle', { defaultValue: 'Module Videos & Help' })}
            </h2>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="ps-9 pe-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]"
              placeholder={t('entity.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[140px]">
            <Select2
              name="filterLang"
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              options={[{ value: '', label: t('help.allLangs', { defaultValue: 'All languages' }) }, ...langOptions]}
              isClearable={false}
            />
          </div>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            {t('entity.addNew')}
          </Button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <div className="col-span-full text-center text-slate-500 py-10">{t('common.loading')}</div>}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full text-center text-slate-400 py-10">
              {t('help.empty', { defaultValue: 'Wali sharaxaad ma jirto.' })}
            </div>
          )}
          {filtered.map((row) => (
            <div
              key={row.mh_id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 overflow-hidden flex flex-col shadow-sm"
            >
              <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
                {row.video_url ? (
                  isLocalFile(row.video_url) ? (
                    <>
                      <video src={resolveMediaUrl(row.video_url)} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPreview(row)}
                        className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center text-white"
                      >
                        <PlayCircle className="w-14 h-14 drop-shadow" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setPreview(row)}
                      className="w-full h-full flex flex-col items-center justify-center text-white gap-2 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 transition-colors"
                    >
                      <Youtube className="w-14 h-14" />
                      <span className="text-xs opacity-80">{t('help.externalVideo', { defaultValue: 'External video' })}</span>
                    </button>
                  )
                ) : (
                  <div className="text-slate-500 text-sm">{t('help.noVideo', { defaultValue: 'Video ma jiro' })}</div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {row.title || row.module_key}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-mono">{row.module_key}</span>
                      <span className="mx-1">·</span>
                      <span className="uppercase">{row.lang}</span>
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <ActionButton variant="edit" aria-label="Edit" onClick={() => openEdit(row)}>
                      <Pencil className="w-4 h-4" />
                    </ActionButton>
                    <ActionButton variant="delete" aria-label="Delete" onClick={() => handleDelete(row)}>
                      <Trash2 className="w-4 h-4" />
                    </ActionButton>
                  </div>
                </div>
                {row.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">{row.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add / Edit modal */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={form.mh_id ? t('help.editTitle', { defaultValue: 'Edit Module Help' }) : t('help.addTitle', { defaultValue: 'Add Module Help' })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} disabled={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t('help.module', { defaultValue: 'Module' })}
              </label>
              <Select2
                name="module_key"
                value={form.module_key}
                onChange={(e) => setForm({ ...form, module_key: e.target.value })}
                options={moduleOptions}
                placeholder={t('help.pickModule', { defaultValue: 'Dooro module' })}
                isClearable={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t('navbar.language')}
              </label>
              <Select2
                name="lang"
                value={form.lang}
                onChange={(e) => setForm({ ...form, lang: e.target.value })}
                options={langOptions}
                isClearable={false}
              />
            </div>
          </div>

          <Input
            label={t('help.title', { defaultValue: 'Title' })}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              {t('help.description', { defaultValue: 'Description / Usage' })}
            </label>
            <textarea
              className="w-full min-h-[140px] rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Youtube className="w-4 h-4" /> {t('help.videoUrl', { defaultValue: 'Video URL (YouTube / Vimeo)' })}
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Upload className="w-4 h-4" /> {t('help.uploadVideo', { defaultValue: 'Upload video file' })}
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFilePick}
                className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#0f3d5e] file:text-white hover:file:bg-[#0a2a3d]"
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0f3d5e]" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              {uploadProgress === 100 && form.video_url && (
                <p className="mt-1 text-xs text-emerald-600">{t('help.uploaded', { defaultValue: 'Video uploaded' })}</p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        size="xl"
        title={preview?.title || preview?.module_key || ''}
        footer={<Button variant="secondary" onClick={() => setPreview(null)}>{t('common.close')}</Button>}
      >
        {preview && (
          <div className="space-y-4">
            {preview.description && (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{preview.description}</p>
            )}
            {preview.video_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                {isLocalFile(preview.video_url) ? (
                  <video src={resolveMediaUrl(preview.video_url)} controls autoPlay className="w-full max-h-[60vh] bg-black" />
                ) : (
                  <div className="aspect-video">
                    <iframe
                      src={toEmbedUrl(preview.video_url)}
                      title="preview-video"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

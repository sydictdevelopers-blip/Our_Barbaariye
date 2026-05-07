import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Save, Upload, Youtube } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import {
  fetchModuleHelp,
  saveModuleHelp,
  uploadModuleVideo,
  resolveMediaUrl,
} from '../services/api';
import { swalError, swalSuccess } from '../utils/swal';

/** U rog URL-ka YouTube/Vimeo mid embed ah. Haddii file local ah sii dhaaf. */
function toEmbedUrl(url) {
  if (!url) return '';
  const str = String(url).trim();
  // YouTube patterns
  const ytMatch = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vmMatch = str.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  return str;
}

function isLocalFile(url) {
  return !!url && String(url).startsWith('/uploads');
}

export default function ModuleHelpModal({ isOpen, onClose, moduleKey, moduleLabel }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'so';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', video_url: '' });
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(async () => {
    if (!moduleKey) return;
    setLoading(true);
    try {
      const row = await fetchModuleHelp(moduleKey, lang);
      setData(row);
      setForm({
        title: row?.title || '',
        description: row?.description || '',
        video_url: row?.video_url || '',
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [moduleKey, lang]);

  useEffect(() => {
    if (isOpen) {
      setEditing(false);
      setUploadProgress(0);
      load();
    }
  }, [isOpen, load]);

  const handleSave = async () => {
    // Title is the only required field — module_key + lang come from props,
    // video_url and description are optional. Trim before checking so a row
    // of spaces doesn't pass.
    if (!String(form.title ?? '').trim()) {
      swalError(t('moduleHelp.errTitleRequired', 'Title-ka waa lagama maarmaan'));
      return;
    }
    // If the user pasted a video URL, validate it's a real URL — otherwise
    // the embed render will silently fail at view time.
    const url = String(form.video_url ?? '').trim();
    if (url && !/^https?:\/\//i.test(url)) {
      swalError(t('moduleHelp.errUrlInvalid', 'Video URL waa inuu ku bilaabmaa http:// ama https://'));
      return;
    }
    setSaving(true);
    try {
      await saveModuleHelp({
        mh_id: data?.mh_id || 0,
        module_key: moduleKey,
        lang,
        title: form.title,
        description: form.description,
        video_url: form.video_url,
        oper: 'insert', // backend SP upserts via ON CONFLICT
      });
      await swalSuccess(t('swal.titles.success'), t('swal.texts.saved'));
      setEditing(false);
      await load();
    } catch (err) {
      swalError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
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

  const videoUrl = form.video_url || data?.video_url || '';
  const displayTitle = data?.title || moduleLabel || moduleKey;
  const displayDesc = data?.description || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={editing ? t('help.editTitle', { defaultValue: 'Edit Module Help' }) : displayTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
          {editing ? (
            <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} disabled={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          ) : (
            <Button variant="primary" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => setEditing(true)}>
              {t('help.edit', { defaultValue: 'Edit' })}
            </Button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="py-10 text-center text-slate-500">{t('common.loading')}</div>
      ) : editing ? (
        <div className="space-y-4">
          <Input
            label={t('help.title', { defaultValue: 'Title' })}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={moduleLabel || moduleKey}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              {t('help.description', { defaultValue: 'Description / Usage' })}
            </label>
            <textarea
              className="w-full min-h-[140px] rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('help.descriptionPlaceholder', { defaultValue: 'Qor sharaxaadda module-ka…' })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Youtube className="w-4 h-4" />
                {t('help.videoUrl', { defaultValue: 'Video URL (YouTube / Vimeo)' })}
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f3d5e]"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Upload className="w-4 h-4" />
                {t('help.uploadVideo', { defaultValue: 'Upload video file' })}
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
                <p className="mt-1 text-xs text-emerald-600">
                  {t('help.uploaded', { defaultValue: 'Video uploaded' })}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {displayDesc ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{displayDesc}</p>
          ) : (
            <p className="text-sm italic text-slate-400">
              {t('help.empty', { defaultValue: 'Wali sharaxaad ma jirto. Guji "Edit" si aad u darto.' })}
            </p>
          )}

          {videoUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
              {isLocalFile(videoUrl) ? (
                <video src={resolveMediaUrl(videoUrl)} controls className="w-full max-h-[55vh] bg-black" />
              ) : (
                <div className="aspect-video">
                  <iframe
                    src={toEmbedUrl(videoUrl)}
                    title="help-video"
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
  );
}

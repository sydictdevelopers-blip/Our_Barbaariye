import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  RefreshCw,
  Camera,
  Search,
  Upload,
  ImageOff,
  CheckCircle2,
} from 'lucide-react';
import Card from '../../../components/ui/Card';
import { dedupeRequest, fetchDataPaginated } from '../../../services/api';
import { swalError } from '../../../utils/swal';
import { resizeImageToBudget } from '../../../utils/resizeImage';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Sawirka muunada (placeholder) ee la tuso ardayda aan sawir lahayn ama
// kuwa weli image-kooda S3 looga shubin.
const SAMPLE_IMAGE = 'https://barbaariyesystem.syddb.com/assets/img/SampleImages.jpg';

/**
 * Inline panel oo lagu shubo sawirrada ardayda fasalka.
 *
 * Auto-upload pattern: marka file la doorto, isla saacaddaas ayaa S3-da
 *   loogu kor shubaa (parallel haddii rows badan la kala doorto).
 *   Ma jiro UPDATE DATA button — staging ma jirto.
 */
export default function StudentImagesPanel({ cl_id, b_id, a_y_id, onClose }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState({}); // { stdId: { previewUrl } } — active in-flight uploads
  const [search, setSearch] = useState('');
  // Windowed rendering: kaliya N row la xayuubiyo DOM-ka mar walba — si rows
  // 16k+ ah aanay browser-ka u qabowin. La kordhinayaa marka scroll bottom-ka
  // la gaadho.
  const PAGE_CHUNK = 200;
  const [displayLimit, setDisplayLimit] = useState(PAGE_CHUNK);
  const uploadsRef = useRef({});
  const inFlightRef = useRef(false);

  const filtersReady = !!(cl_id && b_id && a_y_id);

  // Tirtir blob URL-yada haddii panel-ka la furo iyada oo upload socoto
  useEffect(() => () => {
    Object.values(uploadsRef.current).forEach((v) => v?.previewUrl && URL.revokeObjectURL(v.previewUrl));
  }, []);

  const loadRows = useMemo(
    () => async () => {
      if (!filtersReady) return;
      // Hal request keliya kii hore wuxuu socdo, kuwa kale ka leexso.
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setLoading(true);
      try {
        const key = `StudentImages:${cl_id}:${b_id}:${a_y_id}`;
        const res = await dedupeRequest(key, () => fetchDataPaginated({
          queryName: 'StudentImages',
          page: 1,
          limit: 1000,
          cl_id,
          b_id,
          a_y_id,
        }));
        const list = (res?.data ?? []).filter((r) => r.id != null);
        setRows(list);
      } catch (err) {
        swalError(t('swal.titles.error'), err.message);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [cl_id, b_id, a_y_id, filtersReady, t]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadRows();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [loadRows]);

  const beginUpload = (stdId, previewUrl) => {
    setUploads((prev) => {
      // Tirtir blob URL-kii hore ee row-gan haddii uu jiro
      if (prev[stdId]?.previewUrl) URL.revokeObjectURL(prev[stdId].previewUrl);
      const next = { ...prev, [stdId]: { previewUrl } };
      uploadsRef.current = next;
      return next;
    });
  };

  const finishUpload = (stdId) => {
    setUploads((prev) => {
      if (prev[stdId]?.previewUrl) URL.revokeObjectURL(prev[stdId].previewUrl);
      const next = { ...prev };
      delete next[stdId];
      uploadsRef.current = next;
      return next;
    });
  };

  const uploadOne = async (stdId, file) => {
    if (!file) return;
    const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png'];
    const ALLOWED_EXT = /\.(jpe?g|png)$/i;
    const MAX_BYTES = 300 * 1024;
    if (!ALLOWED_MIME.includes(String(file.type || '').toLowerCase()) || !ALLOWED_EXT.test(file.name || '')) {
      swalError(t('studentImages.errOnlyImages', { defaultValue: 'Only JPG, JPEG, or PNG images are allowed' }));
      return;
    }
    // Auto-resize oversized photos client-side instead of rejecting them —
    // phone cameras routinely produce 3–10 MB files and we cap at 300 KB.
    let uploadFile = file;
    if (file.size > MAX_BYTES) {
      try {
        uploadFile = await resizeImageToBudget(file, MAX_BYTES);
      } catch {
        swalError(t('studentImages.errFileTooLarge', { defaultValue: 'Image must be smaller than 300 KB' }));
        return;
      }
    }
    const previewUrl = URL.createObjectURL(uploadFile);
    beginUpload(stdId, previewUrl);
    try {
      const fd = new FormData();
      fd.append('std_id', String(stdId));
      fd.append('file', uploadFile);
      const resp = await fetch(`${API_BASE}/student-image/upload`, { method: 'POST', body: fd });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) throw new Error(json?.error || 'Upload failed');
      setRows((prev) => prev.map((r) => (
        r.id === stdId ? { ...r, image: json.image, is_default: false } : r
      )));
    } catch (err) {
      swalError(t('swal.titles.error'), `#${stdId}: ${err.message}`);
    } finally {
      finishUpload(stdId);
    }
  };

  const uploadingCount = Object.keys(uploads).length;
  const withImageCount = useMemo(
    () => rows.filter((r) => r.image && !r.is_default).length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (
      String(r.id).includes(q) ||
      String(r.student_name || '').toLowerCase().includes(q)
    ));
  }, [rows, search]);

  // Marka rows ama search-ku bedelo, dib u dhig limit-ka displayed-ka.
  useEffect(() => { setDisplayLimit(PAGE_CHUNK); }, [search, rows]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, displayLimit),
    [filteredRows, displayLimit]
  );

  // Scroll handler: marka user-ku gaadho 80%-ka container-ka, kordhi limit-ka
  // si soo-shubid-bilow-ah loo helo (infinite-scroll fudud, ma jiraan deps cusub).
  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight * 0.8) {
      setDisplayLimit((prev) => (prev < filteredRows.length ? prev + PAGE_CHUNK : prev));
    }
  }, [filteredRows.length]);

  return (
    <Card className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-slate-200/80 dark:ring-slate-700/70 bg-white dark:bg-slate-900/90">
      {/* Header */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-[#0f3d5e] via-[#15507a] to-[#1a6296] text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight">
                {t('studentImages.title')}
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                {t('studentImages.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadRows}
              disabled={loading || uploadingCount > 0}
              className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t('studentImages.refresh')}
              title={t('studentImages.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
                aria-label={t('studentImages.close')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[11px] font-medium">
            <span className="opacity-80">{t('studentImages.statTotal')}</span>
            <span className="font-bold">{rows.length}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 ring-1 ring-emerald-300/30 text-[11px] font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span className="opacity-90">{t('studentImages.statWithPhoto')}</span>
            <span className="font-bold">{withImageCount}</span>
          </span>
          {uploadingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/25 ring-1 ring-amber-200/40 text-[11px] font-semibold">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{t('studentImages.statUploading')}</span>
              <span className="font-bold">{uploadingCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="student-image-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('studentImages.searchPlaceholder')}
            className="w-full ps-9 pe-9 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a6296]/30 focus:border-[#1a6296]/50 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
              aria-label="clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List body */}
      <div className="overflow-auto max-h-[60vh]" onScroll={handleScroll}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1a6296]" />
            <span className="text-sm">{t('studentImages.loading')}</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <ImageOff className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <span className="text-sm">
              {rows.length === 0 ? t('studentImages.noStudents') : t('studentImages.noMatch')}
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/60 dark:divide-slate-700/50">
            {visibleRows.map((r) => {
              const inputId = `student-image-file-${r.id}`;
              const upload = uploads[r.id];
              const isUploading = !!upload;
              const hasImage = !!(r.image && !r.is_default);
              const avatarSrc = upload?.previewUrl
                || (hasImage ? r.image : SAMPLE_IMAGE);
              return (
                <li
                  key={r.id}
                  className={`group flex items-center gap-4 px-5 py-3 transition relative ${
                    isUploading
                      ? 'bg-amber-50/70 dark:bg-amber-900/15'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {isUploading && (
                    <span className="absolute start-0 top-0 bottom-0 w-1 bg-amber-400" />
                  )}

                  <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[2.75rem] h-6 px-2 rounded text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                    {r.id}
                  </span>

                  <div className="relative flex-shrink-0">
                    <img
                      src={avatarSrc}
                      alt=""
                      className={`w-12 h-12 rounded-full object-cover bg-slate-100 dark:bg-slate-800 ring-2 transition ${
                        isUploading
                          ? 'ring-amber-400 opacity-70'
                          : hasImage
                          ? 'ring-emerald-300/70 dark:ring-emerald-700/50'
                          : 'ring-slate-200 dark:ring-slate-700'
                      }`}
                      onError={(e) => { e.currentTarget.src = SAMPLE_IMAGE; }}
                      loading="lazy"
                    />
                    {isUploading && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-amber-700 animate-spin drop-shadow" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {r.student_name}
                    </div>
                    {isUploading && (
                      <div className="mt-0.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                        {t('studentImages.uploading')}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <label
                      htmlFor={inputId}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ring-1 ${
                        isUploading
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 ring-amber-300 dark:ring-amber-700 cursor-not-allowed'
                          : hasImage
                          ? 'cursor-pointer bg-white dark:bg-slate-800 text-[#0f3d5e] dark:text-slate-100 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                          : 'cursor-pointer bg-[#0f3d5e] text-white ring-[#0f3d5e] hover:bg-[#0b3052]'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          {t('studentImages.uploading')}
                        </>
                      ) : hasImage ? (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          {t('studentImages.replace')}
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          {t('studentImages.choose')}
                        </>
                      )}
                      <input
                        id={inputId}
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) uploadOne(r.id, file);
                        }}
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

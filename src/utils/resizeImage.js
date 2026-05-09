/**
 * Browser-side image resizer. Loads a File via <img>, draws to a <canvas>, and
 * iteratively shrinks dimensions + JPEG quality until the result fits a byte
 * budget (default 300 KB). Designed for student photo uploads where the
 * backend hard-caps at 300 KB — instead of rejecting big phone photos, we
 * down-sample and let the upload succeed.
 *
 * Returns a NEW File object (jpeg) preserving the original name's stem with a
 * `.jpg` extension. PNG sources are converted to JPEG so quality knob applies.
 *
 * Notes:
 *   - PNG transparency is replaced with white (canvas default) — acceptable
 *     for ID photos, not ideal for icons/logos. Caller can opt out by passing
 *     a smaller `maxBytes`-equal-to-Infinity to skip resizing.
 *   - Output is always `image/jpeg` because PNG offers no quality knob and
 *     would defeat the size budget for photographs.
 */

const DEFAULT_MAX_BYTES = 300 * 1024;       // 300 KB
const MIN_QUALITY = 0.45;                    // floor — below this artifacts dominate
const MIN_DIMENSION = 480;                   // floor for short edge (face still recognizable)
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, MIN_QUALITY];
const SIZE_STEPS = [1, 0.85, 0.7, 0.6, 0.5, 0.42];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function drawToCanvas(img, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  // White background under transparent PNGs so JPEG output isn't black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

function jpegName(originalName) {
  const base = String(originalName || 'image').replace(/\.[^.]+$/, '');
  return `${base || 'image'}.jpg`;
}

/**
 * Resize a File so it fits under maxBytes. If already small enough, returns
 * the original file untouched (no quality loss for already-compliant photos).
 */
export async function resizeImageToBudget(file, maxBytes = DEFAULT_MAX_BYTES) {
  if (!file || file.size <= maxBytes) return file;

  const img = await loadImage(file);
  const shortEdge = Math.min(img.naturalWidth, img.naturalHeight);

  // Walk the size grid first (preserves quality), then drop quality if still big.
  for (const sizeScale of SIZE_STEPS) {
    if (shortEdge * sizeScale < MIN_DIMENSION && sizeScale < 1) continue;
    const canvas = drawToCanvas(img, sizeScale);
    for (const q of QUALITY_STEPS) {
      // eslint-disable-next-line no-await-in-loop
      const blob = await canvasToBlob(canvas, q);
      if (blob && blob.size <= maxBytes) {
        return new File([blob], jpegName(file.name), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
    }
  }

  // Last resort: smallest scale + lowest quality even if still over budget. The
  // backend will then reject with a clear message; better than failing silently.
  const canvas = drawToCanvas(img, SIZE_STEPS[SIZE_STEPS.length - 1]);
  const blob = await canvasToBlob(canvas, MIN_QUALITY);
  return new File([blob], jpegName(file.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

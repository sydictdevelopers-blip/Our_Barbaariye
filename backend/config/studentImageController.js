/**
 * studentImageController.js
 *
 * Habraac upload sawirka ardayda (S3) iyo cusboonaysiinta `student.image`.
 * Endpoint-ka: POST /api/student-image/upload  (multipart: std_id, file)
 *
 * S3 settings (kuxi `.env`):
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_BASE
 *
 * Performance: kaliya in-memory (multer.memoryStorage) → toos S3 → ma jiro
 * disk write oo nidaamka soo culeysiya.
 *
 * Replace flow: marka student-ku hore u leeyahay sawir S3 ah, kii hore
 * waxaa la tirtirayaa S3 kahor in la kor u shubo kii cusub — si aanan u
 * keydin sawirro la diiday.
 */
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const db = require('./db');
const { requireAuth } = require('./auth');

const S3_FOLDER = 'Barbaare_v10_demo';

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

// Allow only JPG/JPEG/PNG (by both MIME and extension) and cap at 300 KB.
// Both checks run server-side as the source of truth — frontend `accept`
// attribute is just a UX hint that users can bypass.
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_IMAGE_EXT = /\.(jpe?g|png)$/i;
const MAX_IMAGE_BYTES = 300 * 1024; // 300 KB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    const mimeOk = ALLOWED_IMAGE_MIME.includes(String(file.mimetype || '').toLowerCase());
    const extOk = ALLOWED_IMAGE_EXT.test(file.originalname || '');
    if (!mimeOk || !extOk) {
      return cb(new Error('Only JPG, JPEG, or PNG images are allowed'));
    }
    cb(null, true);
  },
});

/** Sanitize filename: keep base + extension, strip path/special chars. */
function sanitizeFilename(name) {
  const base = String(name || 'image').split(/[\\/]/).pop();
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 100) || 'image';
}

/** Build S3 key in format: Barbaare_v10_demo/{stdId}_{filename} */
function buildKey(stdId, originalName) {
  return `${S3_FOLDER}/${stdId}_${sanitizeFilename(originalName)}`;
}

/**
 * If `imageUrl` points to an object in our own S3 bucket, return its Key
 * so we can delete it. Otherwise return null (e.g. external URL or empty).
 */
function s3KeyFromUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const publicBase = process.env.S3_PUBLIC_BASE
    || `https://${bucket}.s3.${region}.amazonaws.com`;
  // Two URL forms AWS publishes:
  //   virtual-hosted: https://{bucket}.s3.{region}.amazonaws.com/{key}
  //   path-style:     https://s3.{region}.amazonaws.com/{bucket}/{key}
  const candidates = [
    publicBase.replace(/\/$/, '') + '/',
    `https://${bucket}.s3.${region}.amazonaws.com/`,
    `https://s3.${region}.amazonaws.com/${bucket}/`,
  ];
  for (const prefix of candidates) {
    if (imageUrl.startsWith(prefix)) {
      return decodeURIComponent(imageUrl.slice(prefix.length));
    }
  }
  return null;
}

async function deleteOldImage(stdId) {
  const r = await db.query('SELECT image FROM student WHERE std_id = $1', [stdId]);
  const oldUrl = r.rows[0]?.image;
  const oldKey = s3KeyFromUrl(oldUrl);
  if (!oldKey) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: oldKey }));
  } catch (err) {
    // Tirtirka oo fashilma ma joojiyo upload-ka cusub — kaliya log-ku qor.
    console.warn('[student-image] failed to delete old object', oldKey, err.message);
  }
}

/**
 * POST /api/student-image/upload-new — upload sawir hore-u-soo-shubid arday-cusub.
 * Loo isticmaalo registration-form-ka (waqtigan std_id weli ma jiro). Wuxuu soo
 * celiyaa { ok, image: '<public-url>' } oo form-ku ku kaydiya `image_sp`.
 *
 * Magaca S3 key-ga: Barbaare_v10_demo/_pending/<timestamp>_<random>_<filename>
 * — magac aan kuli karin si aanan u qaldin sawirka kuwa hore.
 */
async function handleUploadNew(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const Bucket = process.env.S3_BUCKET;
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const Key = `${S3_FOLDER}/_pending/${ts}_${rand}_${sanitizeFilename(req.file.originalname)}`;

    await s3.send(new PutObjectCommand({
      Bucket,
      Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const base = process.env.S3_PUBLIC_BASE
      || `https://${Bucket}.s3.${process.env.S3_REGION}.amazonaws.com`;
    const publicUrl = `${base.replace(/\/$/, '')}/${Key}`;
    res.json({ ok: true, image: publicUrl });
  } catch (err) {
    console.error('[student-image/upload-new]', err.message);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

async function handleUpload(req, res) {
  try {
    const stdId = Number(req.body?.std_id);
    if (!stdId || stdId <= 0) {
      return res.status(400).json({ error: 'std_id is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Tirtir kii hore haddii uu jiro S3-da bucket-keenna
    await deleteOldImage(stdId);

    const Bucket = process.env.S3_BUCKET;
    const Key = buildKey(stdId, req.file.originalname);

    await s3.send(new PutObjectCommand({
      Bucket,
      Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const base = process.env.S3_PUBLIC_BASE
      || `https://${Bucket}.s3.${process.env.S3_REGION}.amazonaws.com`;
    const publicUrl = `${base.replace(/\/$/, '')}/${Key}`;

    await db.query('UPDATE student SET image = $1 WHERE std_id = $2', [publicUrl, stdId]);

    res.json({ ok: true, std_id: stdId, image: publicUrl });
  } catch (err) {
    console.error('[student-image/upload]', err.message);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

// Multer rejects oversized / wrong-format files via cb(err) — Express forwards
// them as plain 500s with cryptic messages. This wrapper translates the most
// common multer errors into a friendly JSON response with the right status.
function uploadOrRespond(field) {
  const handler = upload.single(field);
  return (req, res, next) => handler(req, res, (err) => {
    if (!err) return next();
    let msg = err.message || 'Upload failed';
    let status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      msg = 'Image must be smaller than 300 KB';
      status = 413;
    }
    return res.status(status).json({ error: msg });
  });
}

function register(app) {
  // requireAuth runs first so unauth'd uploads get rejected before multer
  // buffers the (potentially large) file in memory.
  app.post('/api/student-image/upload', requireAuth, uploadOrRespond('file'), handleUpload);
  app.post('/api/student-image/upload-new', requireAuth, uploadOrRespond('file'), handleUploadNew);
}

module.exports = { register };

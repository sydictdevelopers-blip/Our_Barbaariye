/**
 * moduleHelpController.js
 * ─────────────────────────────────────────────────────────────
 * API-ga Module Help:
 *  - GET  /api/module-help           → dhamaan records
 *  - GET  /api/module-help/:key      → hal module (luuqad kasta)
 *  - GET  /api/module-help/:key/:lang → hal module + hal luuqad
 *  - POST /api/module-help           → kaydi/cusboonaysii (upsert)
 *  - DELETE /api/module-help/:id     → tirtir
 *  - POST /api/module-help/upload-video → upload video file → soo celi URL
 *
 * Videos-ka waxaa lagu kaydiyaa backend/uploads/videos/
 * oo sidii static laga adeegi karo /uploads/videos/<filename>
 */

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const VIDEO_DIR = path.join(UPLOAD_ROOT, 'videos');

if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

const ALLOWED_VIDEO_MIME = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_DIR),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
    const base = path
      .basename(file.originalname || 'video', path.extname(file.originalname || ''))
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .slice(0, 40);
    const stamp = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${stamp}${safeExt || '.mp4'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Video format-ka lama taageerin: ' + file.mimetype));
  },
});

async function listAll(_req, res) {
  try {
    const { rows } = await db.query('SELECT * FROM module_help ORDER BY module_key, lang');
    res.json({ data: rows });
  } catch (err) {
    console.error('[module-help] list:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getByKey(req, res) {
  try {
    const { key } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM module_help WHERE module_key = $1 ORDER BY lang',
      [key]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[module-help] getByKey:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getByKeyLang(req, res) {
  try {
    const { key, lang } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM module_help WHERE module_key = $1 AND lang = $2 LIMIT 1',
      [key, lang]
    );
    res.json({ data: rows[0] || null });
  } catch (err) {
    console.error('[module-help] getByKeyLang:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function upsert(req, res) {
  try {
    const {
      mh_id = 0,
      module_key,
      lang = 'so',
      title = '',
      description = '',
      video_url = '',
      oper = 'insert',
    } = req.body || {};

    if (!module_key) {
      return res.status(400).json({ error: 'module_key waa lagama-maarmaan' });
    }

    const { rows } = await db.query(
      'SELECT module_help_sp($1,$2,$3,$4,$5,$6,$7) AS result',
      [
        Number(mh_id) || 0,
        String(module_key).trim(),
        String(lang).trim() || 'so',
        String(title || ''),
        String(description || ''),
        String(video_url || ''),
        String(oper).trim().toLowerCase(),
      ]
    );
    res.json({ success: true, message: rows[0]?.result || 'saved' });
  } catch (err) {
    console.error('[module-help] upsert:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'SELECT module_help_sp($1, $2, $3, $4, $5, $6, $7) AS result',
      [Number(id) || 0, '', 'so', '', '', '', 'delete']
    );
    res.json({ success: true, message: rows[0]?.result || 'deleted' });
  } catch (err) {
    console.error('[module-help] remove:', err.message);
    res.status(500).json({ error: err.message });
  }
}

function uploadVideo(req, res) {
  upload.single('video')(req, res, (err) => {
    if (err) {
      console.error('[module-help] upload:', err.message);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Ma jirto file la diray' });
    }
    const url = `/uploads/videos/${req.file.filename}`;
    res.json({ success: true, url, filename: req.file.filename, size: req.file.size });
  });
}

function registerModuleHelpRoutes(app) {
  // Static serve for uploaded videos
  const express = require('express');
  app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d' }));

  app.get('/api/module-help', listAll);
  app.get('/api/module-help/:key', getByKey);
  app.get('/api/module-help/:key/:lang', getByKeyLang);
  app.post('/api/module-help', upsert);
  app.delete('/api/module-help/:id', remove);
  app.post('/api/module-help/upload-video', uploadVideo);

  // Aliases marka proxy-ga /api saaro
  app.get('/module-help', listAll);
  app.get('/module-help/:key', getByKey);
  app.get('/module-help/:key/:lang', getByKeyLang);
  app.post('/module-help', upsert);
  app.delete('/module-help/:id', remove);
  app.post('/module-help/upload-video', uploadVideo);
}

module.exports = { registerModuleHelpRoutes };

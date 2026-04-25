-- ═══════════════════════════════════════════════════════════════════
-- MODULE HELP — sharaxaad + video module walba oo system-ka ah
-- ═══════════════════════════════════════════════════════════════════
-- Jadwal kaliya oo qeexaya:
--   module_key  — magaca module-ka (e.g. 'ClassSetup', 'Students')
--   lang        — luuqada ('so' | 'en' | 'ar')
--   title       — cinwaan gaaban
--   description — sharaxaad dheer (waxa module-ku qabto / sida loo isticmaalo)
--   video_url   — URL video-ga (YouTube/Vimeo ama /uploads/videos/xxx.mp4)
-- Hal record ayaa loo hayaa module_key + lang combination gaar ah.

CREATE TABLE IF NOT EXISTS module_help (
  mh_id        SERIAL PRIMARY KEY,
  module_key   VARCHAR(100) NOT NULL,
  lang         VARCHAR(5)   NOT NULL DEFAULT 'so',
  title        VARCHAR(255),
  description  TEXT,
  video_url    TEXT,
  updated_at   TIMESTAMP    DEFAULT NOW(),
  UNIQUE(module_key, lang)
);

-- ─── CRUD SP ─────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS module_help_sp(INT,VARCHAR,VARCHAR,VARCHAR,TEXT,TEXT,VARCHAR);

CREATE OR REPLACE FUNCTION module_help_sp(
  mh_id_sp        INTEGER,
  module_key_sp   VARCHAR,
  lang_sp         VARCHAR,
  title_sp        VARCHAR,
  description_sp  TEXT,
  video_url_sp    TEXT,
  oper            VARCHAR
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_lang VARCHAR(5) := COALESCE(NULLIF(TRIM(lang_sp), ''), 'so');
BEGIN
  IF oper = 'insert' THEN
    INSERT INTO module_help(module_key, lang, title, description, video_url, updated_at)
    VALUES (module_key_sp, v_lang, title_sp, description_sp, video_url_sp, NOW())
    ON CONFLICT (module_key, lang)
    DO UPDATE SET
      title       = EXCLUDED.title,
      description = EXCLUDED.description,
      video_url   = EXCLUDED.video_url,
      updated_at  = NOW();
    RETURN 'saved';

  ELSIF oper = 'update' THEN
    UPDATE module_help
       SET module_key  = COALESCE(NULLIF(TRIM(module_key_sp), ''), module_key),
           lang        = v_lang,
           title       = title_sp,
           description = description_sp,
           video_url   = video_url_sp,
           updated_at  = NOW()
     WHERE mh_id = mh_id_sp;
    RETURN 'updated';

  ELSIF oper = 'delete' THEN
    DELETE FROM module_help WHERE mh_id = mh_id_sp;
    RETURN 'deleted';
  END IF;
  RETURN 'no operation';
END;
$$;

-- ─── Show SP (liiska dhamaan) ────────────────────────────────────────
DROP FUNCTION IF EXISTS module_help_show();

CREATE OR REPLACE FUNCTION module_help_show()
RETURNS TABLE (
  mh_id       INTEGER,
  module_key  VARCHAR,
  lang        VARCHAR,
  title       VARCHAR,
  description TEXT,
  video_url   TEXT,
  updated_at  TIMESTAMP
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT mh.mh_id, mh.module_key, mh.lang, mh.title, mh.description, mh.video_url, mh.updated_at
    FROM module_help mh
   ORDER BY mh.module_key, mh.lang;
END;
$$;

-- ─── Test ────────────────────────────────────────────────────────────
-- SELECT module_help_sp(0, 'ClassSetup', 'so', 'Fasallada',
--   'Halkan waxaa lagu dejiyaa fasallada dugsiga…', '', 'insert');
-- SELECT * FROM module_help_show();

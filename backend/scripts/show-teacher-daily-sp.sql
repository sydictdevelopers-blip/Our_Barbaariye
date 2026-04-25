-- ═══════════════════════════════════════════════════════════════════
-- SHOW TEACHER SYLLABUS (PostgreSQL function)
-- show_teacher_daily_sp(cls, subj, academic)
-- ═══════════════════════════════════════════════════════════════════
-- Used by front-end: TeacherSyllabusTab.jsx (queryName = 'TeacherSyllabus').
-- Returns syllabus rows driven by `lesson_plan`. If no records match,
-- RETURN QUERY returns empty — the frontend handles the "no data" case.
--
-- Joins:
--   lesson_plan td
--     JOIN employee       e   ON e.emp_id     = td.emp_id
--     JOIN subject_class  sc  ON sc.sub_cl_id = td.sub_cl_id
--     JOIN subjects       su  ON su.sub_id    = sc.sub_id
--     JOIN class          c   ON c.cl_id      = sc.cl_id
--   WHERE c.cl_id       = p_cls
--     AND sc.sub_cl_id  = p_subj
--     AND sc.a_y_id     = p_academic
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS show_teacher_daily_sp(INT, INT, INT);

CREATE OR REPLACE FUNCTION show_teacher_daily_sp(
  p_cls       INT,
  p_subj      INT,
  p_academic  INT
)
RETURNS TABLE(
  id          INT,
  emp_id      INT,
  sub_cl_id   INT,
  subject     VARCHAR,
  class       VARCHAR,
  chapter     VARCHAR,
  topic       TEXT,
  page        VARCHAR,
  description TEXT,
  reg_date    DATE
)
LANGUAGE plpgsql
AS $BODY$
BEGIN
  RETURN QUERY
  SELECT
    td.l_p_id                 AS id,
    td.emp_id                 AS emp_id,
    td.sub_cl_id              AS sub_cl_id,
    su.name::VARCHAR          AS subject,
    c.class::VARCHAR          AS class,
    td.chap_id::VARCHAR       AS chapter,
    td.topic::TEXT            AS topic,
    td.page::VARCHAR          AS page,
    td.description::TEXT      AS description,
    td.reg_date::DATE         AS reg_date
  FROM lesson_plan td
  INNER JOIN employee      e  ON e.emp_id     = td.emp_id
  INNER JOIN subject_class sc ON sc.sub_cl_id = td.sub_cl_id
  INNER JOIN subjects      su ON su.sub_id    = sc.sub_id
  INNER JOIN class         c  ON c.cl_id      = sc.cl_id
  WHERE c.cl_id      = p_cls
    AND sc.sub_cl_id = p_subj
    AND sc.a_y_id    = p_academic
  ORDER BY td.reg_date DESC, td.l_p_id DESC;
END;
$BODY$;

-- ═══════════════════════════════════════════════════════════════════
-- Tijaabi (test)
-- ═══════════════════════════════════════════════════════════════════
-- SELECT * FROM show_teacher_daily_sp(1, 1, 1);

-- ═══════════════════════════════════════════════════════════════════
-- ALTERNATIVE: "Result" column variant (la mid ah MySQL alerts behavior)
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS show_teacher_daily_alert_sp(INT, INT, INT);

CREATE OR REPLACE FUNCTION show_teacher_daily_alert_sp(
  p_cls       INT,
  p_subj      INT,
  p_academic  INT
)
RETURNS TABLE(result TEXT)
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(td.l_p_id) INTO v_count
  FROM lesson_plan td
  INNER JOIN subject_class sc ON sc.sub_cl_id = td.sub_cl_id
  INNER JOIN class         c  ON c.cl_id      = sc.cl_id
  WHERE c.cl_id      = p_cls
    AND sc.sub_cl_id = p_subj
    AND sc.a_y_id    = p_academic;

  IF v_count = 0 THEN
    RETURN QUERY
    SELECT a.body::TEXT FROM alerts a WHERE a.title = 'notfound' LIMIT 1;
  END IF;
END;
$BODY$;

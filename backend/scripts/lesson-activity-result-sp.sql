-- ═══════════════════════════════════════════════════════════════════
-- LESSON ACTIVITY RESULT — table + 3 stored procedures
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_activity_result (
  lar_id         SERIAL PRIMARY KEY,
  ac_t_id        INTEGER NOT NULL REFERENCES lesson_activity(ac_t_id) ON DELETE CASCADE,
  std_cl_id      INTEGER NOT NULL REFERENCES student_class(std_cl_id),
  marks_obtained NUMERIC  DEFAULT 0,
  state          VARCHAR(50) DEFAULT 'Active',
  reg_date       TIMESTAMP   DEFAULT NOW(),
  UNIQUE(ac_t_id, std_cl_id)
);

-- ─── 2. CRUD SP ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS lesson_activity_result_sp(INT,INT,INT,NUMERIC,VARCHAR,VARCHAR);

CREATE OR REPLACE FUNCTION lesson_activity_result_sp(
  lar_id_sp    INTEGER,
  ac_t_id_sp   INTEGER,
  std_cl_id_sp INTEGER,
  marks_sp     NUMERIC,
  state_sp     VARCHAR,
  oper         VARCHAR
) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  IF oper = 'insert' THEN
    INSERT INTO lesson_activity_result(ac_t_id, std_cl_id, marks_obtained, state)
    VALUES (ac_t_id_sp, std_cl_id_sp,
            COALESCE(marks_sp, 0),
            COALESCE(NULLIF(TRIM(state_sp), ''), 'Active'));
    RETURN 'inserted';

  ELSIF oper = 'update' THEN
    UPDATE lesson_activity_result
    SET marks_obtained = COALESCE(marks_sp, 0),
        state          = COALESCE(NULLIF(TRIM(state_sp), ''), 'Active')
    WHERE lar_id = lar_id_sp;
    RETURN 'updated';

  ELSIF oper = 'delete' THEN
    DELETE FROM lesson_activity_result WHERE lar_id = lar_id_sp;
    RETURN 'deleted';
  END IF;
  RETURN 'no operation';
END;
$$;

-- ─── 3. Bulk-populate SP ─────────────────────────────────────────────────────
-- Creates a result row for every student × activity that has no entry yet.
DROP FUNCTION IF EXISTS bulk_lesson_activity_result_sp(INT,INT,INT,INT,VARCHAR);

CREATE OR REPLACE FUNCTION bulk_lesson_activity_result_sp(
  a_y_id_sp    INTEGER,
  cl_id_sp     INTEGER,
  b_id_sp      INTEGER,   -- 0 = all batches
  ex_reg_id_sp INTEGER,   -- 0 = all exams
  oper         VARCHAR
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_count INT := 0;
BEGIN
  INSERT INTO lesson_activity_result (ac_t_id, std_cl_id, marks_obtained, state)
  SELECT la.ac_t_id, sc.std_cl_id, 0, 'Active'
  FROM   lesson_activity  la
  JOIN   subject_class    subcl ON subcl.sub_cl_id = la.sub_cl_id
  JOIN   student_class    sc    ON sc.cl_id = la.cl_id AND sc.a_y_id = a_y_id_sp
  WHERE  la.cl_id       = cl_id_sp
    AND  subcl.a_y_id   = a_y_id_sp
    AND  (b_id_sp     = 0 OR sc.b_id     = b_id_sp)
    AND  (ex_reg_id_sp = 0 OR la.e_r_id  = ex_reg_id_sp)
    AND  NOT EXISTS (
      SELECT 1 FROM lesson_activity_result lar
      WHERE  lar.ac_t_id   = la.ac_t_id
        AND  lar.std_cl_id = sc.std_cl_id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count || ' records added';
END;
$$;

-- ─── 4. Show SP ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS show_lesson_activity_results_sp(INT,INT,INT,INT,INT,INT);

CREATE OR REPLACE FUNCTION show_lesson_activity_results_sp(
  p_a_y_id    INTEGER,
  p_cl_id     INTEGER,
  p_b_id      INTEGER,    -- 0 = all batches
  p_sub_cl_id INTEGER,    -- 0 = all subjects
  p_ac_id     INTEGER,    -- 0 = all activity types
  p_ex_reg_id INTEGER     -- 0 = all exams
) RETURNS TABLE (
  lar_id         INTEGER,
  ac_t_id        INTEGER,
  std_cl_id      INTEGER,
  student_name   VARCHAR,
  batch_name     VARCHAR,
  activity_type  VARCHAR,
  subject_name   VARCHAR,
  max_marks      NUMERIC,
  marks_obtained NUMERIC,
  state          VARCHAR
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(lar.lar_id,          0)::INTEGER  AS lar_id,
    la.ac_t_id::INTEGER,
    sc.std_cl_id::INTEGER,
    p.p_name::VARCHAR                          AS student_name,
    b.batch_name::VARCHAR                      AS batch_name,
    at.type::VARCHAR                           AS activity_type,
    sub.name::VARCHAR                          AS subject_name,
    la.marks::NUMERIC                          AS max_marks,
    COALESCE(lar.marks_obtained, 0)::NUMERIC   AS marks_obtained,
    COALESCE(lar.state, 'Pending')::VARCHAR    AS state
  FROM   lesson_activity  la
  JOIN   activity_type    at    ON at.ac_id       = la.ac_id
  JOIN   subject_class    subcl ON subcl.sub_cl_id = la.sub_cl_id
  JOIN   subjects         sub   ON sub.sub_id      = subcl.sub_id
  JOIN   student_class    sc    ON sc.cl_id        = la.cl_id
                               AND sc.a_y_id       = p_a_y_id
  JOIN   student          st    ON st.std_id        = sc.std_id
  JOIN   people           p     ON p.p_id           = st.p_id
  JOIN   batch            b     ON b.b_id            = sc.b_id
  LEFT JOIN lesson_activity_result lar
         ON lar.ac_t_id   = la.ac_t_id
        AND lar.std_cl_id = sc.std_cl_id
  WHERE  la.cl_id       = p_cl_id
    AND  subcl.a_y_id   = p_a_y_id
    AND  (p_b_id      = 0 OR sc.b_id        = p_b_id)
    AND  (p_sub_cl_id = 0 OR la.sub_cl_id   = p_sub_cl_id)
    AND  (p_ac_id     = 0 OR la.ac_id       = p_ac_id)
    AND  (p_ex_reg_id = 0 OR la.e_r_id      = p_ex_reg_id)
  ORDER BY p.p_name;
END;
$$;

-- ─── Test ────────────────────────────────────────────────────────────────────
-- SELECT * FROM show_lesson_activity_results_sp(1, 1, 0, 0, 0, 0);

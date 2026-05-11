-- HRM migration: schema additions, fixes, seeds, and stored procedures.
-- Idempotent: every CREATE uses OR REPLACE; every ALTER uses IF NOT EXISTS.

BEGIN;

-- 1. Schema additions (additive — safe to re-run) ---------------------------

ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS salary_type VARCHAR(50);

ALTER TABLE employee_vocation
  ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE TABLE IF NOT EXISTS teacher_state (
  ts_id    SERIAL PRIMARY KEY,
  emp_id   INTEGER NOT NULL REFERENCES employee(emp_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  state    VARCHAR(50) NOT NULL,
  reg_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  u_br_id  INTEGER NULL REFERENCES user_branch(u_br_id) ON UPDATE CASCADE ON DELETE RESTRICT
);


-- 2. Seed day table (Saturday..Friday — Somali school week) -----------------

INSERT INTO day (day)
SELECT v FROM (VALUES ('Saturday'),('Sunday'),('Monday'),('Tuesday'),('Wednesday'),('Thursday'),('Friday')) AS x(v)
WHERE NOT EXISTS (SELECT 1 FROM day WHERE day.day = x.v);


-- 3. Fix broken employee_show (column type mismatch on `location`) ---------

DROP FUNCTION IF EXISTS employee_show(INTEGER);
CREATE OR REPLACE FUNCTION employee_show(p_branch_id INTEGER)
RETURNS TABLE(
  emp_id      INTEGER,
  person_name VARCHAR,
  phone       VARCHAR,
  email       VARCHAR,
  sex         VARCHAR,
  job_name    VARCHAR,
  shift_name  VARCHAR,
  emp_type    VARCHAR,
  salary_type VARCHAR,
  salary      NUMERIC,
  degree      VARCHAR,
  hired_date  DATE,
  state       VARCHAR,
  address     VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    em.emp_id,
    p.p_name        AS person_name,
    p.tel           AS phone,
    p.email,
    p.sex,
    j.j_name        AS job_name,
    sh.shift        AS shift_name,
    em.emp_type,
    em.salary_type,
    em.salary,
    em.degree,
    em.hired_date,
    p.state,
    (COALESCE(ad.district,'') || ' - ' || COALESCE(ad.village,''))::VARCHAR AS address
  FROM employee em
  JOIN people p   ON p.p_id   = em.p_id
  LEFT JOIN job j ON j.j_id   = em.j_id
  LEFT JOIN shift sh ON sh.sh_id = em.sh_id
  LEFT JOIN address ad ON ad.add_id = p.ad_id
  WHERE em.br_id = p_branch_id
  ORDER BY p.p_name;
END;
$$ LANGUAGE plpgsql;


-- 4. employee_edit_show — single-row fetch for edit modal -------------------

CREATE OR REPLACE FUNCTION employee_edit_show(p_emp_id INTEGER)
RETURNS TABLE(
  emp_id      INTEGER,
  p_id        INTEGER,
  p_name      VARCHAR,
  tel         VARCHAR,
  email       VARCHAR,
  sex         VARCHAR,
  ad_id       INTEGER,
  address     VARCHAR,
  j_id        INTEGER,
  j_name      VARCHAR,
  sh_id       INTEGER,
  shift_name  VARCHAR,
  emp_type    VARCHAR,
  salary_type VARCHAR,
  salary      NUMERIC,
  degree      VARCHAR,
  hired_date  DATE,
  image       TEXT,
  state       VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    em.emp_id,
    p.p_id,
    p.p_name,
    p.tel,
    p.email,
    p.sex,
    p.ad_id,
    (COALESCE(ad.district,'') || ' - ' || COALESCE(ad.village,''))::VARCHAR AS address,
    em.j_id,
    j.j_name,
    em.sh_id,
    sh.shift AS shift_name,
    em.emp_type,
    em.salary_type,
    em.salary,
    em.degree,
    em.hired_date,
    em.image,
    p.state
  FROM employee em
  JOIN people p ON p.p_id = em.p_id
  LEFT JOIN job j ON j.j_id = em.j_id
  LEFT JOIN shift sh ON sh.sh_id = em.sh_id
  LEFT JOIN address ad ON ad.add_id = p.ad_id
  WHERE em.emp_id = p_emp_id;
END;
$$ LANGUAGE plpgsql;


-- 5. job_sp — CRUD for job rows (was missing) -------------------------------

CREATE OR REPLACE FUNCTION job_sp(
  j_id_sp   INTEGER,
  j_name_sp VARCHAR,
  oper      VARCHAR
) RETURNS TABLE(result VARCHAR) AS $$
DECLARE
  v_count INT;
BEGIN
  IF oper = 'insert' THEN
    SELECT COUNT(*) INTO v_count FROM job WHERE LOWER(TRIM(j_name)) = LOWER(TRIM(j_name_sp));
    IF v_count > 0 THEN
      RETURN QUERY SELECT 'Already Exists'::VARCHAR; RETURN;
    END IF;
    INSERT INTO job (j_name, state) VALUES (j_name_sp, 'Active');
    RETURN QUERY SELECT 'Inserted'::VARCHAR;

  ELSIF oper = 'update' THEN
    SELECT COUNT(*) INTO v_count FROM job WHERE LOWER(TRIM(j_name)) = LOWER(TRIM(j_name_sp)) AND j_id <> j_id_sp;
    IF v_count > 0 THEN
      RETURN QUERY SELECT 'Already Exists'::VARCHAR; RETURN;
    END IF;
    UPDATE job SET j_name = j_name_sp WHERE j_id = j_id_sp;
    RETURN QUERY SELECT 'Updated'::VARCHAR;

  ELSIF oper = 'delete' THEN
    SELECT COUNT(*) INTO v_count FROM employee WHERE j_id = j_id_sp;
    IF v_count > 0 THEN
      RETURN QUERY SELECT 'In Use'::VARCHAR; RETURN;
    END IF;
    DELETE FROM job WHERE j_id = j_id_sp;
    RETURN QUERY SELECT 'Deleted'::VARCHAR;
  ELSE
    RETURN QUERY SELECT 'Unknown Operation'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- 6. employee_sp — combined people + employee CRUD.
-- The legacy 14-arg variant (p_id_sp-based) is dropped; only this 19-arg
-- signature remains so registration goes through one canonical entrypoint.
-- See backend/sql/employee_sp_v3.sql for the up-to-date body.

DROP FUNCTION IF EXISTS public.employee_sp(
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR,
  NUMERIC, VARCHAR, INTEGER, TEXT, TEXT, DATE, INTEGER, VARCHAR
);
DROP FUNCTION IF EXISTS public.employee_sp(
  INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER,
  INTEGER, INTEGER, VARCHAR, VARCHAR, NUMERIC,
  VARCHAR, TEXT, DATE, INTEGER, INTEGER, VARCHAR
);
DROP FUNCTION IF EXISTS public.employee_sp(
  INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER,
  INTEGER, INTEGER, INTEGER, VARCHAR, TEXT,
  NUMERIC, VARCHAR, INTEGER, TEXT, TEXT, DATE, INTEGER, VARCHAR
);

CREATE FUNCTION public.employee_sp(
  emp_id_sp      INTEGER,
  name_sp        TEXT,
  tell_sp        TEXT,
  sex_sp         TEXT,
  email_sp       TEXT,
  add_id_sp      INTEGER,
  sh_id_sp       INTEGER,
  j_id_sp        INTEGER,
  tt_id_sp       INTEGER,
  emp_type_sp    VARCHAR,
  salary_type_sp TEXT,
  salary_sp      NUMERIC,
  degree_sp      VARCHAR,
  br_id_sp       INTEGER,
  cv_sp          TEXT,
  image_sp       TEXT,
  hired_date_sp  DATE,
  u_br_id_sp     INTEGER,
  oper           VARCHAR
) RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  msg        VARCHAR;
  last_p_id  INTEGER;
  v_existing INTEGER;
  v_refs     INTEGER;
  v_tt_id    INTEGER;
BEGIN
  IF oper = 'insert' THEN
    IF EXISTS (SELECT 1 FROM people WHERE p_name = name_sp AND tel = tell_sp) THEN
      SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert' LIMIT 1;
      IF msg IS NULL THEN msg := 'Already exists'; END IF;
      RETURN msg;
    END IF;

    INSERT INTO people (p_name, tel, sex, email, ad_id, state, p_type, reg_date, u_br_id)
    VALUES (name_sp, tell_sp, sex_sp, email_sp, add_id_sp, 'Active', 'employee',
            CURRENT_DATE, u_br_id_sp)
    RETURNING p_id INTO last_p_id;

    v_tt_id := COALESCE(
      NULLIF(tt_id_sp, 0),
      (SELECT tt_id FROM title WHERE LOWER(TRIM(title)) = LOWER(TRIM(emp_type_sp)) LIMIT 1),
      1
    );

    INSERT INTO employee (
      p_id, sh_id, j_id, tt_id, emp_type, salary_type, salary, degree,
      br_id, cv, image, hired_date, u_br_id, reg_date
    ) VALUES (
      last_p_id, sh_id_sp, j_id_sp, v_tt_id, emp_type_sp, salary_type_sp,
      salary_sp, degree_sp, br_id_sp, cv_sp, image_sp,
      COALESCE(hired_date_sp, CURRENT_DATE), u_br_id_sp, CURRENT_DATE
    );

    SELECT body INTO msg FROM alerts WHERE title = 'Insert' LIMIT 1;
    IF msg IS NULL THEN msg := 'Inserted'; END IF;
    RETURN msg;

  ELSIF oper = 'update' THEN
    SELECT p_id INTO v_existing FROM employee WHERE emp_id = emp_id_sp;
    IF v_existing IS NULL THEN
      SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate' LIMIT 1;
      IF msg IS NULL THEN msg := 'Not Registered'; END IF;
      RETURN msg;
    END IF;

    UPDATE people SET
      p_name = name_sp,
      tel    = tell_sp,
      sex    = sex_sp,
      email  = email_sp,
      ad_id  = add_id_sp
    WHERE p_id = v_existing;

    UPDATE employee SET
      sh_id       = sh_id_sp,
      j_id        = j_id_sp,
      tt_id       = COALESCE(NULLIF(tt_id_sp, 0), tt_id),
      emp_type    = emp_type_sp,
      salary_type = salary_type_sp,
      salary      = salary_sp,
      degree      = degree_sp,
      br_id       = br_id_sp,
      cv          = cv_sp,
      image       = COALESCE(NULLIF(image_sp, ''), image),
      hired_date  = COALESCE(hired_date_sp, hired_date),
      u_br_id     = u_br_id_sp
    WHERE emp_id = emp_id_sp;

    SELECT body INTO msg FROM alerts WHERE title = 'Update' LIMIT 1;
    IF msg IS NULL THEN msg := 'Updated'; END IF;
    RETURN msg;

  ELSIF oper = 'delete' THEN
    SELECT p_id INTO v_existing FROM employee WHERE emp_id = emp_id_sp;
    IF v_existing IS NULL THEN
      SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate' LIMIT 1;
      IF msg IS NULL THEN msg := 'Not Registered'; END IF;
      RETURN msg;
    END IF;

    SELECT COUNT(*) INTO v_refs FROM (
      SELECT 1 FROM class_formaster     WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM assign_teacher_room WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM bus                 WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM lesson_plan         WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM subject_class       WHERE emp_id = emp_id_sp
    ) refs;
    IF v_refs > 0 THEN
      RETURN 'In Use — cannot delete (employee has assignments)';
    END IF;

    DELETE FROM teacher_state      WHERE emp_id = emp_id_sp;
    DELETE FROM employee_scheduale WHERE emp_id = emp_id_sp;
    DELETE FROM employee_vocation  WHERE emp_id = emp_id_sp;
    DELETE FROM employee_charge    WHERE emp_id = emp_id_sp;
    DELETE FROM employee           WHERE emp_id = emp_id_sp;

    IF NOT EXISTS (
      SELECT 1 FROM users WHERE p_id = v_existing UNION ALL
      SELECT 1 FROM responsible WHERE p_id = v_existing UNION ALL
      SELECT 1 FROM student WHERE p_id = v_existing UNION ALL
      SELECT 1 FROM certificate WHERE p_id = v_existing UNION ALL
      SELECT 1 FROM idcard WHERE p_id = v_existing
    ) THEN
      DELETE FROM people WHERE p_id = v_existing;
    END IF;

    SELECT body INTO msg FROM alerts WHERE title = 'Delete' LIMIT 1;
    IF msg IS NULL THEN msg := 'Deleted'; END IF;
    RETURN msg;
  END IF;

  RETURN 'Unknown Operation';
END;
$$;


-- 7. teacher_state_sp + view --------------------------------------------------

CREATE OR REPLACE FUNCTION teacher_state_sp(
  ts_id_sp   INTEGER,
  emp_id_sp  INTEGER,
  state_sp   VARCHAR,
  u_br_id_sp INTEGER,
  oper       VARCHAR
) RETURNS TABLE(result VARCHAR) AS $$
BEGIN
  IF oper = 'insert' THEN
    INSERT INTO teacher_state (emp_id, state, u_br_id)
    VALUES (emp_id_sp, state_sp, u_br_id_sp);
    RETURN QUERY SELECT 'Inserted'::VARCHAR;

  ELSIF oper = 'update' THEN
    UPDATE teacher_state
       SET emp_id = emp_id_sp, state = state_sp
     WHERE ts_id = ts_id_sp;
    RETURN QUERY SELECT 'Updated'::VARCHAR;

  ELSIF oper = 'delete' THEN
    DELETE FROM teacher_state WHERE ts_id = ts_id_sp;
    RETURN QUERY SELECT 'Deleted'::VARCHAR;
  ELSE
    RETURN QUERY SELECT 'Unknown Operation'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION teacher_state_show(p_branch_id INTEGER)
RETURNS TABLE(
  ts_id       INTEGER,
  emp_id      INTEGER,
  person_name VARCHAR,
  state       VARCHAR,
  reg_date    TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT ts.ts_id, ts.emp_id, p.p_name AS person_name, ts.state, ts.reg_date
  FROM teacher_state ts
  JOIN employee em ON em.emp_id = ts.emp_id
  JOIN people p    ON p.p_id    = em.p_id
  WHERE em.br_id = p_branch_id
  ORDER BY ts.reg_date DESC;
END;
$$ LANGUAGE plpgsql;


-- 8. employee_vocation_sp / show — replace to support start + end dates -----

CREATE OR REPLACE FUNCTION employee_vocation_sp(
  emp_voc_id_sp  INTEGER,
  emp_id_sp      INTEGER,
  start_date_sp  DATE,
  end_date_sp    DATE,
  type_sp        VARCHAR,
  description_sp VARCHAR,
  u_br_id_sp     INTEGER,
  oper           VARCHAR
) RETURNS TABLE(result VARCHAR) AS $$
BEGIN
  IF oper = 'insert' THEN
    INSERT INTO employee_vocation (emp_id, voc_date, end_date, type, description, reg_date, u_br_id)
    VALUES (emp_id_sp, start_date_sp, end_date_sp, type_sp, description_sp, CURRENT_TIMESTAMP, u_br_id_sp);
    RETURN QUERY SELECT 'Inserted'::VARCHAR;

  ELSIF oper = 'update' THEN
    UPDATE employee_vocation SET
      emp_id      = emp_id_sp,
      voc_date    = start_date_sp,
      end_date    = end_date_sp,
      type        = type_sp,
      description = description_sp
    WHERE emp_voc_id = emp_voc_id_sp;
    RETURN QUERY SELECT 'Updated'::VARCHAR;

  ELSIF oper = 'delete' THEN
    DELETE FROM employee_vocation WHERE emp_voc_id = emp_voc_id_sp;
    RETURN QUERY SELECT 'Deleted'::VARCHAR;
  ELSE
    RETURN QUERY SELECT 'Unknown Operation'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS employee_vocation_show(INTEGER);
CREATE OR REPLACE FUNCTION employee_vocation_show(p_emp_id INTEGER)
RETURNS TABLE(
  emp_voc_id  INTEGER,
  emp_id      INTEGER,
  person_name VARCHAR,
  start_date  DATE,
  end_date    DATE,
  type        VARCHAR,
  description VARCHAR,
  reg_date    TIMESTAMP,
  info        VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ev.emp_voc_id,
    ev.emp_id,
    p.p_name AS person_name,
    ev.voc_date AS start_date,
    ev.end_date,
    ev.type,
    ev.description,
    ev.reg_date,
    (
      COALESCE(ev.type, '') ||
      CASE WHEN ev.voc_date IS NOT NULL THEN ' (' || TO_CHAR(ev.voc_date, 'YYYY-MM-DD') ELSE '' END ||
      CASE WHEN ev.end_date IS NOT NULL THEN ' → ' || TO_CHAR(ev.end_date, 'YYYY-MM-DD') ELSE '' END ||
      CASE WHEN ev.voc_date IS NOT NULL THEN ')' ELSE '' END ||
      CASE WHEN ev.description IS NOT NULL AND ev.description <> '' THEN ' — ' || ev.description ELSE '' END
    )::VARCHAR AS info
  FROM employee_vocation ev
  JOIN employee em ON em.emp_id = ev.emp_id
  JOIN people p    ON p.p_id    = em.p_id
  WHERE ev.emp_id = p_emp_id
  ORDER BY ev.voc_date DESC;
END;
$$ LANGUAGE plpgsql;


-- 9a. employee_schedule_sp — fix legacy SP that referenced wrong table name
-- (the legacy version used `employee_schedule` instead of `employee_scheduale`)

CREATE OR REPLACE FUNCTION employee_schedule_sp(
  emp_sch_id_sp INTEGER,
  emp_id_sp     INTEGER,
  time_in_sp    TIME WITHOUT TIME ZONE,
  time_out_sp   TIME WITHOUT TIME ZONE,
  day_id_sp     INTEGER,
  sh_id_sp      INTEGER,
  state_sp      VARCHAR,
  reg_date_sp   TIMESTAMP WITHOUT TIME ZONE,
  u_br_id_sp    INTEGER,
  language_sp   INTEGER,
  oper_sp       VARCHAR
) RETURNS TEXT AS $$
DECLARE
  v_count INT;
BEGIN
  IF oper_sp = 'insert' THEN
    SELECT COUNT(*) INTO v_count FROM employee_scheduale
     WHERE emp_id = emp_id_sp AND day_id = day_id_sp AND sh_id = sh_id_sp;
    IF v_count > 0 THEN RETURN 'Already Exists'; END IF;
    INSERT INTO employee_scheduale(emp_id, time_in, time_out, day_id, sh_id, state, reg_date, u_br_id)
    VALUES (emp_id_sp, time_in_sp, time_out_sp, day_id_sp, sh_id_sp,
            COALESCE(state_sp, 'Active'),
            COALESCE(reg_date_sp, CURRENT_TIMESTAMP),
            u_br_id_sp);
    RETURN 'Inserted';
  ELSIF oper_sp = 'update' THEN
    UPDATE employee_scheduale SET
      emp_id = emp_id_sp, time_in = time_in_sp, time_out = time_out_sp,
      day_id = day_id_sp, sh_id = sh_id_sp,
      state = COALESCE(state_sp, state)
    WHERE emp_sch_id = emp_sch_id_sp;
    RETURN 'Updated';
  ELSIF oper_sp = 'delete' THEN
    DELETE FROM employee_scheduale WHERE emp_sch_id = emp_sch_id_sp;
    RETURN 'Deleted';
  ELSE
    RETURN 'Unknown Operation';
  END IF;
END;
$$ LANGUAGE plpgsql;


-- 9. employee_schedule_show — filter by employee id, return full row per day -

DROP FUNCTION IF EXISTS employee_schedule_show(INTEGER);
CREATE OR REPLACE FUNCTION employee_schedule_show(p_emp_id INTEGER)
RETURNS TABLE(
  emp_sch_id  INTEGER,
  emp_id      INTEGER,
  day_id      INTEGER,
  day_name    VARCHAR,
  sh_id       INTEGER,
  type        VARCHAR,
  time_in     TIME,
  time_out    TIME,
  total_hours VARCHAR,
  state       VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.emp_sch_id,
    es.emp_id,
    es.day_id,
    d.day AS day_name,
    es.sh_id,
    sh.shift AS type,
    es.time_in,
    es.time_out,
    (
      LPAD(EXTRACT(HOUR   FROM (es.time_out - es.time_in))::TEXT, 2, '0') || ' HOURS ' ||
      LPAD(EXTRACT(MINUTE FROM (es.time_out - es.time_in))::TEXT, 2, '0') || ' MINUTES'
    )::VARCHAR AS total_hours,
    es.state
  FROM employee_scheduale es
  LEFT JOIN day d   ON d.d_id  = es.day_id
  LEFT JOIN shift sh ON sh.sh_id = es.sh_id
  WHERE es.emp_id = p_emp_id
  ORDER BY d.d_id, es.time_in;
END;
$$ LANGUAGE plpgsql;


-- 10. Helpful read-views for dropdowns --------------------------------------

CREATE OR REPLACE FUNCTION job_options_show(p_search TEXT, p_limit INTEGER, p_offset INTEGER)
RETURNS TABLE(j_id INTEGER, j_name VARCHAR, total_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT j.j_id, j.j_name, COUNT(*) OVER() AS total_count
  FROM job j
  WHERE LOWER(TRIM(COALESCE(j.state,''))) = 'active'
    AND (COALESCE(p_search,'') = '' OR j.j_name ILIKE '%' || p_search || '%')
  ORDER BY j.j_name
  LIMIT GREATEST(p_limit, 1) OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION shift_options_show(p_search TEXT, p_limit INTEGER, p_offset INTEGER)
RETURNS TABLE(sh_id INTEGER, shift_name VARCHAR, total_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT sh.sh_id, sh.shift AS shift_name, COUNT(*) OVER() AS total_count
  FROM shift sh
  WHERE COALESCE(p_search,'') = '' OR sh.shift ILIKE '%' || p_search || '%'
  ORDER BY sh.shift
  LIMIT GREATEST(p_limit, 1) OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION day_options_show(p_search TEXT, p_limit INTEGER, p_offset INTEGER)
RETURNS TABLE(d_id INTEGER, day_name VARCHAR, total_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT d.d_id, d.day AS day_name, COUNT(*) OVER() AS total_count
  FROM day d
  WHERE COALESCE(p_search,'') = '' OR d.day ILIKE '%' || p_search || '%'
  ORDER BY d.d_id
  LIMIT GREATEST(p_limit, 1) OFFSET GREATEST(p_offset, 0);
END;
$$ LANGUAGE plpgsql;

COMMIT;

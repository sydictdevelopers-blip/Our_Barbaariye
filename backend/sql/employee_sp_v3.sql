-- employee_sp v3 — user-supplied signature with fixes:
--   • RETURNING p_id INTO last_p_id  (the missing piece in user's draft)
--   • salary_type column added to INSERT INTO employee
--   • UPDATE branch fixed (referenced p_id_sp which was not a parameter; now
--     looks up the linked p_id and updates both people + employee rows)
--   • Delete cascades the employee-owned rows (teacher_state, schedule,
--     vocation, charge) so RESTRICT FKs don't block the operation; "strong"
--     FKs (class_formaster, lesson_plan, subject_class, bus, assign_teacher_room)
--     surface as "In Use" — match prior safety behaviour.
--   • Messages pulled from alerts table; literal fallback if a row is missing.

BEGIN;

-- Drop the 17-arg variant we created earlier (no other overload remains).
DROP FUNCTION IF EXISTS public.employee_sp(
  INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER,
  INTEGER, INTEGER, VARCHAR, VARCHAR, NUMERIC,
  VARCHAR, TEXT, DATE, INTEGER, INTEGER, VARCHAR
);

-- Drop the 19-arg variant if a previous run left it (idempotent re-runs).
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
  -- ============================================================== INSERT ===
  IF oper = 'insert' THEN
    IF EXISTS (
      SELECT 1 FROM people
      WHERE p_name = name_sp AND tel = tell_sp
    ) THEN
      SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert' LIMIT 1;
      IF msg IS NULL THEN msg := 'Already exists'; END IF;
      RETURN msg;
    END IF;

    -- Step 1: insert the person row, capture new p_id via RETURNING.
    INSERT INTO people (p_name, tel, sex, email, ad_id, state, p_type, reg_date, u_br_id)
    VALUES (name_sp, tell_sp, sex_sp, email_sp, add_id_sp, 'Active', 'employee',
            CURRENT_DATE, u_br_id_sp)
    RETURNING p_id INTO last_p_id;

    -- Step 2: resolve title id (fallback: look up by emp_type, else default 1).
    v_tt_id := COALESCE(
      NULLIF(tt_id_sp, 0),
      (SELECT tt_id FROM title WHERE LOWER(TRIM(title)) = LOWER(TRIM(emp_type_sp)) LIMIT 1),
      1
    );

    -- Step 3: insert the employee row using the just-captured p_id.
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

  -- ============================================================== UPDATE ===
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

  -- ============================================================== DELETE ===
  ELSIF oper = 'delete' THEN
    SELECT p_id INTO v_existing FROM employee WHERE emp_id = emp_id_sp;
    IF v_existing IS NULL THEN
      SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate' LIMIT 1;
      IF msg IS NULL THEN msg := 'Not Registered'; END IF;
      RETURN msg;
    END IF;

    -- Hard FK refs that should block delete (academic/teaching duties).
    SELECT COUNT(*) INTO v_refs FROM (
      SELECT 1 FROM class_formaster     WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM assign_teacher_room WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM bus                 WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM lesson_plan         WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM subject_class       WHERE emp_id = emp_id_sp
    ) refs;
    IF v_refs > 0 THEN
      msg := 'In Use — cannot delete (employee has assignments)';
      RETURN msg;
    END IF;

    -- Owned-by-employee rows: clear before deleting the employee.
    DELETE FROM teacher_state      WHERE emp_id = emp_id_sp;
    DELETE FROM employee_scheduale WHERE emp_id = emp_id_sp;
    DELETE FROM employee_vocation  WHERE emp_id = emp_id_sp;
    DELETE FROM employee_charge    WHERE emp_id = emp_id_sp;
    DELETE FROM employee           WHERE emp_id = emp_id_sp;

    -- Person row: drop only if no other entity still references it.
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

COMMIT;

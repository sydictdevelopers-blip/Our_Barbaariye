-- Rename employee_register_sp → employee_sp (17-arg overload).
-- The legacy 14-arg employee_sp(p_id-based) is left untouched — PostgreSQL
-- resolves the call by argument count, so both can coexist.

BEGIN;

-- Drop the 17-arg variant if a previous run left it (idempotent re-runs).
DROP FUNCTION IF EXISTS employee_sp(
  INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER,
  INTEGER, INTEGER, VARCHAR, VARCHAR, NUMERIC,
  VARCHAR, TEXT, DATE, INTEGER, INTEGER, VARCHAR
);

CREATE FUNCTION employee_sp(
  emp_id_sp      INTEGER,
  p_name_sp      VARCHAR,
  tel_sp         VARCHAR,
  email_sp       VARCHAR,
  sex_sp         VARCHAR,
  ad_id_sp       INTEGER,
  j_id_sp        INTEGER,
  sh_id_sp       INTEGER,
  emp_type_sp    VARCHAR,
  salary_type_sp VARCHAR,
  salary_sp      NUMERIC,
  degree_sp      VARCHAR,
  image_sp       TEXT,
  hired_date_sp  DATE,
  br_id_sp       INTEGER,
  u_br_id_sp     INTEGER,
  oper           VARCHAR
) RETURNS TABLE(result VARCHAR) AS $$
DECLARE
  v_p_id  INTEGER;
  v_count INT;
BEGIN
  IF oper = 'insert' THEN
    SELECT COUNT(*) INTO v_count FROM people WHERE LOWER(TRIM(tel)) = LOWER(TRIM(tel_sp));
    IF v_count > 0 THEN
      RETURN QUERY SELECT 'Phone already exists'::VARCHAR; RETURN;
    END IF;

    INSERT INTO people (p_name, tel, sex, email, ad_id, state, p_type, u_br_id)
    VALUES (p_name_sp, tel_sp, sex_sp, email_sp, ad_id_sp, 'Active', 'Employee', u_br_id_sp)
    RETURNING p_id INTO v_p_id;

    INSERT INTO employee (
      p_id, sh_id, j_id, tt_id, emp_type, salary_type,
      salary, degree, br_id, image, hired_date, u_br_id
    ) VALUES (
      v_p_id, sh_id_sp, j_id_sp,
      COALESCE((SELECT tt_id FROM title WHERE LOWER(TRIM(title)) = LOWER(TRIM(emp_type_sp)) LIMIT 1), 1),
      emp_type_sp, salary_type_sp,
      salary_sp, degree_sp, br_id_sp, image_sp, COALESCE(hired_date_sp, CURRENT_DATE), u_br_id_sp
    );
    RETURN QUERY SELECT 'Inserted'::VARCHAR;

  ELSIF oper = 'update' THEN
    SELECT p_id INTO v_p_id FROM employee WHERE emp_id = emp_id_sp;
    IF v_p_id IS NULL THEN
      RETURN QUERY SELECT 'Not Found'::VARCHAR; RETURN;
    END IF;

    UPDATE people SET
      p_name = p_name_sp,
      tel    = tel_sp,
      sex    = sex_sp,
      email  = email_sp,
      ad_id  = ad_id_sp
    WHERE p_id = v_p_id;

    UPDATE employee SET
      sh_id       = sh_id_sp,
      j_id        = j_id_sp,
      emp_type    = emp_type_sp,
      salary_type = salary_type_sp,
      salary      = salary_sp,
      degree      = degree_sp,
      image       = COALESCE(image_sp, image),
      hired_date  = COALESCE(hired_date_sp, hired_date)
    WHERE emp_id = emp_id_sp;
    RETURN QUERY SELECT 'Updated'::VARCHAR;

  ELSIF oper = 'delete' THEN
    SELECT p_id INTO v_p_id FROM employee WHERE emp_id = emp_id_sp;
    IF v_p_id IS NULL THEN
      RETURN QUERY SELECT 'Not Found'::VARCHAR; RETURN;
    END IF;

    SELECT COUNT(*) INTO v_count FROM (
      SELECT 1 FROM class_formaster   WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM assign_teacher_room WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM bus               WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM lesson_plan       WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM subject_class     WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM employee_charge   WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM employee_vocation WHERE emp_id = emp_id_sp UNION ALL
      SELECT 1 FROM employee_scheduale WHERE emp_id = emp_id_sp
    ) refs;
    IF v_count > 0 THEN
      RETURN QUERY SELECT 'In Use'::VARCHAR; RETURN;
    END IF;

    DELETE FROM teacher_state WHERE emp_id = emp_id_sp;
    DELETE FROM employee WHERE emp_id = emp_id_sp;
    DELETE FROM people WHERE p_id = v_p_id;
    RETURN QUERY SELECT 'Deleted'::VARCHAR;
  ELSE
    RETURN QUERY SELECT 'Unknown Operation'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Old wrapper name no longer needed.
DROP FUNCTION IF EXISTS employee_register_sp(
  INTEGER, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER,
  INTEGER, INTEGER, VARCHAR, VARCHAR, NUMERIC,
  VARCHAR, TEXT, DATE, INTEGER, INTEGER, VARCHAR
);

COMMIT;

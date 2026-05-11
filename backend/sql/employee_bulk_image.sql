-- Backend bits for the "Add Image" bulk-update workflow on the Employee tab.

BEGIN;

-- 1. View — list employees in a branch, optionally narrowed by shift.
--    Each row carries the editable fields (p_id for name update + emp_id for
--    image update) so the bulk panel can issue per-row patches.

DROP FUNCTION IF EXISTS employees_by_shift_show(INTEGER, INTEGER);
CREATE FUNCTION employees_by_shift_show(p_sh_id INTEGER, p_branch_id INTEGER)
RETURNS TABLE(
  emp_id      INTEGER,
  p_id        INTEGER,
  p_name      VARCHAR,
  image       TEXT,
  shift_name  VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT em.emp_id, p.p_id, p.p_name, em.image, sh.shift AS shift_name
  FROM employee em
  JOIN people p   ON p.p_id   = em.p_id
  LEFT JOIN shift sh ON sh.sh_id = em.sh_id
  WHERE em.br_id = p_branch_id
    AND (COALESCE(p_sh_id, 0) = 0 OR em.sh_id = p_sh_id)
  ORDER BY p.p_name;
END;
$$ LANGUAGE plpgsql;


-- 2. employee_quick_update_sp — patch only name + image for a single
--    employee. Used by the bulk-image panel: every row that the user
--    actually edits gets one call. Returning the alerts message so the
--    existing swal pipeline auto-translates.

CREATE OR REPLACE FUNCTION employee_quick_update_sp(
  emp_id_sp  INTEGER,
  p_name_sp  TEXT,
  image_sp   TEXT,
  u_br_id_sp INTEGER,
  oper       VARCHAR
) RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  msg   VARCHAR;
  v_pid INTEGER;
BEGIN
  IF oper <> 'update' THEN
    RETURN 'Unknown Operation';
  END IF;

  SELECT p_id INTO v_pid FROM employee WHERE emp_id = emp_id_sp;
  IF v_pid IS NULL THEN
    SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate' LIMIT 1;
    IF msg IS NULL THEN msg := 'Not Registered'; END IF;
    RETURN msg;
  END IF;

  -- Empty inputs are no-ops (don't blank an existing value with '').
  IF p_name_sp IS NOT NULL AND TRIM(p_name_sp) <> '' THEN
    UPDATE people SET p_name = p_name_sp WHERE p_id = v_pid;
  END IF;

  IF image_sp IS NOT NULL AND TRIM(image_sp) <> '' THEN
    UPDATE employee SET image = image_sp WHERE emp_id = emp_id_sp;
  END IF;

  SELECT body INTO msg FROM alerts WHERE title = 'Update' LIMIT 1;
  IF msg IS NULL THEN msg := 'Updated'; END IF;
  RETURN msg;
END;
$$;

COMMIT;

-- job_sp v2 — adds state_sp parameter so the Update form can toggle a job
-- between Active / Inactive. Insert defaults to 'Active' if state is empty.

BEGIN;

DROP FUNCTION IF EXISTS public.job_sp(INTEGER, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.job_sp(INTEGER, VARCHAR, VARCHAR, VARCHAR);

CREATE FUNCTION public.job_sp(
  j_id_sp   INTEGER,
  j_name_sp VARCHAR,
  state_sp  VARCHAR,
  oper      VARCHAR
) RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  msg     VARCHAR;
  v_count INT;
  v_state VARCHAR;
BEGIN
  v_state := COALESCE(NULLIF(TRIM(state_sp), ''), 'Active');

  IF oper = 'insert' THEN
    SELECT COUNT(*) INTO v_count FROM job WHERE LOWER(TRIM(j_name)) = LOWER(TRIM(j_name_sp));
    IF v_count > 0 THEN
      SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert' LIMIT 1;
      IF msg IS NULL THEN msg := 'Already exists'; END IF;
      RETURN msg;
    END IF;
    INSERT INTO job (j_name, state) VALUES (j_name_sp, v_state);
    SELECT body INTO msg FROM alerts WHERE title = 'Insert' LIMIT 1;
    IF msg IS NULL THEN msg := 'Inserted'; END IF;
    RETURN msg;

  ELSIF oper = 'update' THEN
    IF NOT EXISTS (SELECT 1 FROM job WHERE j_id = j_id_sp) THEN
      SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate' LIMIT 1;
      IF msg IS NULL THEN msg := 'Not Registered'; END IF;
      RETURN msg;
    END IF;
    SELECT COUNT(*) INTO v_count FROM job
      WHERE LOWER(TRIM(j_name)) = LOWER(TRIM(j_name_sp)) AND j_id <> j_id_sp;
    IF v_count > 0 THEN
      SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert' LIMIT 1;
      IF msg IS NULL THEN msg := 'Already exists'; END IF;
      RETURN msg;
    END IF;
    UPDATE job SET j_name = j_name_sp, state = v_state WHERE j_id = j_id_sp;
    SELECT body INTO msg FROM alerts WHERE title = 'Update' LIMIT 1;
    IF msg IS NULL THEN msg := 'Updated'; END IF;
    RETURN msg;

  ELSIF oper = 'delete' THEN
    IF NOT EXISTS (SELECT 1 FROM job WHERE j_id = j_id_sp) THEN
      SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate' LIMIT 1;
      IF msg IS NULL THEN msg := 'Not Registered'; END IF;
      RETURN msg;
    END IF;
    SELECT COUNT(*) INTO v_count FROM employee WHERE j_id = j_id_sp;
    IF v_count > 0 THEN
      SELECT body INTO msg FROM alerts WHERE title = 'CantDelete' LIMIT 1;
      IF msg IS NULL THEN msg := 'This information cannot be deleted'; END IF;
      RETURN msg;
    END IF;
    DELETE FROM job WHERE j_id = j_id_sp;
    SELECT body INTO msg FROM alerts WHERE title = 'Delete' LIMIT 1;
    IF msg IS NULL THEN msg := 'Deleted'; END IF;
    RETURN msg;

  ELSE
    RETURN 'Unknown Operation';
  END IF;
END;
$$;

COMMIT;

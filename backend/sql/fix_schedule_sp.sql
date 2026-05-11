-- Replace employee_schedule_sp body — the legacy version references a
-- non-existent table `employee_schedule` for its duplicate check; the real
-- table is `employee_scheduale` (legacy misspelling kept for FK stability).

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
    SELECT COUNT(*) INTO v_count
      FROM employee_scheduale
     WHERE emp_id = emp_id_sp
       AND day_id = day_id_sp
       AND sh_id  = sh_id_sp;
    IF v_count > 0 THEN
      RETURN 'Already Exists';
    END IF;
    INSERT INTO employee_scheduale(emp_id, time_in, time_out, day_id, sh_id, state, reg_date, u_br_id)
    VALUES (emp_id_sp, time_in_sp, time_out_sp, day_id_sp, sh_id_sp,
            COALESCE(state_sp, 'Active'),
            COALESCE(reg_date_sp, CURRENT_TIMESTAMP),
            u_br_id_sp);
    RETURN 'Inserted';

  ELSIF oper_sp = 'update' THEN
    UPDATE employee_scheduale SET
      emp_id   = emp_id_sp,
      time_in  = time_in_sp,
      time_out = time_out_sp,
      day_id   = day_id_sp,
      sh_id    = sh_id_sp,
      state    = COALESCE(state_sp, state)
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

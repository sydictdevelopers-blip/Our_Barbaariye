-- ============================================================================
-- assign-class-exam-sp.sql
-- assign_class_exam_sp(a_c_e_id, er_id, cl_id, b_id, u_br_id, operation) — PostgreSQL.
-- Asalka MySQL: assign_class_exam_sp; logic-ka isagoo isku mid ah.
--
-- Schema mapping (MySQL → PG):
--   users.u_id              → users.usr_id
--   users.deleted           → MA jiro PG; way ka tagaa.
--   user_branch.u_id        → user_branch.usr_id
--   assign_class_exam.a_c_e_id → assign_class_exam.a_c_ex   (column-ka PG-da)
--   CURRENT_DATE()          → NOW()  (reg_date is timestamp)
--   INSERT ... VALUES(null,...) → explicit column list (a_c_ex auto via SERIAL/SEQ)
-- ============================================================================

DROP FUNCTION IF EXISTS public.assign_class_exam_sp(integer, integer, integer, integer, integer, varchar) CASCADE;

CREATE OR REPLACE FUNCTION public.assign_class_exam_sp(
    a_c_e_id_sp integer,
    er_id_sp    integer,
    cl_id_sp    integer,
    b_id_sp     integer,
    u_br_id_sp  integer,
    operation   varchar
)
RETURNS TABLE(result text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_ok boolean;
BEGIN
    -- Hubi user-ka inuu Active oo Unlocked yahay
    SELECT EXISTS (
        SELECT 1
          FROM users        u
          JOIN user_branch  ub ON ub.usr_id = u.usr_id
         WHERE u.lock_user = 'Unlocked'
           AND u.state     = 'Active'
           AND ub.u_br_id  = u_br_id_sp
    ) INTO v_user_ok;

    IF NOT v_user_ok THEN
        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Userlock' LIMIT 1;
        RETURN;
    END IF;

    CASE
    WHEN operation = 'insert' THEN
        IF EXISTS (
            SELECT 1 FROM assign_class_exam a
             WHERE a.cl_id = cl_id_sp
               AND a.b_id  = b_id_sp
               AND a.er_id = er_id_sp
        ) THEN
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'AlreadyInsert' LIMIT 1;
        ELSE
            UPDATE assign_class_exam a
               SET state = 'Inactive'
             WHERE a.cl_id = cl_id_sp
               AND a.b_id  = b_id_sp;

            INSERT INTO assign_class_exam (er_id, cl_id, b_id, state, u_br_id, reg_date)
            VALUES (er_id_sp, cl_id_sp, b_id_sp, 'Active', u_br_id_sp, NOW());

            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Insert' LIMIT 1;
        END IF;

    WHEN operation = 'update' THEN
        IF EXISTS (SELECT 1 FROM assign_class_exam a WHERE a.a_c_ex = a_c_e_id_sp) THEN
            UPDATE assign_class_exam
               SET er_id = er_id_sp,
                   cl_id = cl_id_sp
             WHERE a_c_ex = a_c_e_id_sp;

            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Update' LIMIT 1;
        ELSE
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'NotRegUpdate' LIMIT 1;
        END IF;

    WHEN operation = 'delete' THEN
        IF EXISTS (SELECT 1 FROM assign_class_exam a WHERE a.a_c_ex = a_c_e_id_sp) THEN
            DELETE FROM assign_class_exam WHERE a_c_ex = a_c_e_id_sp;
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Delete' LIMIT 1;
        ELSE
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'NotRegDelete' LIMIT 1;
        END IF;
    END CASE;
END;
$function$;

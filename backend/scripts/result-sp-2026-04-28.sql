-- ============================================================================
-- result-sp-2026-04-28.sql
-- result_sp(ID, student, exam, subject, mark, user_id, operation) — PostgreSQL.
-- Asalka MySQL: result_sp; wuxuu qabtaa insert/update/delete + logos audit log.
--
-- Schema mapping (MySQL → PG):
--   users.u_id              → users.usr_id
--   users.deleted           → MA jiro PG; way ka tagaa.
--   user_branch.u_id        → user_branch.usr_id
--   exam_registration.e_r_id → exam_reg.ex_reg_id
--   exam_registration.e_id   → exam_reg.ex_id
--   exam.e_id               → exam.ex_id
--   exam.name               → exam.exam
--   subjects.su_id          → subjects.sub_id
--   student.name            → people.p_name (via student.p_id)
--   logos VALUES (null,..)  → INSERT INTO logos (cols...) VALUES (...)
--   CURRENT_DATE_SYD()      → NOW()
--   INSERT IGNORE           → INSERT ... ON CONFLICT DO NOTHING (haddii constraint jiro)
-- ============================================================================

DROP FUNCTION IF EXISTS public.result_sp(integer, integer, integer, integer, varchar, integer, varchar);
CREATE OR REPLACE FUNCTION public.result_sp(
    p_id        integer,
    p_student   integer,
    p_exam      integer,
    p_subject   integer,
    p_mark      varchar,
    p_user_id   integer,
    p_operation varchar
)
 RETURNS TABLE(result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_username  varchar;
    v_name      varchar;
    v_exam_name varchar;
    v_sub_name  varchar;
    v_mark      numeric;
    v_old_mark  text;
    v_log_body  text;
    v_user_ok   boolean;
BEGIN
    -- 1) Hubi user-ka inuu Active oo Unlocked yahay
    SELECT EXISTS (
        SELECT 1
        FROM users u
        JOIN user_branch ub ON ub.usr_id = u.usr_id
        WHERE u.lock_user = 'Unlocked'
          AND u.state     = 'Active'
          AND ub.u_br_id  = p_user_id
    ) INTO v_user_ok;

    IF NOT v_user_ok THEN
        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Userlock' LIMIT 1;
        RETURN;
    END IF;

    -- 2) Hel username log-ga
    SELECT u.username
    INTO v_username
    FROM users u
    JOIN user_branch ub ON ub.usr_id = u.usr_id
    WHERE u.state = 'Active'
      AND u.lock_user = 'Unlocked'
      AND ub.u_br_id = p_user_id
    LIMIT 1;

    -- ========================================================================
    -- DELETE
    -- ========================================================================
    IF p_operation = 'delete' THEN
        IF EXISTS (SELECT 1 FROM result WHERE r_id = p_id) THEN
            SELECT p.p_name, e.exam, su.name, r.marks
            INTO v_name, v_exam_name, v_sub_name, v_mark
            FROM result r
            JOIN student_class sc ON sc.std_cl_id = r.std_cl_id
            JOIN student       s  ON s.std_id    = sc.std_id
            JOIN people        p  ON p.p_id      = s.p_id
            JOIN exam_reg      er ON er.ex_reg_id = r.e_r_id
            JOIN exam          e  ON e.ex_id     = er.ex_id
            JOIN subjects      su ON su.sub_id   = r.su_id
            WHERE r.r_id = p_id;

            v_log_body := concat_ws(' , ', p_id::text, v_name, v_exam_name, v_sub_name, v_mark::text);
            INSERT INTO logos (table_names, operation, body, event_date, username)
            VALUES ('Result', p_operation, v_log_body, NOW(), v_username);

            DELETE FROM result WHERE r_id = p_id;

            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Delete' LIMIT 1;
        ELSE
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'NotRegDelete' LIMIT 1;
        END IF;
        RETURN;
    END IF;

    -- ========================================================================
    -- INSERT
    -- ========================================================================
    IF p_operation = 'insert' THEN
        IF EXISTS (
            SELECT 1 FROM result r
            WHERE r.su_id    = p_subject
              AND r.std_cl_id = p_student
              AND r.e_r_id   = p_exam
        ) THEN
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'AlreadyInsert' LIMIT 1;
            RETURN;
        END IF;

        INSERT INTO result (std_cl_id, e_r_id, su_id, marks, activity, approve, lock, reg_date, u_br_id)
        VALUES (p_student, p_exam, p_subject, p_mark::numeric, 0, '', 'Locked', NOW(), p_user_id);

        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Insert' LIMIT 1;
        RETURN;
    END IF;

    -- ========================================================================
    -- UPDATE  (NB: in this proc, p_student = r_id when operation='update')
    -- ========================================================================
    IF p_operation = 'update' THEN
        IF NOT EXISTS (SELECT 1 FROM result WHERE r_id = p_student) THEN
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'NotRegUpdate' LIMIT 1;
            RETURN;
        END IF;

        SELECT r.marks::text INTO v_old_mark FROM result r WHERE r.r_id = p_student;
        IF REPLACE(COALESCE(v_old_mark, ''), ' ', '') = p_mark THEN
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Update' LIMIT 1;
            RETURN;
        END IF;

        UPDATE result
        SET approve = p_mark,
            e_r_id  = p_exam
        WHERE r_id = p_student;

        SELECT p.p_name, e.exam, su.name, r.marks
        INTO v_name, v_exam_name, v_sub_name, v_mark
        FROM result r
        JOIN student_class sc ON sc.std_cl_id = r.std_cl_id
        JOIN student       s  ON s.std_id    = sc.std_id
        JOIN people        p  ON p.p_id      = s.p_id
        JOIN exam_reg      er ON er.ex_reg_id = r.e_r_id
        JOIN exam          e  ON e.ex_id     = er.ex_id
        JOIN subjects      su ON su.sub_id   = r.su_id
        WHERE r.r_id = p_student;

        v_log_body := concat_ws(' , ', p_student::text, v_name, v_exam_name, v_sub_name, v_mark::text);
        INSERT INTO logos (table_names, operation, body, event_date, username)
        VALUES ('Result', p_operation, v_log_body, NOW(), v_username);

        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Update' LIMIT 1;
        RETURN;
    END IF;
END;
$function$;

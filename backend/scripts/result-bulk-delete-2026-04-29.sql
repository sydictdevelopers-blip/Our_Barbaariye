-- ============================================================================
-- result-bulk-delete-2026-04-29.sql
-- Two SPs for bulk-delete from Manage Result → Result tab:
--   class_exam_delete_sp   — wipes ALL subjects' result rows for the selected
--                            class+batch+academic+exam combination.
--   subject_exam_delete_sp — wipes results for ONE subject within the same scope.
-- Both check user lock/active status, refuse when nothing matches, and write a
-- single audit row to logos summarizing the bulk action (count of rows removed).
-- ============================================================================

DROP FUNCTION IF EXISTS public.class_exam_delete_sp(integer, integer, integer, integer, integer, varchar);
CREATE OR REPLACE FUNCTION public.class_exam_delete_sp(
    p_class    integer,
    p_academic integer,
    p_exam     integer,
    p_batch    integer,
    p_user_id  integer,
    p_operation varchar
)
 RETURNS TABLE(result text)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_variable
DECLARE
    v_username varchar;
    v_count    integer;
    v_user_ok  boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM users u
        JOIN user_branch ub ON ub.usr_id = u.usr_id
        WHERE u.lock_user = 'Unlocked' AND u.state = 'Active' AND ub.u_br_id = p_user_id
    ) INTO v_user_ok;

    IF NOT v_user_ok THEN
        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Userlock' LIMIT 1;
        RETURN;
    END IF;

    SELECT u.username INTO v_username
    FROM users u JOIN user_branch ub ON ub.usr_id = u.usr_id
    WHERE u.state = 'Active' AND u.lock_user = 'Unlocked' AND ub.u_br_id = p_user_id
    LIMIT 1;

    IF p_operation = 'delete' THEN
        SELECT COUNT(*) INTO v_count
        FROM result r
        WHERE r.e_r_id = p_exam
          AND r.std_cl_id IN (
              SELECT sc.std_cl_id FROM student_class sc
              WHERE sc.cl_id = p_class AND sc.a_y_id = p_academic AND sc.b_id = p_batch
          );

        IF v_count = 0 THEN
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'NotRegDelete' LIMIT 1;
            RETURN;
        END IF;

        INSERT INTO logos (table_names, operation, body, event_date, username)
        VALUES (
            'Result', p_operation,
            concat_ws(' , ',
                'class-exam-delete',
                'class=' || p_class::text,
                'academic=' || p_academic::text,
                'exam=' || p_exam::text,
                'batch=' || p_batch::text,
                'rows=' || v_count::text
            ),
            NOW(), v_username
        );

        DELETE FROM result
        WHERE e_r_id = p_exam
          AND std_cl_id IN (
              SELECT sc.std_cl_id FROM student_class sc
              WHERE sc.cl_id = p_class AND sc.a_y_id = p_academic AND sc.b_id = p_batch
          );

        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Delete' LIMIT 1;
        RETURN;
    END IF;
END;
$function$;


DROP FUNCTION IF EXISTS public.subject_exam_delete_sp(integer, integer, integer, integer, integer, integer, varchar);
CREATE OR REPLACE FUNCTION public.subject_exam_delete_sp(
    p_class    integer,
    p_academic integer,
    p_exam     integer,
    p_batch    integer,
    p_subject  integer,
    p_user_id  integer,
    p_operation varchar
)
 RETURNS TABLE(result text)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_variable
DECLARE
    v_username varchar;
    v_count    integer;
    v_user_ok  boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM users u
        JOIN user_branch ub ON ub.usr_id = u.usr_id
        WHERE u.lock_user = 'Unlocked' AND u.state = 'Active' AND ub.u_br_id = p_user_id
    ) INTO v_user_ok;

    IF NOT v_user_ok THEN
        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Userlock' LIMIT 1;
        RETURN;
    END IF;

    SELECT u.username INTO v_username
    FROM users u JOIN user_branch ub ON ub.usr_id = u.usr_id
    WHERE u.state = 'Active' AND u.lock_user = 'Unlocked' AND ub.u_br_id = p_user_id
    LIMIT 1;

    IF p_operation = 'delete' THEN
        SELECT COUNT(*) INTO v_count
        FROM result r
        WHERE r.e_r_id = p_exam
          AND r.su_id  = p_subject
          AND r.std_cl_id IN (
              SELECT sc.std_cl_id FROM student_class sc
              WHERE sc.cl_id = p_class AND sc.a_y_id = p_academic AND sc.b_id = p_batch
          );

        IF v_count = 0 THEN
            RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'NotRegDelete' LIMIT 1;
            RETURN;
        END IF;

        INSERT INTO logos (table_names, operation, body, event_date, username)
        VALUES (
            'Result', p_operation,
            concat_ws(' , ',
                'subject-exam-delete',
                'class=' || p_class::text,
                'academic=' || p_academic::text,
                'exam=' || p_exam::text,
                'subject=' || p_subject::text,
                'batch=' || p_batch::text,
                'rows=' || v_count::text
            ),
            NOW(), v_username
        );

        DELETE FROM result
        WHERE e_r_id = p_exam
          AND su_id  = p_subject
          AND std_cl_id IN (
              SELECT sc.std_cl_id FROM student_class sc
              WHERE sc.cl_id = p_class AND sc.a_y_id = p_academic AND sc.b_id = p_batch
          );

        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Delete' LIMIT 1;
        RETURN;
    END IF;
END;
$function$;

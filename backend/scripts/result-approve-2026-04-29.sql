-- ============================================================================
-- result-approve-2026-04-29.sql
-- Approve Exam workflow SPs.
--
-- Two stored procedures:
--   result_approve_sp        — single-row approve/cancel via the per-row buttons.
--   result_approve_bulk_sp   — bulk approve/cancel for "Approve By Class",
--                              "Approve All", "Cancel All".
--
-- Approve  → marks := approve::numeric, approve := '', approved_user := <usr_id>.
-- Cancel   → approve := ''.  marks/u_br_id/editted_user untouched.
--
-- approved_user FK → user_branch.u_br_id (repointed 2026-04-29). p_user_id is
-- already a u_br_id so we write it directly.
-- ============================================================================

DROP FUNCTION IF EXISTS public.result_approve_sp(integer, integer, varchar);
CREATE OR REPLACE FUNCTION public.result_approve_sp(
    p_id        integer,
    p_user_id   integer,
    p_operation varchar
)
RETURNS TABLE(result text)
LANGUAGE plpgsql
AS $function$
#variable_conflict use_variable
DECLARE
    v_user_ok  boolean;
    v_username varchar;
    v_approve  varchar;
    v_log_body text;
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
    WHERE u.state = 'Active' AND u.lock_user = 'Unlocked' AND ub.u_br_id = p_user_id LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM result WHERE r_id = p_id) THEN
        RETURN QUERY SELECT 'Natiijada lama helin.'::text;
        RETURN;
    END IF;

    SELECT r.approve INTO v_approve FROM result r WHERE r.r_id = p_id;
    IF v_approve IS NULL OR TRIM(v_approve) = '' THEN
        RETURN QUERY SELECT 'Saxnaan sugnaa kuma jirto natiijadaan.'::text;
        RETURN;
    END IF;

    IF p_operation = 'approve' THEN
        UPDATE result SET
            marks         = approve::numeric,
            approve       = '',
            approved_user = p_user_id
        WHERE r_id = p_id;

        v_log_body := concat_ws(' , ', 'approve', p_id::text, v_approve);
        INSERT INTO logos (table_names, operation, body, event_date, username)
        VALUES ('Result', p_operation, v_log_body, NOW(), v_username);

        RETURN QUERY SELECT 'Waa la ansixiyay.'::text;

    ELSIF p_operation = 'cancel' THEN
        UPDATE result SET approve = '' WHERE r_id = p_id;

        v_log_body := concat_ws(' , ', 'cancel-approve', p_id::text, v_approve);
        INSERT INTO logos (table_names, operation, body, event_date, username)
        VALUES ('Result', p_operation, v_log_body, NOW(), v_username);

        RETURN QUERY SELECT 'Saxnaantii waa la cancel gareeyay.'::text;

    ELSE
        RETURN QUERY SELECT 'Hawl aan la aqoonsan: oper waa approve ama cancel.'::text;
    END IF;
END;
$function$;


DROP FUNCTION IF EXISTS public.result_approve_bulk_sp(integer, integer, varchar);
CREATE OR REPLACE FUNCTION public.result_approve_bulk_sp(
    p_class     integer,
    p_user_id   integer,
    p_operation varchar
)
RETURNS TABLE(result text)
LANGUAGE plpgsql
AS $function$
#variable_conflict use_variable
DECLARE
    v_user_ok  boolean;
    v_username varchar;
    v_count    integer;
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
    WHERE u.state = 'Active' AND u.lock_user = 'Unlocked' AND ub.u_br_id = p_user_id LIMIT 1;

    IF p_operation = 'approve' THEN
        UPDATE result r
        SET marks         = r.approve::numeric,
            approve       = '',
            approved_user = p_user_id
        FROM student_class sc
        WHERE sc.std_cl_id = r.std_cl_id
          AND r.approve IS NOT NULL AND TRIM(r.approve) <> ''
          AND (p_class = 0 OR sc.cl_id = p_class);

        GET DIAGNOSTICS v_count = ROW_COUNT;

        INSERT INTO logos (table_names, operation, body, event_date, username)
        VALUES (
            'Result', p_operation,
            concat_ws(' , ', 'bulk-approve', 'class=' || p_class::text, 'rows=' || v_count::text),
            NOW(), v_username
        );

        IF v_count = 0 THEN
            RETURN QUERY SELECT 'Saxnaan sugnaa lama helin.'::text;
        ELSE
            RETURN QUERY SELECT (v_count::text || ' natiijo ayaa la ansixiyay.')::text;
        END IF;

    ELSIF p_operation = 'cancel' THEN
        UPDATE result r
        SET approve = ''
        FROM student_class sc
        WHERE sc.std_cl_id = r.std_cl_id
          AND r.approve IS NOT NULL AND TRIM(r.approve) <> ''
          AND (p_class = 0 OR sc.cl_id = p_class);

        GET DIAGNOSTICS v_count = ROW_COUNT;

        INSERT INTO logos (table_names, operation, body, event_date, username)
        VALUES (
            'Result', p_operation,
            concat_ws(' , ', 'bulk-cancel-approve', 'class=' || p_class::text, 'rows=' || v_count::text),
            NOW(), v_username
        );

        IF v_count = 0 THEN
            RETURN QUERY SELECT 'Saxnaan sugnaa lama helin.'::text;
        ELSE
            RETURN QUERY SELECT (v_count::text || ' saxnaan ayaa la cancel gareeyay.')::text;
        END IF;

    ELSE
        RETURN QUERY SELECT 'Hawl aan la aqoonsan: oper waa approve ama cancel.'::text;
    END IF;
END;
$function$;

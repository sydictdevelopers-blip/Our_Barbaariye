-- exam_in_sp + vw_exam_in - PostgreSQL ports of the original MySQL procedures.
-- Differences from the MySQL source:
--   * users.usr_id (was u_id)
--   * user_branch.usr_id (was u_id)
--   * users has no `name` or `deleted` columns; using users.username for the log
--   * CURRENT_DATE_SYD() replaced by CURRENT_DATE / CURRENT_TIMESTAMP
--   * Delete branch returns the 'Delete' alert (the MySQL source returned
--     'Insert' here, which looked like a bug)
--   * vw_exam_in always returns 4 columns; username is NULL when branch='All'

CREATE OR REPLACE FUNCTION public.exam_in_sp(
    p_id          INTEGER,
    p_exam_body   TEXT,
    p_exam_bodyb  TEXT,
    p_exam_bodyc  TEXT,
    p_exam_bodyd  TEXT,
    p_u_br_id     INTEGER,
    p_operation   TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $BODY$
DECLARE
    v_user_ok    BOOLEAN;
    v_user_name  TEXT;
    v_msg        TEXT;
    v_exists     BOOLEAN;
    v_row        RECORD;
    v_new_id     INT;
BEGIN
    SELECT TRUE INTO v_user_ok
    FROM users u
    JOIN user_branch ub ON ub.usr_id = u.usr_id
    WHERE u.lock_user = 'Unlocked'
      AND u.state = 'Active'
      AND ub.u_br_id = p_u_br_id
    LIMIT 1;

    IF v_user_ok IS NOT TRUE THEN
        SELECT body INTO v_msg FROM alerts WHERE title = 'Userlock' AND lang_id = 1;
        RETURN v_msg;
    END IF;

    SELECT u.username INTO v_user_name
    FROM users u
    JOIN user_branch ub ON ub.usr_id = u.usr_id
    WHERE ub.u_br_id = p_u_br_id
    LIMIT 1;

    IF p_operation = 'delete' THEN
        SELECT TRUE INTO v_exists FROM exam_in WHERE ex_in_id = p_id LIMIT 1;
        IF v_exists THEN
            SELECT ex.ex_in_id, ex.body, ex.reg_date, ex.u_br_id
              INTO v_row
              FROM exam_in ex WHERE ex.ex_in_id = p_id;
            INSERT INTO logos (table_names, operation, body, event_date, username)
            VALUES ('exam_in', p_operation,
                    concat_ws('  -  ', v_row.ex_in_id::TEXT, v_row.body, v_row.reg_date::TEXT, v_row.u_br_id::TEXT),
                    CURRENT_DATE, v_user_name);
            DELETE FROM exam_in WHERE ex_in_id = p_id;
            SELECT body INTO v_msg FROM alerts WHERE title = 'Delete' AND lang_id = 1;
        ELSE
            SELECT body INTO v_msg FROM alerts WHERE title = 'NotDelete' AND lang_id = 1;
        END IF;
        RETURN v_msg;
    END IF;

    IF p_operation = 'update' THEN
        SELECT TRUE INTO v_exists FROM exam_in WHERE ex_in_id = p_id LIMIT 1;
        IF v_exists THEN
            UPDATE exam_in SET body = p_exam_body WHERE ex_in_id = p_id;
            INSERT INTO logos (table_names, operation, body, event_date, username)
            VALUES ('exam_in', p_operation,
                    concat_ws('  -  ', p_id::TEXT, p_exam_body, p_u_br_id::TEXT),
                    CURRENT_DATE, v_user_name);
            SELECT body INTO v_msg FROM alerts WHERE title = 'Update' AND lang_id = 1;
        ELSE
            SELECT body INTO v_msg FROM alerts WHERE title = 'NotUpdate' AND lang_id = 1;
        END IF;
        RETURN v_msg;
    END IF;

    IF p_operation = 'insert' THEN
        SELECT TRUE INTO v_exists FROM exam_in WHERE ex_in_id = p_id LIMIT 1;
        IF v_exists THEN
            SELECT body INTO v_msg FROM alerts WHERE title = 'AlreadyInsert' AND lang_id = 1;
        ELSE
            INSERT INTO exam_in (body, reg_date, u_br_id) VALUES (p_exam_body,  CURRENT_TIMESTAMP, p_u_br_id);
            INSERT INTO exam_in (body, reg_date, u_br_id) VALUES (p_exam_bodyb, CURRENT_TIMESTAMP, p_u_br_id);
            INSERT INTO exam_in (body, reg_date, u_br_id) VALUES (p_exam_bodyc, CURRENT_TIMESTAMP, p_u_br_id);
            INSERT INTO exam_in (body, reg_date, u_br_id) VALUES (p_exam_bodyd, CURRENT_TIMESTAMP, p_u_br_id);
            SELECT COALESCE(MAX(ex_in_id), 0) INTO v_new_id FROM exam_in;
            INSERT INTO logos (table_names, operation, body, event_date, username)
            VALUES ('exam_in', p_operation,
                    concat_ws('  -  ', v_new_id::TEXT, p_exam_body, p_u_br_id::TEXT),
                    CURRENT_DATE, v_user_name);
            SELECT body INTO v_msg FROM alerts WHERE title = 'Insert' AND lang_id = 1;
        END IF;
        RETURN v_msg;
    END IF;

    RAISE EXCEPTION 'Unknown operation: %', p_operation;
END;
$BODY$;


CREATE OR REPLACE FUNCTION public.vw_exam_in(p_u_br_id INTEGER)
RETURNS TABLE(id INTEGER, instruction TEXT, reg_date DATE, username TEXT)
LANGUAGE plpgsql
AS $BODY$
DECLARE
    v_branch TEXT;
BEGIN
    SELECT b.br_name INTO v_branch
    FROM user_branch ub
    JOIN branch b ON b.br_id = ub.br_id
    WHERE ub.u_br_id = p_u_br_id
    LIMIT 1;

    IF v_branch = 'All' THEN
        RETURN QUERY
        SELECT ex.ex_in_id, ex.body, ex.reg_date::DATE, NULL::TEXT
        FROM exam_in ex
        ORDER BY ex.ex_in_id;
    ELSE
        RETURN QUERY
        SELECT ex.ex_in_id, ex.body, ex.reg_date::DATE, u.username::TEXT
        FROM exam_in ex
        JOIN user_branch ub ON ub.u_br_id = ex.u_br_id
        JOIN users u        ON u.usr_id   = ub.usr_id
        WHERE ex.u_br_id = p_u_br_id
        ORDER BY ex.ex_in_id;
    END IF;
END;
$BODY$;

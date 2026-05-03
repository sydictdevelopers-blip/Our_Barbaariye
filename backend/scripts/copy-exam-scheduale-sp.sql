-- copy_exam_scheduale_sp(src_a_y_sp, dst_a_y_sp, u_br_id_sp, br_id_sp)
-- Copy DHAMMAAN exam_schedule rows-ka academic-ka source → academic-ka
-- destination. Waxay ku xidhaa exam_reg-ka u dhigma destination academic-ka
-- (matching exam_reg.ex_id + exam_type). Haddii row hore u jiro destination,
-- waa la dhaafaa (NOT EXISTS guard).
--
-- 'All' branch handling sida SP-yada kale.

DROP FUNCTION IF EXISTS public.copy_exam_scheduale_sp(integer, integer, integer, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.copy_exam_scheduale_sp(
    src_a_y_sp integer,
    dst_a_y_sp integer,
    u_br_id_sp integer,
    br_id_sp   integer
)
RETURNS TABLE(result text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_ok      boolean;
    v_branch_name  varchar;
    v_count        integer;
BEGIN
    SELECT EXISTS (
        SELECT 1
          FROM users       u
          JOIN user_branch ub ON ub.usr_id = u.usr_id
         WHERE u.lock_user = 'Unlocked'
           AND u.state     = 'Active'
           AND ub.u_br_id  = u_br_id_sp
    ) INTO v_user_ok;

    IF NOT v_user_ok THEN
        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Userlock' LIMIT 1;
        RETURN;
    END IF;

    IF src_a_y_sp = dst_a_y_sp THEN
        RETURN QUERY SELECT 'Source iyo Destination ha isku mid noqdaan'::text;
        RETURN;
    END IF;

    SELECT TRIM(br_name) INTO v_branch_name FROM branch WHERE br_id = br_id_sp;

    INSERT INTO exam_schedule (d_id, pr_id, sub_cl_id, sh_id, cl_id, ex_r_id, start_time, end_time, exam_date, reg_date, u_br_id)
    SELECT es.d_id,
           es.pr_id,
           es.sub_cl_id,
           es.sh_id,
           es.cl_id,
           dst_er.ex_reg_id,                  -- ex_r_id cusub oo dst academic ah
           es.start_time,
           es.end_time,
           es.exam_date,
           NOW(),
           u_br_id_sp
      FROM exam_schedule es
      JOIN exam_reg src_er ON src_er.ex_reg_id = es.ex_r_id
      JOIN exam_reg dst_er ON dst_er.ex_id = src_er.ex_id
                          AND dst_er.exam_type = src_er.exam_type
                          AND dst_er.a_y_id = dst_a_y_sp
                          AND dst_er.br_id  = src_er.br_id
     WHERE src_er.a_y_id = src_a_y_sp
       AND (
           v_branch_name = 'All'
           OR src_er.br_id = br_id_sp
           OR (SELECT TRIM(br_name) = 'All' FROM branch WHERE br_id = src_er.br_id)
       )
       AND NOT EXISTS (
           SELECT 1 FROM exam_schedule es2
            WHERE es2.cl_id     = es.cl_id
              AND es2.d_id      = es.d_id
              AND es2.pr_id     = es.pr_id
              AND es2.ex_r_id   = dst_er.ex_reg_id
       );

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count > 0 THEN
        RETURN QUERY SELECT (v_count::text || ' rows ayaa la copy gareeyay')::text;
    ELSE
        RETURN QUERY SELECT 'Wax la copy gareeyo lama helin (laga yaabaa in dst academic-ku exam_reg yahay aanu lahayn ama row dhammaantood horey u jiraan)'::text;
    END IF;
END;
$function$;

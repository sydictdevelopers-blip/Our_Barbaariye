-- ============================================================================
-- exam_reg_show — fix structure mismatch in the "specific branch + no rows"
-- branch. The ELSE returned only 1 column (al.body), but the function
-- signature requires 12 — Postgres raised:
--   "structure of query does not match function result type"
-- on every ExamRegister page load when the branch had no exam_reg rows.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.exam_reg_show(p_branch_id integer, ac_y_id_sp integer DEFAULT 0)
RETURNS TABLE(
    ex_reg_id        integer,
    exam             character varying,
    exam_type        character varying,
    marks            numeric,
    attendance_marks numeric,
    academic_name    character varying,
    start_date       date,
    end_date         date,
    deadline         date,
    exam_status      character varying,
    username         character varying,
    reg_date         character varying
)
LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    v_count         integer;
BEGIN
    SELECT TRIM(b.br_name) INTO var_branch_name
      FROM public.branch b
     WHERE b.br_id = p_branch_id;

    /* ===== 'All' branch ===== */
    IF var_branch_name ILIKE 'all' THEN
        SELECT COUNT(*) INTO v_count
          FROM public.exam_reg er
         WHERE (ac_y_id_sp = 0 OR er.a_y_id = ac_y_id_sp);

        IF v_count > 0 THEN
            RETURN QUERY
            SELECT er.ex_reg_id, e.exam, er.exam_type, er.marks, er.attendance_marks,
                   a.academic_name, er.start_date, er.end_date, er.deadline,
                   er.exam_status, u.username,
                   TO_CHAR(er.reg_date, 'DD-Mon-YYYY HH24:MI')::VARCHAR
              FROM public.exam_reg       er
              JOIN public.academic_year  a  ON a.a_y_id   = er.a_y_id
              JOIN public.exam           e  ON e.ex_id    = er.ex_id
              JOIN public.user_branch    ub ON ub.u_br_id = er.u_br_id
              JOIN public.users          u  ON u.usr_id   = ub.usr_id
             WHERE (ac_y_id_sp = 0 OR a.a_y_id = ac_y_id_sp)
             ORDER BY er.ex_reg_id;
        ELSE
            RETURN QUERY
            SELECT NULL::integer, al.body::character varying, NULL::character varying,
                   NULL::numeric, NULL::numeric, NULL::character varying,
                   NULL::date, NULL::date, NULL::date,
                   NULL::character varying, NULL::character varying, NULL::character varying
              FROM public.alerts al
             WHERE al.title = 'NotFound'
             LIMIT 1;
        END IF;

    /* ===== Specific branch ===== */
    ELSE
        SELECT COUNT(*) INTO v_count
          FROM public.exam_reg er
          JOIN public.user_branch ub ON ub.u_br_id = er.u_br_id
         WHERE ub.br_id = p_branch_id
           AND (ac_y_id_sp = 0 OR er.a_y_id = ac_y_id_sp);

        IF v_count > 0 THEN
            RETURN QUERY
            SELECT er.ex_reg_id, e.exam, er.exam_type, er.marks, er.attendance_marks,
                   a.academic_name, er.start_date, er.end_date, er.deadline,
                   er.exam_status, u.username,
                   TO_CHAR(er.reg_date, 'DD-Mon-YYYY HH24:MI')::VARCHAR
              FROM public.exam_reg       er
              JOIN public.academic_year  a  ON a.a_y_id   = er.a_y_id
              JOIN public.exam           e  ON e.ex_id    = er.ex_id
              JOIN public.user_branch    ub ON ub.u_br_id = er.u_br_id
              JOIN public.users          u  ON u.usr_id   = ub.usr_id
             WHERE ub.br_id = p_branch_id
               AND (ac_y_id_sp = 0 OR a.a_y_id = ac_y_id_sp)
             ORDER BY er.ex_reg_id;
        ELSE
            -- BUG fix: previously returned only `al.body` (1 column); function
            -- requires 12. Pad with NULLs same as the 'All' branch fallback.
            RETURN QUERY
            SELECT NULL::integer, al.body::character varying, NULL::character varying,
                   NULL::numeric, NULL::numeric, NULL::character varying,
                   NULL::date, NULL::date, NULL::date,
                   NULL::character varying, NULL::character varying, NULL::character varying
              FROM public.alerts al
             WHERE al.title = 'NotFound'
             LIMIT 1;
        END IF;
    END IF;
END;
$function$;

ALTER FUNCTION public.exam_reg_show(integer, integer) OWNER TO postgres;

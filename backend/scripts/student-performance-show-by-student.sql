-- ============================================================================
-- student_performance_show — branch + optional student filter
-- p_br_id      : branch (0/All → all branches)
-- std_di_sp    : student-class id (0 → no filter, show all students for the branch)
-- ============================================================================
DROP FUNCTION IF EXISTS public.student_performance_show(integer);
DROP FUNCTION IF EXISTS public.student_performance_show(integer, integer);
CREATE OR REPLACE FUNCTION public.student_performance_show(
    p_br_id   integer,
    std_di_sp integer DEFAULT 0
)
RETURNS TABLE(
    st_per_id        integer,
    student_name     text,
    performance_name text,
    rate             text,
    reason           text,
    reg_date         date
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_branch_name text;
    v_count       integer;
BEGIN
    SELECT TRIM(br.br_name)
      INTO v_branch_name
      FROM public.branch br
     WHERE br.br_id = p_br_id;

    -- 'All' → all branches; student_name = "<name>  -  <branch>"
    IF v_branch_name ILIKE 'all' THEN
        SELECT COUNT(*) INTO v_count
          FROM public.student_performance sp
         WHERE (std_di_sp = 0 OR sp.std_cl_id = std_di_sp);

        IF v_count > 0 THEN
            RETURN QUERY
            SELECT
                sp.st_per_id                                       AS st_per_id,
                CONCAT(p.p_name, '  -  ', b.br_name)::text         AS student_name,
                perf.performance_name::text                        AS performance_name,
                r.rate::text                                       AS rate,
                sp.reason::text                                    AS reason,
                sp.reg_date::date                                  AS reg_date
              FROM public.student_performance sp
              JOIN public.student_class       sc   ON sc.std_cl_id = sp.std_cl_id
              JOIN public.student             st   ON st.std_id    = sc.std_id
              JOIN public.people              p    ON p.p_id       = st.p_id
              JOIN public.user_branch         ub   ON ub.u_br_id   = sp.u_br_id
              JOIN public.branch              b    ON b.br_id      = ub.br_id
              LEFT JOIN public.performance    perf ON perf.per_id  = sp.per_id
              LEFT JOIN public.rate           r    ON r.rate_id    = sp.rate_id
             WHERE (std_di_sp = 0 OR sp.std_cl_id = std_di_sp)
             ORDER BY sp.st_per_id ASC;
        ELSE
            RETURN QUERY
            SELECT NULL::integer, a.body::text, NULL::text, NULL::text, NULL::text, NULL::date
              FROM public.alerts a
             WHERE a.title = 'NotRegUpdate'
             LIMIT 1;
        END IF;

    -- Specific branch
    ELSE
        SELECT COUNT(*) INTO v_count
          FROM public.student_performance sp
          JOIN public.user_branch ub ON ub.u_br_id = sp.u_br_id
         WHERE ub.br_id = p_br_id
           AND (std_di_sp = 0 OR sp.std_cl_id = std_di_sp);

        IF v_count > 0 THEN
            RETURN QUERY
            SELECT
                sp.st_per_id                AS st_per_id,
                p.p_name::text              AS student_name,
                perf.performance_name::text AS performance_name,
                r.rate::text                AS rate,
                sp.reason::text             AS reason,
                sp.reg_date::date           AS reg_date
              FROM public.student_performance sp
              JOIN public.user_branch         ub   ON ub.u_br_id   = sp.u_br_id
              JOIN public.student_class       sc   ON sc.std_cl_id = sp.std_cl_id
              JOIN public.student             st   ON st.std_id    = sc.std_id
              JOIN public.people              p    ON p.p_id       = st.p_id
              LEFT JOIN public.performance    perf ON perf.per_id  = sp.per_id
              LEFT JOIN public.rate           r    ON r.rate_id    = sp.rate_id
             WHERE ub.br_id = p_br_id
               AND (std_di_sp = 0 OR sp.std_cl_id = std_di_sp)
             ORDER BY sp.st_per_id ASC;
        ELSE
            RETURN QUERY
            SELECT NULL::integer, a.body::text, NULL::text, NULL::text, NULL::text, NULL::date
              FROM public.alerts a
             WHERE a.title = 'NotRegUpdate'
             LIMIT 1;
        END IF;
    END IF;
END;
$function$;

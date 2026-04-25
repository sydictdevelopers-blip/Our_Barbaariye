-- FUNCTION: public.fn_student_state(integer)
--
-- PostgreSQL conversion of MySQL procedure `vw_student_state`.
-- Logic:
--   • Looks up branch name by p_br_id.
--   • If branch name = 'All' (case-insensitive), returns ALL inactive
--     students whose student_class.state = 'Continue' (no branch filter).
--   • Otherwise, filters by ub.br_id = p_br_id.
--   • State comparisons are case-insensitive (ILIKE) and trim whitespace
--     so 'Inactive', 'inactive', ' INACTIVE ' all match.
--   • Returns 0 rows when nothing matches; the frontend renders the
--     "This Information Was Not Found!" empty state.

DROP FUNCTION IF EXISTS public.fn_student_state(integer);

CREATE OR REPLACE FUNCTION public.fn_student_state(
    p_br_id integer
)
RETURNS TABLE(
    id          integer,
    student     text,
    state       text,
    reg_date    date,
    username    text
)
LANGUAGE plpgsql
STABLE
AS $BODY$
DECLARE
    v_branch_name text;
BEGIN
    SELECT TRIM(br.br_name)
      INTO v_branch_name
      FROM public.branch br
     WHERE br.br_id = p_br_id;

    IF v_branch_name ILIKE 'all' THEN
        RETURN QUERY
        SELECT DISTINCT
            s.std_id           AS id,
            p.p_name::text     AS student,
            s.state::text      AS state,
            sc.reg_date::date  AS reg_date,
            u.username::text   AS username
          FROM public.student        s
          JOIN public.people         p  ON p.p_id      = s.p_id
          JOIN public.student_class  sc ON sc.std_id   = s.std_id
          JOIN public.user_branch    ub ON ub.u_br_id  = s.u_br_id
          JOIN public.users          u  ON u.usr_id    = ub.usr_id
         WHERE TRIM(sc.state) ILIKE 'continue'
           AND TRIM(s.state)  ILIKE 'inactive'
         ORDER BY s.std_id DESC;
    ELSE
        RETURN QUERY
        SELECT DISTINCT
            s.std_id           AS id,
            p.p_name::text     AS student,
            s.state::text      AS state,
            sc.reg_date::date  AS reg_date,
            u.username::text   AS username
          FROM public.student        s
          JOIN public.people         p  ON p.p_id      = s.p_id
          JOIN public.student_class  sc ON sc.std_id   = s.std_id
          JOIN public.user_branch    ub ON ub.u_br_id  = s.u_br_id
          JOIN public.users          u  ON u.usr_id    = ub.usr_id
          JOIN public.class          cl ON cl.cl_id    = sc.cl_id
         WHERE TRIM(sc.state) ILIKE 'continue'
           AND TRIM(s.state)  ILIKE 'inactive'
           AND ub.br_id = p_br_id
         ORDER BY s.std_id DESC;
    END IF;
END;
$BODY$;

ALTER FUNCTION public.fn_student_state(integer) OWNER TO postgres;

-- ============================================================================
-- student_performance_select — student dropdown for Performance form
-- p_branch :  branch id (if branch_name = 'All' → all branches w/ branch suffix)
-- Returns  :  (std_cl_id, student)
-- ============================================================================
DROP FUNCTION IF EXISTS public.student_performance_select(integer);

CREATE OR REPLACE FUNCTION public.student_performance_select(p_branch integer)
    RETURNS TABLE(std_cl_id integer, student text)
    LANGUAGE 'plpgsql'
    COST 100
    STABLE SECURITY DEFINER PARALLEL UNSAFE
    ROWS 1000
AS $BODY$
DECLARE
    v_branch_name text;
BEGIN
    SELECT TRIM(b.br_name) INTO v_branch_name
      FROM public.branch b
     WHERE b.br_id = p_branch;

    -- 'All' branch → "<name>  -  <branch>"
    IF v_branch_name ILIKE 'all' THEN
        RETURN QUERY
        SELECT
            sc.std_cl_id                              AS std_cl_id,
            (p.p_name || '  -  ' || b.br_name)::text  AS student
          FROM public.people           p
          JOIN public.student          s   ON p.p_id    = s.p_id
          JOIN public.student_class    sc  ON sc.std_id = s.std_id
          JOIN public.academic_year    ac  ON ac.a_y_id = sc.a_y_id
          JOIN public.class            c   ON c.cl_id   = sc.cl_id
          JOIN public.branch           b   ON b.br_id   = c.br_id
         WHERE sc.state = 'Continue'
           AND ac.state = 'Active'
           AND s.state  = 'Active'
           AND p.state  = 'Active'
         ORDER BY p.p_name;

    -- Specific branch → "<name>"
    ELSE
        RETURN QUERY
        SELECT
            sc.std_cl_id   AS std_cl_id,
            p.p_name::text AS student
          FROM public.people           p
          JOIN public.student          s   ON p.p_id    = s.p_id
          JOIN public.student_class    sc  ON sc.std_id = s.std_id
          JOIN public.academic_year    ac  ON ac.a_y_id = sc.a_y_id
          JOIN public.class            c   ON c.cl_id   = sc.cl_id
         WHERE sc.state = 'Continue'
           AND ac.state = 'Active'
           AND s.state  = 'Active'
           AND p.state  = 'Active'
           AND c.br_id  = p_branch
         ORDER BY p.p_name;
    END IF;
END;
$BODY$;

ALTER FUNCTION public.student_performance_select(integer) OWNER TO postgres;

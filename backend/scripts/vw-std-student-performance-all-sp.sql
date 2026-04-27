-- ============================================================================
-- vw_std_student_performance_all — list students who have performance records
-- p_branch = 0 / 'All' branch  → student = "<std_id> - <name> - <tel> - <branch>"
-- otherwise (specific branch)  → student = "<std_id> - <name> - <tel>"
-- ============================================================================
DROP FUNCTION IF EXISTS public.vw_std_student_performance_all(integer);
CREATE OR REPLACE FUNCTION public.vw_std_student_performance_all(p_branch integer)
RETURNS TABLE(std_id integer, student text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_branch_name text;
BEGIN
    SELECT TRIM(b.br_name) INTO v_branch_name
      FROM public.branch b
     WHERE b.br_id = p_branch;

    IF v_branch_name ILIKE 'all' THEN
        RETURN QUERY
        SELECT s.std_id,
               concat_ws('  -  ', s.std_id::text, p.p_name, p.tel, b.br_name) AS student
          FROM public.student              s
          JOIN public.people               p  ON p.p_id        = s.p_id
          JOIN public.student_class        sc ON sc.std_id     = s.std_id
          JOIN public.student_performance  sp ON sp.std_cl_id  = sc.std_cl_id
          JOIN public.class                cl ON cl.cl_id      = sc.cl_id
          JOIN public.branch               b  ON b.br_id       = cl.br_id
         WHERE s.state  = 'Active'
           AND sc.state = 'Continue'
         GROUP BY s.std_id, p.p_name, p.tel, b.br_name
         ORDER BY s.std_id;
    ELSE
        RETURN QUERY
        SELECT s.std_id,
               concat_ws('  -  ', s.std_id::text, p.p_name, p.tel) AS student
          FROM public.student              s
          JOIN public.people               p  ON p.p_id        = s.p_id
          JOIN public.student_class        sc ON sc.std_id     = s.std_id
          JOIN public.student_performance  sp ON sp.std_cl_id  = sc.std_cl_id
          JOIN public.class                cl ON cl.cl_id      = sc.cl_id
         WHERE s.state  = 'Active'
           AND sc.state = 'Continue'
           AND cl.br_id = p_branch
         GROUP BY s.std_id, p.p_name, p.tel
         ORDER BY s.std_id;
    END IF;
END;
$function$;

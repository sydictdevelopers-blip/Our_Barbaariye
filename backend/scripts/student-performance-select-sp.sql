-- ============================================================================
-- student_performance_select — student dropdown for Performance form
--
-- Args:    p_branch integer — class branch id
-- Returns: (std_cl_id, student)  where student = "<std_id>  -   <p_name>"
--
-- GROUP BY sc.std_id deduplicates students with multiple Continue enrollments,
-- so each student appears once. MAX(sc.std_cl_id) keeps the most recent
-- enrollment id; s.std_id and p.p_name are added to GROUP BY so they remain
-- selectable inside concat().
-- ============================================================================
DROP FUNCTION IF EXISTS public.student_performance_select(integer);
DROP FUNCTION IF EXISTS public.student_performance_select(integer, text, integer);

CREATE OR REPLACE FUNCTION public.student_performance_select(p_branch integer)
    RETURNS TABLE(std_cl_id integer, student text)
    LANGUAGE sql
    STABLE
    PARALLEL SAFE
    ROWS 1000
AS $BODY$
    SELECT
        MAX(sc.std_cl_id) AS std_cl_id,
        concat(s.std_id, '  -   ', p.p_name)::text AS student
    FROM public.people p
    JOIN public.student       s  ON p.p_id    = s.p_id    AND s.state  = 'Active'
    JOIN public.student_class sc ON sc.std_id = s.std_id  AND sc.state = 'Continue'
    JOIN public.class         cl ON sc.cl_id  = cl.cl_id
    WHERE cl.br_id = p_branch
    GROUP BY sc.std_id, s.std_id, p.p_name;
$BODY$;

ALTER FUNCTION public.student_performance_select(integer) OWNER TO postgres;

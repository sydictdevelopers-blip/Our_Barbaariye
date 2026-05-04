-- ============================================================================
-- studentperformance_edit(p_class_id, p_batch_id, p_branch_id)
-- Returns the rows that drive the Student Performance Edit screen.
-- Adds std_cl_id, per_id, rate_id alongside the labelled columns so the
-- frontend can save back through student_performance_sp without a second
-- round-trip.
-- ============================================================================

DROP FUNCTION IF EXISTS public.studentperformance_edit(integer);
DROP FUNCTION IF EXISTS public.studentperformance_edit(integer, integer);
DROP FUNCTION IF EXISTS public.studentperformance_edit(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.studentperformance_edit(
    p_class_id  integer,
    p_batch_id  integer,
    p_branch_id integer
)
RETURNS TABLE(
    st_per_id   integer,
    std_cl_id   integer,
    per_id      integer,
    rate_id     integer,
    student     text,
    class       text,
    performance text,
    rate        text,
    reason      text
)
LANGUAGE plpgsql
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
DECLARE
    v_br_name character varying;
BEGIN
    SELECT br_name
      INTO v_br_name
      FROM branch
     WHERE br_id = p_branch_id;

    IF v_br_name = 'All' THEN
        RETURN QUERY
        SELECT
            sp.st_per_id::integer,
            sc.std_cl_id::integer,
            pf.per_id::integer,
            r.rate_id::integer,
            p.p_name::text            AS student,
            cl.class::text            AS class,
            pf.performance_name::text AS performance,
            r.rate::text              AS rate,
            sp.reason::text           AS reason
          FROM people p
          JOIN student         s  ON s.p_id        = p.p_id
          JOIN student_class   sc ON sc.std_id     = s.std_id
          JOIN class           cl ON cl.cl_id      = sc.cl_id
          JOIN student_performance sp ON sp.std_cl_id = sc.std_cl_id
          JOIN performance     pf ON pf.per_id     = sp.per_id
          JOIN rate            r  ON r.rate_id     = sp.rate_id
         ORDER BY sp.st_per_id ASC;
    ELSE
        RETURN QUERY
        SELECT
            sp.st_per_id::integer,
            sc.std_cl_id::integer,
            pf.per_id::integer,
            r.rate_id::integer,
            p.p_name::text            AS student,
            cl.class::text            AS class,
            pf.performance_name::text AS performance,
            r.rate::text              AS rate,
            sp.reason::text           AS reason
          FROM people p
          JOIN student         s  ON s.p_id        = p.p_id
          JOIN student_class   sc ON sc.std_id     = s.std_id
          JOIN class           cl ON cl.cl_id      = sc.cl_id
          JOIN student_performance sp ON sp.std_cl_id = sc.std_cl_id
          JOIN performance     pf ON pf.per_id     = sp.per_id
          JOIN rate            r  ON r.rate_id     = sp.rate_id
         WHERE sc.cl_id = p_class_id
           AND sc.b_id  = p_batch_id
           AND cl.br_id = p_branch_id
         ORDER BY sp.st_per_id ASC;
    END IF;
END;
$BODY$;

ALTER FUNCTION public.studentperformance_edit(integer, integer, integer)
OWNER TO postgres;

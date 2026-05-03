-- ============================================================================
-- performance_show — returns all rows from `performance` table
-- Usage: SELECT * FROM performance_show();
-- Returns columns (per_id, performance_name) so the frontend's `rowKey`
-- matches the underlying column name and update forms pre-fill correctly.
-- ============================================================================
DROP FUNCTION IF EXISTS public.performance_show();

CREATE OR REPLACE FUNCTION public.performance_show()
RETURNS TABLE(per_id integer, performance_name character varying)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $function$
    SELECT p.per_id, p.performance_name::character varying
    FROM performance p
    ORDER BY p.per_id;
$function$;

ALTER FUNCTION public.performance_show() OWNER TO postgres;

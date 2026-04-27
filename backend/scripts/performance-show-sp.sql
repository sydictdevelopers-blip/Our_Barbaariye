-- ============================================================================
-- performance_show — returns all rows from `performance` table
-- Usage: SELECT * FROM performance_show();
-- Raises a NOT_FOUND notice/exception when the table is empty so the
-- frontend can render an alert.
-- ============================================================================
DROP FUNCTION IF EXISTS public.performance_show();
CREATE OR REPLACE FUNCTION public.performance_show()
RETURNS TABLE(per_id integer, performance character varying)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.per_id AS id, p.performance_name AS performance
  FROM performance p
  ORDER BY p.per_id;

  -- not-found alert: raise when the performance table has no rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No data found in performance table'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$function$;

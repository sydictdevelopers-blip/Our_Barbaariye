-- ============================================================================
-- subject_by_level_academic_show — DISTINCT subjects ee leh subject_class link
-- level + academic_year + branch-kaas. Loo isticmaalo Subject dropdown-ka tab-ka
-- "Exam Schedule" → Add New si user-ku u arko KALIYA subjects-ka shaqaynayo.
--
-- Args:
--   p_lev_id  integer — level id (FK class.lev_id)
--   p_a_y_id  integer — academic_year id (subject_class.a_y_id)
--   p_br_id   integer — caller's branch id
--
-- Returns: (sub_id, label) DISTINCT subjects.
-- (sub_cl_id / cl_id / sh_id ee form-ku u baahan yahay waxaa lagu helaa wrapper
--  query-ga exam.js-ka via LATERAL JOIN.)
-- ============================================================================
DROP FUNCTION IF EXISTS public.subject_by_level_academic_show(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.subject_by_level_academic_show(
    p_lev_id integer,
    p_a_y_id integer,
    p_br_id  integer
)
RETURNS TABLE(sub_id integer, label character varying)
LANGUAGE sql
STABLE
PARALLEL SAFE
ROWS 1000
AS $BODY$
    SELECT s.sub_id, s.name
      FROM subjects s
      JOIN subject_class sc ON s.sub_id = sc.sub_id AND s.state = 'Active'
      JOIN class         cl ON sc.cl_id = cl.cl_id
     WHERE cl.lev_id  = p_lev_id
       AND sc.a_y_id  = p_a_y_id
       AND cl.br_id   = p_br_id
     GROUP BY s.sub_id;
$BODY$;

ALTER FUNCTION public.subject_by_level_academic_show(integer, integer, integer)
    OWNER TO postgres;

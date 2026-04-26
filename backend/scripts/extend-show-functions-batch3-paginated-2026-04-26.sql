-- ============================================================================
-- Migration: extend-show-functions-batch3-paginated-2026-04-26.sql
-- Date: 2026-04-26
-- Purpose: Add server-side search + pagination + branch filter to the heavy
--          dropdown / datatable SPs that previously returned 100k–1M rows.
--
--   Why: The api.js wrap (`SELECT * FROM (sp(...)) LIMIT n`) materialises the
--   full SP output before LIMIT is applied — a hard ceiling for 300+ schools.
--   Pushing search + LIMIT into the SP lets PG use Top-N heap sort instead of
--   sorting the whole population.
--
-- Signature convention:
--   foo_show(p_search TEXT, p_limit INTEGER, p_offset INTEGER, p_branch_id INTEGER)
--   - p_search '' or NULL -> no filter
--   - p_branch_id 0 OR matches 'All' branch -> no branch filter
--   - p_limit  defaults handled by caller (queries.js)
--   - p_offset defaults handled by caller (queries.js)
--
-- These SPs are intended to be called from queries.js entries that return
-- { sql, prePaginated: true }; api.js will skip its wrap-pagination layer.
-- ============================================================================


-- ============================================================================
-- 1) responsible_options_show — by name, paginated, branch via user_branch
-- ============================================================================
DROP FUNCTION IF EXISTS public.responsible_options_show();
DROP FUNCTION IF EXISTS public.responsible_options_show(text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.responsible_options_show(
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(res_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    var_pattern     TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    var_pattern := '%' || COALESCE(p_search, '') || '%';

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT r.res_id, p.p_name
        FROM responsible r
        JOIN people p ON p.p_id = r.p_id
        WHERE (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT DISTINCT r.res_id, p.p_name
        FROM responsible r
        JOIN people      p  ON p.p_id    = r.p_id
        JOIN user_branch ub ON ub.u_br_id = r.u_br_id
        WHERE ub.br_id = p_branch_id
          AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    END IF;
END;
$function$;


-- ============================================================================
-- 2) all_student_options_show — Active+Continue, by name, paginated, branch
-- ============================================================================
DROP FUNCTION IF EXISTS public.all_student_options_show();
DROP FUNCTION IF EXISTS public.all_student_options_show(text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.all_student_options_show(
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(std_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    var_pattern     TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    var_pattern := '%' || COALESCE(p_search, '') || '%';

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT DISTINCT s.std_id, p.p_name
        FROM student s
        JOIN people        p  ON p.p_id   = s.p_id
        JOIN student_class sc ON sc.std_id = s.std_id
        WHERE s.state = 'Active'
          AND sc.state = 'Continue'
          AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT DISTINCT s.std_id, p.p_name
        FROM student s
        JOIN people        p  ON p.p_id    = s.p_id
        JOIN student_class sc ON sc.std_id = s.std_id
        JOIN user_branch   ub ON ub.u_br_id = s.u_br_id
        WHERE s.state = 'Active'
          AND sc.state = 'Continue'
          AND ub.br_id = p_branch_id
          AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    END IF;
END;
$function$;


-- ============================================================================
-- 3) all_students_options_show — no state filter, by name, paginated, branch
-- ============================================================================
DROP FUNCTION IF EXISTS public.all_students_options_show();
DROP FUNCTION IF EXISTS public.all_students_options_show(text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.all_students_options_show(
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(std_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    var_pattern     TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    var_pattern := '%' || COALESCE(p_search, '') || '%';

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT s.std_id, p.p_name
        FROM student s
        JOIN people p ON p.p_id = s.p_id
        WHERE (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT s.std_id, p.p_name
        FROM student s
        JOIN people      p  ON p.p_id    = s.p_id
        JOIN user_branch ub ON ub.u_br_id = s.u_br_id
        WHERE ub.br_id = p_branch_id
          AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    END IF;
END;
$function$;


-- ============================================================================
-- 4) employee_options_show — by name, paginated, branch via emp.br_id (direct)
-- ============================================================================
DROP FUNCTION IF EXISTS public.employee_options_show();
DROP FUNCTION IF EXISTS public.employee_options_show(text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.employee_options_show(
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(emp_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    var_pattern     TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    var_pattern := '%' || COALESCE(p_search, '') || '%';

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT e.emp_id, p.p_name
        FROM employee e
        JOIN people p ON p.p_id = e.p_id
        WHERE (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT e.emp_id, p.p_name
        FROM employee e
        JOIN people p ON p.p_id = e.p_id
        WHERE e.br_id = p_branch_id
          AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    END IF;
END;
$function$;


-- ============================================================================
-- 5) people_options_show — by name, paginated, branch via people.u_br_id
--    (replaces the plain `SELECT p_id, p_name FROM people` query)
-- ============================================================================
DROP FUNCTION IF EXISTS public.people_options_show(text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.people_options_show(
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(p_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    var_pattern     TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    var_pattern := '%' || COALESCE(p_search, '') || '%';

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT p.p_id, p.p_name
        FROM people p
        WHERE (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT p.p_id, p.p_name
        FROM people      p
        JOIN user_branch ub ON ub.u_br_id = p.u_br_id
        WHERE ub.br_id = p_branch_id
          AND (COALESCE(p_search,'') = '' OR p.p_name ILIKE var_pattern)
        ORDER BY p.p_name
        LIMIT  p_limit
        OFFSET p_offset;
    END IF;
END;
$function$;


-- ============================================================================
-- 6) studentinfo_show — datatable, paginated; if p_std_id > 0 returns one row.
--    Search covers name, emis_id, id_card, tel, mother_phone (typical UX).
-- ============================================================================
DROP FUNCTION IF EXISTS public.studentinfo_show(integer);
DROP FUNCTION IF EXISTS public.studentinfo_show(integer, text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.studentinfo_show(
    p_std_id    integer DEFAULT 0,
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 10,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(
    std_id        integer,
    student_name  character varying,
    emis_id       character varying,
    id_card       character varying,
    tel           character varying,
    sex           character varying,
    dob           date,
    mothername    character varying,
    mother_phone  character varying,
    state         character varying,
    total_count   bigint
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    var_pattern     TEXT;
    var_has_search  BOOLEAN;
    var_branch_all  BOOLEAN;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;
    var_pattern    := '%' || COALESCE(p_search, '') || '%';
    var_has_search := COALESCE(p_search,'') <> '';
    var_branch_all := (p_branch_id = 0 OR var_branch_name = 'All');

    -- Single-row by id (search/limit/branch ignored)
    IF p_std_id > 0 THEN
        RETURN QUERY
        SELECT
            s.std_id,
            p.p_name AS student_name,
            s.emis_id,
            s.id_card,
            p.tel,
            p.sex,
            s.dob,
            s.mothername,
            s.mother_phone,
            p.state,
            1::bigint AS total_count
        FROM student s
        JOIN people p ON p.p_id = s.p_id
        WHERE s.std_id = p_std_id;
        RETURN;
    END IF;

    -- Paginated list with optional branch + search; total_count via window
    RETURN QUERY
    SELECT
        s.std_id,
        p.p_name AS student_name,
        s.emis_id,
        s.id_card,
        p.tel,
        p.sex,
        s.dob,
        s.mothername,
        s.mother_phone,
        p.state,
        COUNT(*) OVER () AS total_count
    FROM student s
    JOIN people      p  ON p.p_id    = s.p_id
    JOIN user_branch ub ON ub.u_br_id = s.u_br_id
    WHERE (var_branch_all OR ub.br_id = p_branch_id)
      AND (NOT var_has_search
           OR p.p_name      ILIKE var_pattern
           OR s.emis_id     ILIKE var_pattern
           OR s.id_card     ILIKE var_pattern
           OR p.tel         ILIKE var_pattern
           OR s.mother_phone ILIKE var_pattern)
    ORDER BY p.p_name
    LIMIT  p_limit
    OFFSET p_offset;
END;
$function$;


-- ============================================================================
-- End of migration.
-- ============================================================================

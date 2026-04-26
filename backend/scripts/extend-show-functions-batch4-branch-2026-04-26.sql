-- ============================================================================
-- Migration: extend-show-functions-batch4-branch-2026-04-26.sql
-- Date: 2026-04-26
-- Purpose: Convert remaining plain queries that target branch-aware tables
--          into SPs with the 'All'-branch pattern:
--            IF var_branch_name='All' OR p_branch_id=0 -> no branch filter
--            ELSE -> filter by branch
--
-- Tables WITH branch columns covered here:
--   class       (br_id)        -> class_options_show
--   exam        (u_br_id → ub.br_id) -> exam_options_show
--   accounts    (br_id)        -> accounts_show (rewritten)
--   bus         (u_br_id → ub.br_id) -> bus_show
--   responsible (u_br_id → ub.br_id) -> responsible_show
--   activity    (br_id_sp)     -> activity_show
--
-- Tables WITHOUT branch columns (skipped — global lookups stay plain):
--   level_type, grade, shift, subjects, branch, batch, activity_type,
--   activity-aliases, branch_transfer, academic_transfer, class_transfer,
--   lesson_activity_mark, school
--
-- INNER JOIN only — no LEFT JOIN (performance for 300+ schools).
-- ============================================================================


-- ============================================================================
-- 1) class_options_show — paginated dropdown for class picker
-- Frontend cols: cl_id, class
-- ============================================================================
DROP FUNCTION IF EXISTS public.class_options_show(text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.class_options_show(
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(cl_id integer, class character varying)
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
        SELECT cl.cl_id, cl.class
        FROM class cl
        WHERE (COALESCE(p_search,'') = '' OR cl.class ILIKE var_pattern)
        ORDER BY cl.class
        LIMIT  p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT cl.cl_id, cl.class
        FROM class cl
        WHERE cl.br_id = p_branch_id
          AND (COALESCE(p_search,'') = '' OR cl.class ILIKE var_pattern)
        ORDER BY cl.class
        LIMIT  p_limit
        OFFSET p_offset;
    END IF;
END;
$function$;


-- ============================================================================
-- 2) exam_options_show — paginated dropdown for exam picker
-- Frontend cols: ex_id, exam, state
-- ============================================================================
DROP FUNCTION IF EXISTS public.exam_options_show(text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.exam_options_show(
    p_search    text    DEFAULT '',
    p_limit     integer DEFAULT 25,
    p_offset    integer DEFAULT 0,
    p_branch_id integer DEFAULT 0
)
 RETURNS TABLE(ex_id integer, exam character varying)
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
        SELECT e.ex_id, e.exam
        FROM exam e
        WHERE (COALESCE(p_search,'') = '' OR e.exam ILIKE var_pattern)
        ORDER BY e.ordering
        LIMIT  p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT DISTINCT e.ex_id, e.exam
        FROM exam e
        JOIN user_branch ub ON ub.u_br_id = e.u_br_id
        WHERE ub.br_id = p_branch_id
          AND (COALESCE(p_search,'') = '' OR e.exam ILIKE var_pattern)
        ORDER BY e.exam
        LIMIT  p_limit
        OFFSET p_offset;
    END IF;
END;
$function$;


-- ============================================================================
-- 3) accounts_show — datatable rewrite (the legacy SP joined incorrectly)
-- Frontend uses `SELECT * FROM accounts` shape:
--   acc_id, acc_name, institution, balance, br_id, state, u_br_id, reg_date
-- ============================================================================
DROP FUNCTION IF EXISTS public.accounts_show(integer);
CREATE OR REPLACE FUNCTION public.accounts_show(p_branch_id integer)
 RETURNS TABLE(
    acc_id      integer,
    acc_name    character varying,
    institution character varying,
    balance     numeric,
    br_id       integer,
    state       character varying,
    u_br_id     integer,
    reg_date    timestamp without time zone
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT a.acc_id, a.acc_name, a.institution, a.balance,
               a.br_id, a.state, a.u_br_id, a.reg_date
        FROM accounts a
        ORDER BY a.acc_id;
    ELSE
        RETURN QUERY
        SELECT a.acc_id, a.acc_name, a.institution, a.balance,
               a.br_id, a.state, a.u_br_id, a.reg_date
        FROM accounts a
        WHERE a.br_id = p_branch_id
        ORDER BY a.acc_id;
    END IF;
END;
$function$;


-- ============================================================================
-- 4) bus_show — datatable for bus list (joined with employee for driver name)
-- Frontend cols: bus_id, bus_name, emp_id, employee_name, targo, u_br_id, reg_date
-- ============================================================================
DROP FUNCTION IF EXISTS public.bus_show(integer);
CREATE OR REPLACE FUNCTION public.bus_show(p_branch_id integer)
 RETURNS TABLE(
    bus_id        integer,
    bus_name      character varying,
    emp_id        integer,
    employee_name character varying,
    targo         character varying,
    u_br_id       integer,
    reg_date      timestamp without time zone
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT bs.bus_id, bs.bus_name, bs.emp_id, p.p_name AS employee_name,
               bs.targo, bs.u_br_id, bs.reg_date
        FROM bus bs
        JOIN employee em ON em.emp_id = bs.emp_id
        JOIN people   p  ON p.p_id   = em.p_id
        ORDER BY bs.bus_id;
    ELSE
        RETURN QUERY
        SELECT bs.bus_id, bs.bus_name, bs.emp_id, p.p_name AS employee_name,
               bs.targo, bs.u_br_id, bs.reg_date
        FROM bus bs
        JOIN employee    em ON em.emp_id = bs.emp_id
        JOIN people      p  ON p.p_id   = em.p_id
        JOIN user_branch ub ON ub.u_br_id = bs.u_br_id
        WHERE ub.br_id = p_branch_id
        ORDER BY bs.bus_id;
    END IF;
END;
$function$;


-- ============================================================================
-- 5) responsible_show — datatable for responsibles (joined with people)
-- Frontend `SELECT * FROM responsible` returns raw cols (res_id, p_id, phone,
-- state, u_br_id, reg_date). We add p_name as `responsible_name` for usability.
-- ============================================================================
DROP FUNCTION IF EXISTS public.responsible_show(integer);
CREATE OR REPLACE FUNCTION public.responsible_show(p_branch_id integer)
 RETURNS TABLE(
    res_id           integer,
    p_id             integer,
    responsible_name character varying,
    phone            character varying,
    state            character varying,
    u_br_id          integer,
    reg_date         date
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT r.res_id, r.p_id, p.p_name AS responsible_name,
               r.phone, r.state, r.u_br_id, r.reg_date
        FROM responsible r
        JOIN people p ON p.p_id = r.p_id
        ORDER BY r.res_id;
    ELSE
        RETURN QUERY
        SELECT r.res_id, r.p_id, p.p_name AS responsible_name,
               r.phone, r.state, r.u_br_id, r.reg_date
        FROM responsible   r
        JOIN people        p  ON p.p_id    = r.p_id
        JOIN user_branch   ub ON ub.u_br_id = r.u_br_id
        WHERE ub.br_id = p_branch_id
        ORDER BY r.res_id;
    END IF;
END;
$function$;


-- ============================================================================
-- 6) activity_show — datatable for activity list
-- Activity table uses `br_id_sp` for the branch column (legacy naming).
-- Frontend `SELECT * FROM activity` returns: act_id, activity_name, description,
-- state, br_id_sp, created_at
-- ============================================================================
DROP FUNCTION IF EXISTS public.activity_show(integer);
CREATE OR REPLACE FUNCTION public.activity_show(p_branch_id integer)
 RETURNS TABLE(
    act_id        integer,
    activity_name character varying,
    description   text,
    state         character varying,
    br_id_sp      integer,
    created_at    timestamp without time zone
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF p_branch_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT a.act_id, a.activity_name, a.description, a.state,
               a.br_id_sp, a.created_at
        FROM activity a
        ORDER BY a.act_id;
    ELSE
        RETURN QUERY
        SELECT a.act_id, a.activity_name, a.description, a.state,
               a.br_id_sp, a.created_at
        FROM activity a
        WHERE a.br_id_sp = p_branch_id
        ORDER BY a.act_id;
    END IF;
END;
$function$;


-- ============================================================================
-- End of migration.
-- ============================================================================

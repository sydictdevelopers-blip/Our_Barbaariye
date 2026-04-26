-- ============================================================================
-- Migration: extend-show-functions-2026-04-26.sql
-- Date: 2026-04-26
-- Purpose: Replace plain SELECT queries in backend/config/queries.js with
--          stored functions. Where a function already exists but is missing
--          columns the frontend needs, this migration extends the function
--          shape (column list) to match.
--
-- Conventions:
--   * Branch handling: var_branch_name = 'All' returns all branches, otherwise
--     filtered by p_branch_id (matches show-functions-all-check.sql).
--   * No LEFT JOIN. INNER JOIN only — performance-first for 300+ schools.
--     This requires the involved FK columns to be populated; if a row has a
--     NULL FK it will not appear (intentional — surfaces data integrity gaps).
--   * Explicit column lists (no SELECT *).
--   * ORDER BY uses the primary key of the driving table (indexed).
--
-- DROP FUNCTION ... is required when the RETURNS TABLE shape changes —
-- CREATE OR REPLACE alone fails with "cannot change return type".
-- ============================================================================


-- ============================================================================
-- 1) class_show — for ClassSetup tab
-- Frontend cols: cl_id, class_name, lev_id, level_name, gr_id, grade_name,
--                sh_id, shift_name, state, br_id, u_br_id, reg_date
-- ============================================================================
DROP FUNCTION IF EXISTS public.class_show(integer);
CREATE OR REPLACE FUNCTION public.class_show(p_branch_id integer)
 RETURNS TABLE(
    cl_id        integer,
    class_name   character varying,
    lev_id       integer,
    level_name   character varying,
    gr_id        integer,
    grade_name   character varying,
    sh_id        integer,
    shift_name   character varying,
    state        character varying,
    br_id        integer,
    u_br_id      integer,
    reg_date     date
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            cl.cl_id,
            cl.class      AS class_name,
            cl.lev_id,
            l.level       AS level_name,
            cl.gr_id,
            g.grade_name,
            cl.sh_id,
            sh.shift      AS shift_name,
            cl.state,
            cl.br_id,
            cl.u_br_id,
            cl.reg_date
        FROM class cl
        JOIN shift  sh ON sh.sh_id = cl.sh_id
        JOIN levels l  ON l.lev_id = cl.lev_id
        JOIN grade  g  ON g.gr_id  = cl.gr_id
        ORDER BY cl.cl_id;
    ELSE
        RETURN QUERY
        SELECT
            cl.cl_id,
            cl.class      AS class_name,
            cl.lev_id,
            l.level       AS level_name,
            cl.gr_id,
            g.grade_name,
            cl.sh_id,
            sh.shift      AS shift_name,
            cl.state,
            cl.br_id,
            cl.u_br_id,
            cl.reg_date
        FROM class cl
        JOIN shift  sh ON sh.sh_id = cl.sh_id
        JOIN levels l  ON l.lev_id = cl.lev_id
        JOIN grade  g  ON g.gr_id  = cl.gr_id
        WHERE cl.br_id = p_branch_id
        ORDER BY cl.cl_id;
    END IF;
END;
$function$;


-- ============================================================================
-- 2) class_formaster_show — for ClassFormaster tab
-- Frontend cols: c_f_id, cl_id, class_name, emp_id, person_name,
--                std_id, student_name, a_y_id, academic_name,
--                state, reg_date, username
-- Filters: branch (with 'All' pattern) + academic year (always applied)
-- ============================================================================
DROP FUNCTION IF EXISTS public.class_formaster_show(integer, integer);
CREATE OR REPLACE FUNCTION public.class_formaster_show(p_branch_id integer, p_academic_year integer)
 RETURNS TABLE(
    c_f_id         integer,
    cl_id          integer,
    class_name     character varying,
    emp_id         integer,
    person_name    character varying,
    std_id         integer,
    student_name   character varying,
    a_y_id         integer,
    academic_name  character varying,
    state          character varying,
    reg_date       date,
    username       character varying
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            cf.c_f_id,
            cf.cl_id,
            c.class           AS class_name,
            cf.emp_id,
            p1.p_name         AS person_name,
            cf.std_id,
            p2.p_name         AS student_name,
            cf.a_y_id,
            ay.academic_name,
            cf.state,
            cf.reg_date,
            u.username
        FROM class_formaster cf
        JOIN class         c   ON c.cl_id   = cf.cl_id
        JOIN employee      em  ON em.emp_id = cf.emp_id
        JOIN people        p1  ON p1.p_id   = em.p_id
        JOIN student       s   ON s.std_id  = cf.std_id
        JOIN people        p2  ON p2.p_id   = s.p_id
        JOIN user_branch   ub  ON ub.u_br_id = cf.u_br_id
        JOIN users         u   ON u.usr_id  = ub.usr_id
        JOIN academic_year ay  ON ay.a_y_id = cf.a_y_id
        WHERE cf.a_y_id = p_academic_year
        ORDER BY cf.c_f_id;
    ELSE
        RETURN QUERY
        SELECT
            cf.c_f_id,
            cf.cl_id,
            c.class           AS class_name,
            cf.emp_id,
            p1.p_name         AS person_name,
            cf.std_id,
            p2.p_name         AS student_name,
            cf.a_y_id,
            ay.academic_name,
            cf.state,
            cf.reg_date,
            u.username
        FROM class_formaster cf
        JOIN class         c   ON c.cl_id   = cf.cl_id
        JOIN employee      em  ON em.emp_id = cf.emp_id
        JOIN people        p1  ON p1.p_id   = em.p_id
        JOIN student       s   ON s.std_id  = cf.std_id
        JOIN people        p2  ON p2.p_id   = s.p_id
        JOIN user_branch   ub  ON ub.u_br_id = cf.u_br_id
        JOIN users         u   ON u.usr_id  = ub.usr_id
        JOIN academic_year ay  ON ay.a_y_id = cf.a_y_id
        WHERE ub.br_id  = p_branch_id
          AND cf.a_y_id = p_academic_year
        ORDER BY cf.c_f_id;
    END IF;
END;
$function$;


-- ============================================================================
-- 3) lesson_activity_show — REPLACED with class+academic_year filter signature
-- Old signature was (p_branch_id) and returned a different legacy shape that
-- no caller in queries.js references. New signature matches what the
-- LessonActivityMarksTab needs.
-- Frontend cols: ac_t_id, ac_id, activity_name, cl_id, class_name,
--                sub_cl_id, subject_name, marks, description, deadline,
--                e_r_id, reg_date
-- ============================================================================
DROP FUNCTION IF EXISTS public.lesson_activity_show(integer);
DROP FUNCTION IF EXISTS public.lesson_activity_show(integer, integer);
CREATE OR REPLACE FUNCTION public.lesson_activity_show(p_cl_id integer, p_a_y_id integer)
 RETURNS TABLE(
    ac_t_id         integer,
    ac_id           integer,
    activity_name   character varying,
    cl_id           integer,
    class_name      character varying,
    sub_cl_id       integer,
    subject_name    character varying,
    marks           numeric,
    description     text,
    deadline        date,
    e_r_id          integer,
    reg_date        timestamp without time zone
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        lat.ac_t_id,
        lat.ac_id,
        act.type        AS activity_name,
        lat.cl_id,
        c.class         AS class_name,
        lat.sub_cl_id,
        su.name         AS subject_name,
        lat.marks,
        lat.description,
        lat.deadline,
        lat.e_r_id,
        lat.reg_date
    FROM lesson_activity lat
    JOIN activity_type act ON act.ac_id     = lat.ac_id
    JOIN class         c   ON c.cl_id       = lat.cl_id
    JOIN subject_class sc  ON sc.sub_cl_id  = lat.sub_cl_id
    JOIN subjects      su  ON su.sub_id     = sc.sub_id
    WHERE lat.cl_id = p_cl_id
      AND sc.a_y_id = p_a_y_id
    ORDER BY lat.ac_t_id;
END;
$function$;


-- ============================================================================
-- 4) responsible_with_no_student_show — REPLACED to match frontend cols
-- Old shape: (result text, id, responsiple text, phone_one, phone_two) with a
-- 'Not found' fallback row. Frontend expects:
-- (res_id, responsible_name, phone1, phone2) with no fallback row.
-- Logic: list responsibles whose students are NOT (Active AND class Continue)
-- — preserves the original plain query semantics from queries.js.
-- ============================================================================
DROP FUNCTION IF EXISTS public.responsible_with_no_student_show();
CREATE OR REPLACE FUNCTION public.responsible_with_no_student_show()
 RETURNS TABLE(
    res_id            integer,
    responsible_name  character varying,
    phone1            character varying,
    phone2            character varying
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        r.res_id,
        p.p_name AS responsible_name,
        p.tel    AS phone1,
        r.phone  AS phone2
    FROM responsible r
    JOIN people p ON p.p_id = r.p_id
    WHERE r.res_id NOT IN (
        SELECT DISTINCT s.res_id
        FROM student s
        JOIN student_class sc ON sc.std_id = s.std_id
        WHERE s.state = 'Active' AND sc.state = 'Continue'
    )
    ORDER BY p.p_name;
END;
$function$;


-- ============================================================================
-- End of migration.
-- ============================================================================

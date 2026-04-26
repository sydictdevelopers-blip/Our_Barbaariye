-- ============================================================================
-- Migration: extend-show-functions-batch2-2026-04-26.sql
-- Date: 2026-04-26
-- Purpose: Convert remaining JOIN-based plain queries in queries.js to
--          stored functions. Skips simple `SELECT * FROM table` queries —
--          those are already as simple as possible and gain nothing from
--          being wrapped in a function.
--
-- Conventions (same as batch 1):
--   * INNER JOIN only (no LEFT JOIN) — performance-first for 300+ schools.
--   * Explicit column lists; column names preserved from plain queries
--     so frontend continues to work unchanged.
--   * Branch-aware SPs use the var_branch_name='All' pattern.
-- ============================================================================


-- ============================================================================
-- Single-row lookups (used by edit modals)
-- ============================================================================

-- ----- lesson_plan_row_show -----
DROP FUNCTION IF EXISTS public.lesson_plan_row_show(integer);
CREATE OR REPLACE FUNCTION public.lesson_plan_row_show(p_l_p_id integer)
 RETURNS TABLE(
    l_p_id      integer,
    emp_id      integer,
    sub_cl_id   integer,
    chap_id     integer,
    topic       character varying,
    page        character varying,
    description text,
    u_br_id     integer,
    reg_date    date,
    cl_id       integer,
    a_y_id      integer
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        lp.l_p_id,
        lp.emp_id,
        lp.sub_cl_id,
        lp.chap_id,
        lp.topic,
        lp.page,
        lp.description,
        lp.u_br_id,
        lp.reg_date,
        sc.cl_id,
        sc.a_y_id
    FROM lesson_plan lp
    JOIN subject_class sc ON sc.sub_cl_id = lp.sub_cl_id
    WHERE lp.l_p_id = p_l_p_id;
END;
$function$;


-- ----- lesson_activity_row_show -----
DROP FUNCTION IF EXISTS public.lesson_activity_row_show(integer);
CREATE OR REPLACE FUNCTION public.lesson_activity_row_show(p_ac_t_id integer)
 RETURNS TABLE(
    ac_t_id     integer,
    ac_id       integer,
    cl_id       integer,
    sub_cl_id   integer,
    marks       numeric,
    description text,
    deadline    character varying,
    e_r_id      integer,
    a_y_id      integer
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        lat.ac_t_id,
        lat.ac_id,
        lat.cl_id,
        lat.sub_cl_id,
        lat.marks,
        lat.description,
        TO_CHAR(lat.deadline, 'YYYY-MM-DD')::character varying AS deadline,
        lat.e_r_id,
        sc.a_y_id
    FROM lesson_activity lat
    JOIN subject_class sc ON sc.sub_cl_id = lat.sub_cl_id
    WHERE lat.ac_t_id = p_ac_t_id;
END;
$function$;


-- ============================================================================
-- Datatable lists with JOINs
-- ============================================================================

-- ----- studentinfo_show -----
-- p_std_id = 0 -> all students; otherwise filter by std_id
DROP FUNCTION IF EXISTS public.studentinfo_show(integer);
CREATE OR REPLACE FUNCTION public.studentinfo_show(p_std_id integer)
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
    state         character varying
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_std_id = 0 THEN
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
            p.state
        FROM student s
        JOIN people p ON p.p_id = s.p_id
        ORDER BY p.p_name;
    ELSE
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
            p.state
        FROM student s
        JOIN people p ON p.p_id = s.p_id
        WHERE s.std_id = p_std_id
        ORDER BY p.p_name;
    END IF;
END;
$function$;


-- ----- studentinfo_duplicates_show -----
-- Lists students whose name occurs more than once (with dup_count window).
DROP FUNCTION IF EXISTS public.studentinfo_duplicates_show();
CREATE OR REPLACE FUNCTION public.studentinfo_duplicates_show()
 RETURNS TABLE(
    std_id        integer,
    student_name  character varying,
    emis_id       character varying,
    id_card       character varying,
    tel           character varying,
    sex           character varying,
    dup_count     bigint
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.std_id,
        p.p_name AS student_name,
        s.emis_id,
        s.id_card,
        p.tel,
        p.sex,
        COUNT(*) OVER (PARTITION BY p.p_name) AS dup_count
    FROM student s
    JOIN people p ON p.p_id = s.p_id
    WHERE p.p_name IN (
        SELECT p2.p_name
        FROM student s2
        JOIN people p2 ON p2.p_id = s2.p_id
        GROUP BY p2.p_name
        HAVING COUNT(*) > 1
    )
    ORDER BY p.p_name;
END;
$function$;


-- ============================================================================
-- Dropdown options with JOINs (column names preserved as in plain queries)
-- ============================================================================

-- ----- responsible_options_show -----
DROP FUNCTION IF EXISTS public.responsible_options_show();
CREATE OR REPLACE FUNCTION public.responsible_options_show()
 RETURNS TABLE(res_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT r.res_id, p.p_name
    FROM responsible r
    JOIN people p ON p.p_id = r.p_id
    ORDER BY p.p_name;
END;
$function$;


-- ----- all_student_options_show -----
-- Active students whose class state is Continue (DISTINCT)
DROP FUNCTION IF EXISTS public.all_student_options_show();
CREATE OR REPLACE FUNCTION public.all_student_options_show()
 RETURNS TABLE(std_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT s.std_id, p.p_name
    FROM student s
    JOIN people p ON p.p_id = s.p_id
    JOIN student_class sc ON sc.std_id = s.std_id
    WHERE s.state = 'Active' AND sc.state = 'Continue'
    ORDER BY p.p_name;
END;
$function$;


-- ----- all_students_options_show -----
-- All students, no filter
DROP FUNCTION IF EXISTS public.all_students_options_show();
CREATE OR REPLACE FUNCTION public.all_students_options_show()
 RETURNS TABLE(std_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT s.std_id, p.p_name
    FROM student s
    JOIN people p ON p.p_id = s.p_id
    ORDER BY p.p_name;
END;
$function$;


-- ----- student_options_show -----
-- Active people, filtered by academic year + class
DROP FUNCTION IF EXISTS public.student_options_show(integer, integer);
CREATE OR REPLACE FUNCTION public.student_options_show(p_a_y_id integer, p_cl_id integer)
 RETURNS TABLE(std_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT s.std_id, p.p_name
    FROM student s
    JOIN people p ON p.p_id = s.p_id
    JOIN student_class sc ON sc.std_id = s.std_id
    WHERE p.state = 'Active'
      AND sc.a_y_id = p_a_y_id
      AND sc.cl_id  = p_cl_id
    ORDER BY p.p_name;
END;
$function$;


-- ----- student_class_options_show -----
-- p_b_id = 0 -> ignore batch filter
DROP FUNCTION IF EXISTS public.student_class_options_show(integer, integer, integer);
CREATE OR REPLACE FUNCTION public.student_class_options_show(p_a_y_id integer, p_cl_id integer, p_b_id integer)
 RETURNS TABLE(std_cl_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_b_id = 0 THEN
        RETURN QUERY
        SELECT sc.std_cl_id, p.p_name
        FROM student_class sc
        JOIN student st ON st.std_id = sc.std_id
        JOIN people  p  ON p.p_id    = st.p_id
        WHERE sc.a_y_id = p_a_y_id
          AND sc.cl_id  = p_cl_id
        ORDER BY p.p_name;
    ELSE
        RETURN QUERY
        SELECT sc.std_cl_id, p.p_name
        FROM student_class sc
        JOIN student st ON st.std_id = sc.std_id
        JOIN people  p  ON p.p_id    = st.p_id
        WHERE sc.a_y_id = p_a_y_id
          AND sc.cl_id  = p_cl_id
          AND sc.b_id   = p_b_id
        ORDER BY p.p_name;
    END IF;
END;
$function$;


-- ----- lesson_activity_options_show -----
DROP FUNCTION IF EXISTS public.lesson_activity_options_show(integer, integer);
CREATE OR REPLACE FUNCTION public.lesson_activity_options_show(p_cl_id integer, p_a_y_id integer)
 RETURNS TABLE(ac_t_id integer, activity_label text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        la.ac_t_id,
        CONCAT(at.type, ' - ', su.name) AS activity_label
    FROM lesson_activity la
    JOIN activity_type at ON at.ac_id    = la.ac_id
    JOIN subject_class sc ON sc.sub_cl_id = la.sub_cl_id
    JOIN subjects      su ON su.sub_id    = sc.sub_id
    WHERE la.cl_id = p_cl_id
      AND sc.a_y_id = p_a_y_id
    ORDER BY activity_label;
END;
$function$;


-- ----- employee_options_show -----
DROP FUNCTION IF EXISTS public.employee_options_show();
CREATE OR REPLACE FUNCTION public.employee_options_show()
 RETURNS TABLE(emp_id integer, p_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT e.emp_id, p.p_name
    FROM employee e
    JOIN people p ON p.p_id = e.p_id
    ORDER BY p.p_name;
END;
$function$;


-- ----- exam_reg_options_show -----
DROP FUNCTION IF EXISTS public.exam_reg_options_show();
CREATE OR REPLACE FUNCTION public.exam_reg_options_show()
 RETURNS TABLE(ex_reg_id integer, exam character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT ex.ex_reg_id, e.exam
    FROM exam_reg ex
    JOIN exam e ON e.ex_id = ex.ex_id
    ORDER BY ex.ex_reg_id;
END;
$function$;


-- ============================================================================
-- End of migration.
-- ============================================================================

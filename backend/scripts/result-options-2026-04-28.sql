-- ============================================================================
-- result-options-2026-04-28.sql
-- Functions ee Manage Result → Result tab dropdowns (PostgreSQL).
--
-- MySQL asal:
--   - subjects_class                 → PG: subject_class
--   - subjects.su_id, subjects.name  → PG: subjects.sub_id, subjects.name
--   - exam.e_id, exam.name           → PG: exam.ex_id,  exam.exam
--   - exam_registration.e_r_id       → PG: exam_reg.ex_reg_id
--   - branch.name                    → PG: branch.br_name
--
-- 1) result_academic_options(p_cl_id)
--      - Sannadaha academic ee class-ka leeyahay subject_class.
--
-- 2) result_subject_options(p_cl_id, p_a_y_id)
--      - Subjects-ka loo qoondeeyey class+academic; "Attendance" waa la kala saaray.
--
-- 3) vw_exam_res_all(p_cl_id, p_a_y_id, p_br_id)
--      - Exams-ka assign-ed (state='Active') ee class+academic+branch.
--      - Branch.br_name='All' (ama p_br_id=0) → muuji DHAMMAAN branches;
--          name = "<exam>  -  <branch>"
--      - Else → kaliya branch-ka la doortay (name = "<exam>")
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) result_academic_options
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.result_academic_options(integer);
CREATE OR REPLACE FUNCTION public.result_academic_options(p_cl_id integer)
 RETURNS TABLE(a_y_id integer, academic_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT a.a_y_id, a.academic_name
    FROM subject_class sc
    JOIN academic_year a ON a.a_y_id = sc.a_y_id
    WHERE sc.cl_id = p_cl_id
    GROUP BY a.a_y_id, a.academic_name
    ORDER BY a.a_y_id DESC;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 2) result_subject_options
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.result_subject_options(integer, integer);
CREATE OR REPLACE FUNCTION public.result_subject_options(p_cl_id integer, p_a_y_id integer)
 RETURNS TABLE(sub_id integer, name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT su.sub_id, su.name
    FROM subject_class sc
    JOIN subjects su ON su.sub_id = sc.sub_id
    WHERE sc.cl_id = p_cl_id
      AND sc.a_y_id = p_a_y_id
      AND su.name <> 'Attendance'
    ORDER BY su.name;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 3) vw_exam_res_all
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.vw_exam_res_all(integer, integer, integer);
CREATE OR REPLACE FUNCTION public.vw_exam_res_all(
    p_cl_id  integer,
    p_a_y_id integer,
    p_br_id  integer
)
 RETURNS TABLE(ex_reg_id integer, exam_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_br_id;

    IF p_br_id = 0 OR var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT
            er.ex_reg_id,
            (e.exam || '  -  ' || b.br_name)::character varying AS exam_name
        FROM exam_reg er
        JOIN exam               e   ON e.ex_id   = er.ex_id
        JOIN assign_class_exam  ass ON ass.er_id = er.ex_reg_id
        JOIN branch             b   ON b.br_id   = er.br_id
        WHERE ass.cl_id  = p_cl_id
          AND er.a_y_id  = p_a_y_id
          AND ass.state  = 'Active'
        ORDER BY e.ordering, e.exam;
    ELSE
        RETURN QUERY
        SELECT er.ex_reg_id, e.exam
        FROM exam_reg er
        JOIN exam               e   ON e.ex_id   = er.ex_id
        JOIN assign_class_exam  ass ON ass.er_id = er.ex_reg_id
        WHERE er.br_id   = p_br_id
          AND ass.cl_id  = p_cl_id
          AND er.a_y_id  = p_a_y_id
          AND ass.state  = 'Active'
        ORDER BY e.ordering, e.exam;
    END IF;
END;
$function$;

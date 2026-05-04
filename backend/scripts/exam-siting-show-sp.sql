-- ============================================================================
-- exam_siting_show — list exam settings for a branch (or all branches if 'All')
--
-- Adds `a_y_id` to the returned columns so the Edit modal in crudConfig.jsx
-- (field { rowKey: 'a_y_id', ... } for Academic Year) can pre-fill the
-- Academic Year dropdown. Without it, fromRow gets undefined and the select
-- shows empty on Update.
-- ============================================================================
DROP FUNCTION IF EXISTS public.exam_siting_show(integer);

CREATE OR REPLACE FUNCTION public.exam_siting_show(p_branch_id integer)
RETURNS TABLE(
    ex_set_id            integer,
    a_y_id               integer,
    academic_name        character varying,
    percentage_fail_pass numeric,
    attendance_marks     numeric,
    activity_marks       numeric,
    username             character varying,
    reg_date             date
)
LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    IF var_branch_name = 'All' THEN
        RETURN QUERY
        SELECT  e.ex_set_id,
                a.a_y_id,
                a.academic_name,
                e.percentage_fail_pass,
                e.attendance_marks,
                e.activity_marks,
                u.username,
                DATE(e.reg_date)
        FROM exam_siting e
        JOIN academic_year a ON a.a_y_id = e.a_y_id
        JOIN user_branch  ub ON ub.u_br_id = e.u_br_id
        JOIN users         u ON u.usr_id = ub.usr_id
        ORDER BY e.ex_set_id;
    ELSE
        RETURN QUERY
        SELECT  e.ex_set_id,
                a.a_y_id,
                a.academic_name,
                e.percentage_fail_pass,
                e.attendance_marks,
                e.activity_marks,
                u.username,
                DATE(e.reg_date)
        FROM exam_siting e
        JOIN academic_year a ON a.a_y_id = e.a_y_id
        JOIN user_branch  ub ON ub.u_br_id = e.u_br_id
        JOIN users         u ON u.usr_id = ub.usr_id
        WHERE ub.br_id = p_branch_id
        ORDER BY e.ex_set_id;
    END IF;
END;
$function$;

ALTER FUNCTION public.exam_siting_show(integer) OWNER TO postgres;

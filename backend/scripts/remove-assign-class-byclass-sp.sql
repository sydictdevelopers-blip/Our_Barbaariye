-- remove_assign_class_byclass_sp(cl_id_sp, b_id_sp, a_y_id_sp, ex_id_sp, u_br_id_sp, br_id_sp)
-- Asalka MySQL: Remove_Assign_Class_ByClass.
-- Ka tirtiraa dhammaan assign_class_exam rows-ka u dhigma class+batch+exam_reg
-- iyo branch+academic la sheegay.
--
-- Hagaajinta (la mid byexam): br_id_sp wuxuu ka socdaa session-ka frontend-ka
-- si SP iyo dropdown-ka exam-ku ay isticmaalaan isla br_id source ah.
-- 'All' branch handling: haddii branch_name='All', filter-ka branch-ka waxaa
-- la dhaafaa. Haddii kale, match-ka exam_reg.br_id ee la doortay AMA
-- exam_reg-ka All-branch (universal).

DROP FUNCTION IF EXISTS public.remove_assign_class_byclass_sp(integer, integer, integer, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.remove_assign_class_byclass_sp(integer, integer, integer, integer, integer, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.remove_assign_class_byclass_sp(
    cl_id_sp   integer,
    b_id_sp    integer,
    a_y_id_sp  integer,
    ex_id_sp   integer,
    u_br_id_sp integer,
    br_id_sp   integer
)
RETURNS TABLE(result text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_ok      boolean;
    v_branch_name  varchar;
    v_count        integer;
BEGIN
    -- Hubi user-ka inuu Active oo Unlocked yahay
    SELECT EXISTS (
        SELECT 1
          FROM users       u
          JOIN user_branch ub ON ub.usr_id = u.usr_id
         WHERE u.lock_user = 'Unlocked'
           AND u.state     = 'Active'
           AND ub.u_br_id  = u_br_id_sp
    ) INTO v_user_ok;

    IF NOT v_user_ok THEN
        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Userlock' LIMIT 1;
        RETURN;
    END IF;

    SELECT TRIM(br_name) INTO v_branch_name FROM branch WHERE br_id = br_id_sp;

    -- DELETE oo handling 'All' branch
    DELETE FROM assign_class_exam
     WHERE cl_id = cl_id_sp
       AND b_id  = b_id_sp
       AND er_id IN (
           SELECT er.ex_reg_id
             FROM exam_reg er
             JOIN branch   bb ON bb.br_id = er.br_id
            WHERE er.ex_id  = ex_id_sp
              AND er.a_y_id = a_y_id_sp
              AND (
                  v_branch_name = 'All'
                  OR er.br_id = br_id_sp
                  OR TRIM(bb.br_name) = 'All'
              )
       );

    GET DIAGNOSTICS v_count = ROW_COUNT;

    IF v_count > 0 THEN
        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'Delete' LIMIT 1;
    ELSE
        RETURN QUERY SELECT a.body::text FROM alerts a WHERE a.title = 'NotFound' LIMIT 1;
    END IF;
END;
$function$;

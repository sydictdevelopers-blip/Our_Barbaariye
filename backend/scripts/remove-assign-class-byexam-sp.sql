-- remove_assign_class_byexam_sp(a_y_id_sp, ex_id_sp, u_br_id_sp, br_id_sp)
-- Asalka MySQL: Remove_Assign_Class_ByExam.
-- Ka tirtiraa DHAMMAAN assign_class_exam rows-ka u dhigma exam_reg-ka iyo
-- branch + academic-ka la sheegay.
--
-- Hagaajinta: br_id_sp wuxuu ka socdaa session-ka frontend-ka — tani waxay
-- xal u tahay kiis ay user-ku ku jirto branch "All" (br_name='All') iyadoo
-- u_br_id-keenu uu xidhan yahay branch gaar ah. Sidaas darteed SP iyo
-- dropdown-ka exam-ku waxay isticmaalaan isla br_id source ah.
--
-- 'All' branch handling: haddii branch_name='All', filter-ka branch-ka waxaa
-- la dhaafaa (user-ka All wuxuu arkaa & tirtiraa wax kasta). Haddii kale,
-- match-ka exam_reg.br_id ee la doortay AMA exam_reg-ka All-branch (universal).
--
-- Schema mapping:
--   users.usr_id, user_branch.usr_id, exam_reg, assign_class_exam.a_c_ex.

DROP FUNCTION IF EXISTS public.remove_assign_class_byexam_sp(integer, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.remove_assign_class_byexam_sp(integer, integer, integer, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.remove_assign_class_byexam_sp(
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
    -- 1) Hubi user-ka inuu Active oo Unlocked yahay
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

    -- 2) Qaado magaca branch-ka session-ka (si loo go'aamiyo 'All' kiis-ka)
    SELECT TRIM(br_name) INTO v_branch_name FROM branch WHERE br_id = br_id_sp;

    -- 3) DELETE oo handling 'All' branch
    DELETE FROM assign_class_exam
     WHERE er_id IN (
         SELECT er.ex_reg_id
           FROM exam_reg er
           JOIN branch   bb ON bb.br_id = er.br_id
          WHERE er.ex_id  = ex_id_sp
            AND er.a_y_id = a_y_id_sp
            AND (
                v_branch_name = 'All'              -- User-ka 'All' wax kasta wuu arkaa
                OR er.br_id = br_id_sp             -- Branch sax ah
                OR TRIM(bb.br_name) = 'All'        -- Exam-reg-ka 'All' branch (universal)
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

-- exam_sp(ex_id_sp, exam_sp_v, ordering_sp, u_br_id_sp, oper) — PostgreSQL.
-- Asalka MySQL: exam_sp; logic-ka isagoo isku mid ah.
-- Frontend (crudConfig.Exam) wuxuu sii diraa 5 params; DB-da hore waxay rabtay 6
-- (language_sp), kaas oo aan u baahnayn — alerts ka qaadnaa title-ka kaliya
-- (u shabaha assign_class_exam_sp).

DROP FUNCTION IF EXISTS public.exam_sp(integer, varchar, integer, integer, integer, varchar) CASCADE;
DROP FUNCTION IF EXISTS public.exam_sp(integer, varchar, integer, integer, varchar) CASCADE;

CREATE OR REPLACE FUNCTION public.exam_sp(
    ex_id_sp    integer,
    exam_sp_v   varchar,
    ordering_sp integer,
    u_br_id_sp  integer,
    oper        varchar
)
RETURNS varchar
LANGUAGE plpgsql
AS $function$
DECLARE
    msg VARCHAR;
BEGIN
    IF oper = 'insert' THEN
        IF EXISTS (
            SELECT 1 FROM exam
             WHERE lower(exam) = lower(exam_sp_v)
               AND u_br_id    = u_br_id_sp
        ) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert' LIMIT 1;
        ELSE
            INSERT INTO exam (exam, ordering, u_br_id, reg_date)
            VALUES (exam_sp_v, ordering_sp, u_br_id_sp, now());

            SELECT body INTO msg FROM alerts WHERE title = 'Insert' LIMIT 1;
        END IF;

    ELSIF oper = 'update' THEN
        IF EXISTS (SELECT 1 FROM exam WHERE ex_id = ex_id_sp) THEN
            UPDATE exam
               SET exam     = exam_sp_v,
                   ordering = ordering_sp,
                   u_br_id  = u_br_id_sp
             WHERE ex_id = ex_id_sp;

            SELECT body INTO msg FROM alerts WHERE title = 'Update' LIMIT 1;
        ELSE
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate' LIMIT 1;
        END IF;

    ELSIF oper = 'delete' THEN
        IF EXISTS (SELECT 1 FROM exam WHERE ex_id = ex_id_sp) THEN
            DELETE FROM exam WHERE ex_id = ex_id_sp;
            SELECT body INTO msg FROM alerts WHERE title = 'Delete' LIMIT 1;
        ELSE
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegDelete' LIMIT 1;
        END IF;

    ELSE
        msg := 'Invalid Operation';
    END IF;

    RETURN msg;
END;
$function$;

-- ============================================================================
-- exam_schedule_sp — INSERT / UPDATE / DELETE rows in exam_schedule
--
-- Fix: prior SP referenced `day_id` and `per_id` columns, but the actual
-- exam_schedule table uses `d_id` and `pr_id`. INSERT/UPDATE failed with
-- "column 'day_id' of relation 'exam_schedule' does not exist".
-- ============================================================================
CREATE OR REPLACE FUNCTION public.exam_schedule_sp(
    ex_s_id_sp    integer,
    day_id_sp     integer,
    per_id_sp     integer,
    sub_cl_id_sp  integer,
    sh_id_sp      integer,
    cl_id_sp      integer,
    ex_r_id_sp    integer,
    start_time_sp time without time zone,
    end_time_sp   time without time zone,
    exam_date_sp  date,
    u_br_id_sp    integer,
    language_sp   integer,
    oper          character varying
)
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    msg VARCHAR;
BEGIN
    IF oper = 'insert' THEN
        IF EXISTS (
            SELECT 1
            FROM exam_schedule
            WHERE ex_r_id   = ex_r_id_sp
              AND sub_cl_id = sub_cl_id_sp
              AND exam_date = exam_date_sp
              AND start_time = start_time_sp
        ) THEN
            SELECT body INTO msg FROM alerts
             WHERE title = 'AlreadyInsert' AND lang_id = language_sp;
        ELSE
            INSERT INTO exam_schedule (
                d_id, pr_id, sub_cl_id, sh_id, cl_id, ex_r_id,
                start_time, end_time, exam_date, reg_date, u_br_id
            )
            VALUES (
                day_id_sp, per_id_sp, sub_cl_id_sp, sh_id_sp, cl_id_sp, ex_r_id_sp,
                start_time_sp, end_time_sp, exam_date_sp, now(), u_br_id_sp
            );
            SELECT body INTO msg FROM alerts
             WHERE title = 'Insert' AND lang_id = language_sp;
        END IF;

    ELSIF oper = 'update' THEN
        IF EXISTS (SELECT 1 FROM exam_schedule WHERE ex_s_id = ex_s_id_sp) THEN
            UPDATE exam_schedule
               SET d_id       = day_id_sp,
                   pr_id      = per_id_sp,
                   sub_cl_id  = sub_cl_id_sp,
                   sh_id      = sh_id_sp,
                   cl_id      = cl_id_sp,
                   ex_r_id    = ex_r_id_sp,
                   start_time = start_time_sp,
                   end_time   = end_time_sp,
                   exam_date  = exam_date_sp,
                   u_br_id    = u_br_id_sp
             WHERE ex_s_id = ex_s_id_sp;
            SELECT body INTO msg FROM alerts
             WHERE title = 'Update' AND lang_id = language_sp;
        ELSE
            SELECT body INTO msg FROM alerts
             WHERE title = 'NotRegUpdate' AND lang_id = language_sp;
        END IF;

    ELSIF oper = 'delete' THEN
        IF EXISTS (SELECT 1 FROM exam_schedule WHERE ex_s_id = ex_s_id_sp) THEN
            DELETE FROM exam_schedule WHERE ex_s_id = ex_s_id_sp;
            SELECT body INTO msg FROM alerts
             WHERE title = 'Delete' AND lang_id = language_sp;
        ELSE
            SELECT body INTO msg FROM alerts
             WHERE title = 'NotRegUpdate' AND lang_id = language_sp;
        END IF;

    ELSE
        msg := 'Invalid Operation';
    END IF;

    RETURN msg;
END;
$function$;

ALTER FUNCTION public.exam_schedule_sp(integer, integer, integer, integer, integer, integer, integer, time, time, date, integer, integer, varchar)
    OWNER TO postgres;

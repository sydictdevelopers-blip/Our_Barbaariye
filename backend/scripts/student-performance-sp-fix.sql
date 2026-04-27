-- ============================================================================
-- student_performance_sp — fix duplicate-check bug
-- The original had:  AND reg_date = rate_id_sp  (timestamp = integer → error)
-- The line was a typo. The real duplicate guard is student + performance + rate.
-- reg_date is auto-set to now() on insert and is not a uniqueness key.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.student_performance_sp(
    st_per_id_sp integer,
    std_cl_id_sp integer,
    per_id_sp    integer,
    rate_id_sp   integer,
    reason_sp    text,
    u_br_id_sp   integer,
    oper         character varying
)
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    msg VARCHAR;
BEGIN
    IF oper = 'insert' THEN
        -- duplicate guard: student + performance + rate
        IF EXISTS (
            SELECT 1
            FROM student_performance
            WHERE std_cl_id = std_cl_id_sp
              AND per_id    = per_id_sp
              AND rate_id   = rate_id_sp
        ) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
        ELSE
            INSERT INTO student_performance (std_cl_id, per_id, rate_id, reason, u_br_id, reg_date)
            VALUES (std_cl_id_sp, per_id_sp, rate_id_sp, reason_sp, u_br_id_sp, now());
            SELECT body INTO msg FROM alerts WHERE title = 'Insert';
        END IF;
        RETURN msg;

    ELSIF oper = 'update' THEN
        IF EXISTS (SELECT 1 FROM student_performance WHERE st_per_id = st_per_id_sp) THEN
            UPDATE student_performance SET
                std_cl_id = std_cl_id_sp,
                per_id    = per_id_sp,
                rate_id   = rate_id_sp,
                reason    = reason_sp,
                u_br_id   = u_br_id_sp
            WHERE st_per_id = st_per_id_sp;
            SELECT body INTO msg FROM alerts WHERE title = 'Update';
        ELSE
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
        END IF;
        RETURN msg;

    ELSIF oper = 'delete' THEN
        IF EXISTS (SELECT 1 FROM student_performance WHERE st_per_id = st_per_id_sp) THEN
            DELETE FROM student_performance WHERE st_per_id = st_per_id_sp;
            SELECT body INTO msg FROM alerts WHERE title = 'Delete';
        ELSE
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
        END IF;
        RETURN msg;

    ELSE
        RETURN 'Invalid Operation';
    END IF;
END;
$function$;

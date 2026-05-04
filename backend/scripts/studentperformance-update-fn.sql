-- ============================================================================
-- studentperformance_update — dedicated row-update for the Student
-- Performance Edit screen. Inline edits never change which student a row
-- belongs to, so std_cl_id is intentionally NOT a parameter — only the
-- editable fields (performance, rate, reason) plus u_br_id (audit) and the
-- target row id are accepted.
--
-- Returns the matching alerts.body text:
--   'Update'        — row updated
--   'NotRegUpdate'  — st_per_id not found
-- ============================================================================

DROP FUNCTION IF EXISTS public.studentperformance_update(integer, integer, integer, text, integer);

CREATE OR REPLACE FUNCTION public.studentperformance_update(
    p_st_per_id integer,
    p_per_id    integer,
    p_rate_id   integer,
    p_reason    text,
    p_u_br_id   integer
)
RETURNS character varying
LANGUAGE plpgsql
AS $BODY$
DECLARE
    msg VARCHAR;
BEGIN
    IF EXISTS (SELECT 1 FROM student_performance WHERE st_per_id = p_st_per_id) THEN
        UPDATE student_performance SET
            per_id  = p_per_id,
            rate_id = p_rate_id,
            reason  = p_reason,
            u_br_id = p_u_br_id
        WHERE st_per_id = p_st_per_id;

        SELECT body INTO msg FROM alerts WHERE title = 'Update';
    ELSE
        SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
    END IF;

    RETURN msg;
END;
$BODY$;

ALTER FUNCTION public.studentperformance_update(integer, integer, integer, text, integer)
OWNER TO postgres;

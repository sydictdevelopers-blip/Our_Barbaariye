-- ============================================================================
-- rooms_sp — Room CRUD (insert / update / delete).
-- Drops the older 8-arg signature (which had language_sp) and creates the
-- canonical 7-arg version: r_id, room_name, no_of_students, no_of_teachers,
-- state, u_br_id, oper.
-- INSERT always sets state='Active'; user-provided state_sp is honoured by UPDATE.
-- ============================================================================
DROP FUNCTION IF EXISTS public.rooms_sp(integer, character varying, integer, integer, character varying, integer, integer, character varying);
DROP FUNCTION IF EXISTS public.rooms_sp(integer, character varying, integer, integer, character varying, integer, character varying);

CREATE OR REPLACE FUNCTION public.rooms_sp(
    r_id_sp           integer,
    room_name_sp      character varying,
    no_of_students_sp integer,
    no_of_teachers_sp integer,
    state_sp          character varying,
    u_br_id_sp        integer,
    oper              character varying
)
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    msg VARCHAR;
BEGIN
    /* ====================== INSERT ====================== */
    IF oper = 'insert' THEN
        IF EXISTS (
            SELECT 1 FROM rooms WHERE lower(room_name) = lower(room_name_sp)
        ) THEN
            SELECT body INTO msg FROM alerts WHERE title = 'AlreadyInsert';
        ELSE
            INSERT INTO rooms (room_name, no_of_students, no_of_teachers, state, u_br_id, reg_date)
            VALUES (room_name_sp, no_of_students_sp, no_of_teachers_sp, 'Active', u_br_id_sp, now());
            SELECT body INTO msg FROM alerts WHERE title = 'Insert';
        END IF;

    /* ====================== UPDATE ====================== */
    ELSIF oper = 'update' THEN
        IF EXISTS (SELECT 1 FROM rooms WHERE r_id = r_id_sp) THEN
            UPDATE rooms
               SET room_name      = room_name_sp,
                   no_of_students = no_of_students_sp,
                   no_of_teachers = no_of_teachers_sp,
                   state          = state_sp,
                   u_br_id        = u_br_id_sp
             WHERE r_id = r_id_sp;
            SELECT body INTO msg FROM alerts WHERE title = 'Update';
        ELSE
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
        END IF;

    /* ====================== DELETE ====================== */
    ELSIF oper = 'delete' THEN
        IF EXISTS (SELECT 1 FROM rooms WHERE r_id = r_id_sp) THEN
            DELETE FROM rooms WHERE r_id = r_id_sp;
            SELECT body INTO msg FROM alerts WHERE title = 'Delete';
        ELSE
            SELECT body INTO msg FROM alerts WHERE title = 'NotRegUpdate';
        END IF;

    ELSE
        msg := 'Invalid Operation';
    END IF;

    RETURN msg;
END;
$function$;

ALTER FUNCTION public.rooms_sp(integer, character varying, integer, integer, character varying, integer, character varying)
    OWNER TO postgres;

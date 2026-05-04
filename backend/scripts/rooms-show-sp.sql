-- ============================================================================
-- rooms_show — Exam Service → Room tab list.
--
-- Returns one row per room with the user (creator/owner) joined via user_branch.
-- When no rows match, falls back to a single row containing the alerts.body
-- localized 'NotFound' message — frontend EntityTab detects this (1 row + null
-- PK) and shows it as the empty-state title.
--
-- Branch handling: when the logged-in user belongs to the "All" branch
-- (br_name = 'All'), every room is returned regardless of branch. Otherwise
-- only rooms owned by users of the requested branch are listed.
-- ============================================================================
DROP FUNCTION IF EXISTS public.rooms_show(integer);

CREATE OR REPLACE FUNCTION public.rooms_show(p_branch_id integer)
RETURNS TABLE(
    r_id           integer,
    room_name      character varying,
    no_of_students integer,
    no_of_teachers integer,
    username       character varying
)
LANGUAGE plpgsql
AS $function$
DECLARE
    var_branch_name TEXT;
    var_count       INTEGER := 0;
BEGIN
    SELECT b.br_name INTO var_branch_name FROM branch b WHERE b.br_id = p_branch_id;

    -- Pre-count to decide between data rows and the NotFound fallback.
    IF var_branch_name ILIKE 'all' THEN
        SELECT COUNT(*) INTO var_count
          FROM rooms r
          JOIN user_branch ub ON ub.u_br_id = r.u_br_id
          JOIN users       u  ON u.usr_id   = ub.usr_id;
    ELSE
        SELECT COUNT(*) INTO var_count
          FROM rooms r
          JOIN user_branch ub ON ub.u_br_id = r.u_br_id
          JOIN users       u  ON u.usr_id   = ub.usr_id
         WHERE ub.br_id = p_branch_id;
    END IF;

    -- Empty case → return one row with the NotFound alert message in room_name
    -- (and NULL elsewhere). EntityTab interprets a single PK-null row as empty
    -- and surfaces the message as the empty-state title.
    IF var_count = 0 THEN
        RETURN QUERY
        SELECT NULL::integer,
               (SELECT a.body FROM alerts a WHERE a.title = 'NotFound' LIMIT 1)::varchar,
               NULL::integer,
               NULL::integer,
               NULL::varchar;
        RETURN;
    END IF;

    IF var_branch_name ILIKE 'all' THEN
        RETURN QUERY
        SELECT r.r_id,
               r.room_name,
               r.no_of_students,
               r.no_of_teachers,
               u.username
          FROM rooms r
          JOIN user_branch ub ON ub.u_br_id = r.u_br_id
          JOIN users       u  ON u.usr_id   = ub.usr_id
         ORDER BY r.r_id;
    ELSE
        RETURN QUERY
        SELECT r.r_id,
               r.room_name,
               r.no_of_students,
               r.no_of_teachers,
               u.username
          FROM rooms r
          JOIN user_branch ub ON ub.u_br_id = r.u_br_id
          JOIN users       u  ON u.usr_id   = ub.usr_id
         WHERE ub.br_id = p_branch_id
         ORDER BY r.r_id;
    END IF;
END;
$function$;

ALTER FUNCTION public.rooms_show(integer) OWNER TO postgres;

-- ============================================================================
-- rooms_combobox — list of Active rooms (with capacity + creator) used by
-- Room dropdowns across the app (Room By Class, Class By Room, Exam Attendance,
-- etc).
--
-- Notes vs the user-provided draft:
--   * LANGUAGE was 'plpgsql' but the body was a bare SELECT (no RETURN QUERY)
--     and RETURNS character varying — that signature can't carry 5 columns.
--     Re-written as LANGUAGE sql + RETURNS TABLE(...) for a clean tabular result.
--   * No params: caller-side branch filter is applied by the wrapper query
--     (room_options) so this SP stays simple and reusable.
-- ============================================================================
DROP FUNCTION IF EXISTS public.rooms_combobox();

CREATE OR REPLACE FUNCTION public.rooms_combobox()
RETURNS TABLE(
    "ID"             integer,
    "Room"           character varying,
    "No of Students" integer,
    "No of Teachers" integer,
    username         character varying
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $function$
    SELECT r.r_id,
           r.room_name,
           r.no_of_students,
           r.no_of_teachers,
           u.username
      FROM rooms r
      JOIN user_branch ub ON ub.u_br_id = r.u_br_id
      JOIN users        u ON u.usr_id   = ub.usr_id
     WHERE r.state = 'Active'
     ORDER BY r.room_name;
$function$;

ALTER FUNCTION public.rooms_combobox() OWNER TO postgres;

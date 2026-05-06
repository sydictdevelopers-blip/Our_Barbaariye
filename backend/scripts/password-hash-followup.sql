-- ═══════════════════════════════════════════════════════════════════
-- PR 4 follow-up — clean up SPs that still reference dropped `password`
-- ═══════════════════════════════════════════════════════════════════
-- After dropping users.password, three things broke:
--   1. users_show returned u.password as a column   → users list 500'd
--   2. users_sp had a stale 10-arg overload         → still referenced password
--   3. user_sp (singular) was dead code, two stale  → safe to drop entirely
-- ═══════════════════════════════════════════════════════════════════

-- 1. users_show — drop password from result (UI hides it anyway). Output now
--    matches what the admin user list actually displays. PostgreSQL forbids
--    changing the return type via CREATE OR REPLACE, so DROP first.
DROP FUNCTION IF EXISTS public.users_show(integer);
CREATE FUNCTION public.users_show(p_br_id INTEGER)
RETURNS TABLE(
    usr_id     INTEGER,
    p_id       INTEGER,
    p_name     VARCHAR,
    username   VARCHAR,
    br_id      INTEGER,
    br_name    TEXT,
    state      VARCHAR,
    lock_user  VARCHAR,
    privalage  JSONB,
    reg_date   TIMESTAMP
)
LANGUAGE sql
AS $function$
    SELECT
        u.usr_id::INTEGER,
        u.p_id::INTEGER,
        p.p_name::VARCHAR,
        u.username::VARCHAR,
        MIN(ub.br_id)::INTEGER AS br_id,
        string_agg(DISTINCT b.br_name::TEXT, ', ' ORDER BY b.br_name::TEXT) AS br_name,
        u.state::VARCHAR,
        u.lock_user::VARCHAR,
        COALESCE(jsonb_agg(DISTINCT ub.privalage) FILTER (WHERE ub.privalage IS NOT NULL), '[]'::jsonb) AS privalage,
        u.reg_date::TIMESTAMP
    FROM users u
    LEFT JOIN people p          ON p.p_id = u.p_id
    LEFT JOIN user_branch ub    ON ub.usr_id = u.usr_id
    LEFT JOIN branch b          ON b.br_id = ub.br_id
    WHERE
        (
            EXISTS (
                SELECT 1 FROM branch br
                 WHERE br.br_id = p_br_id
                   AND br.br_name = 'All'
            )
            OR ub.br_id = p_br_id
        )
    GROUP BY u.usr_id, u.p_id, p.p_name, u.username,
             u.state, u.lock_user, u.reg_date
    ORDER BY u.usr_id;
$function$;

-- 2. Drop stale users_sp overload (10 args). The 8-VARCHAR overload from v2 is
--    the one Node calls; the older signature was leftover from a pre-migration
--    schema and references the now-dropped `password` column.
DROP FUNCTION IF EXISTS public.users_sp(
    integer, integer, character varying, character varying, character varying,
    character varying, boolean, character varying, date, character varying
);

-- 3. Drop both user_sp (singular) overloads — unreachable from frontend,
--    kept the SPs from a legacy schema.
DROP FUNCTION IF EXISTS public.user_sp(
    integer, integer, character varying, character varying, character varying
);
DROP FUNCTION IF EXISTS public.user_sp(
    integer, integer, character varying, character varying, integer, character varying
);

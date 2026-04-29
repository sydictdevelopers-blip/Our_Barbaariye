-- ═══════════════════════════════════════════════════════════════════════════
-- Complain — JOB DONE workflow
-- Database: barbaariye_demo_v10_25_april
--
-- Three functions:
--   1) complian_outstanding(p_br_id)  — list complaints with state='Active'
--   2) complian_done(p_br_id)         — list complaints with state='Inactive'
--   3) complain_done_sp(com_id, u_br_id, oper)
--        oper='out'  → mark Active complaint as Inactive (job done)
--        oper='done' → restore Inactive complaint to Active (return to outstanding)
--
-- Branch handling matches vw_complain:
--   • branch.br_name = 'All' (or unknown br_id) → no branch filter
--   • otherwise → join through user_branch.br_id
--
-- Column names (id / complian / type / comments / date / user) are tuned so
-- the auto-label converter renders headers exactly: ID, Complian, Type,
-- Comments, Date, User. The "user" alias is double-quoted because USER is
-- a reserved word in SQL.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Outstanding (state = Active) ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.complian_outstanding(integer);

CREATE OR REPLACE FUNCTION public.complian_outstanding(p_br_id integer)
RETURNS TABLE (
    id        integer,
    complian  character varying,
    type      character varying,
    comments  text,
    date      date,
    "user"    character varying
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_branch_name VARCHAR;
BEGIN
    SELECT TRIM(br.br_name) INTO v_branch_name
      FROM public.branch br
     WHERE br.br_id = p_br_id;

    IF v_branch_name IS NULL OR v_branch_name ILIKE 'all' THEN
        RETURN QUERY
        SELECT c.com_id                              AS id,
               c.name                                AS complian,
               c.phone                               AS type,
               c.cabasho                             AS comments,
               c.reg_date                            AS date,
               COALESCE(c.comp_username, '')::varchar AS "user"
          FROM public.complain c
         WHERE TRIM(c.state) ILIKE 'active'
         ORDER BY c.com_id DESC;
    ELSE
        RETURN QUERY
        SELECT c.com_id                              AS id,
               c.name                                AS complian,
               c.phone                               AS type,
               c.cabasho                             AS comments,
               c.reg_date                            AS date,
               COALESCE(u.username, c.comp_username, '')::varchar AS "user"
          FROM public.complain   c
          JOIN public.user_branch ub ON ub.u_br_id = c.u_br_id
          JOIN public.users       u  ON u.usr_id   = ub.usr_id
         WHERE ub.br_id = p_br_id
           AND TRIM(c.state) ILIKE 'active'
         ORDER BY c.com_id DESC;
    END IF;
END;
$function$;

ALTER FUNCTION public.complian_outstanding(integer) OWNER TO postgres;


-- ─── 2. Job done (state = Inactive) ────────────────────────────────────────
DROP FUNCTION IF EXISTS public.complian_done(integer);

CREATE OR REPLACE FUNCTION public.complian_done(p_br_id integer)
RETURNS TABLE (
    id        integer,
    complian  character varying,
    type      character varying,
    comments  text,
    date      date,
    "user"    character varying
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_branch_name VARCHAR;
BEGIN
    SELECT TRIM(br.br_name) INTO v_branch_name
      FROM public.branch br
     WHERE br.br_id = p_br_id;

    IF v_branch_name IS NULL OR v_branch_name ILIKE 'all' THEN
        RETURN QUERY
        SELECT c.com_id                              AS id,
               c.name                                AS complian,
               c.phone                               AS type,
               c.cabasho                             AS comments,
               c.reg_date                            AS date,
               COALESCE(c.comp_username, '')::varchar AS "user"
          FROM public.complain c
         WHERE TRIM(c.state) ILIKE 'inactive'
         ORDER BY c.com_id DESC;
    ELSE
        RETURN QUERY
        SELECT c.com_id                              AS id,
               c.name                                AS complian,
               c.phone                               AS type,
               c.cabasho                             AS comments,
               c.reg_date                            AS date,
               COALESCE(u.username, c.comp_username, '')::varchar AS "user"
          FROM public.complain   c
          JOIN public.user_branch ub ON ub.u_br_id = c.u_br_id
          JOIN public.users       u  ON u.usr_id   = ub.usr_id
         WHERE ub.br_id = p_br_id
           AND TRIM(c.state) ILIKE 'inactive'
         ORDER BY c.com_id DESC;
    END IF;
END;
$function$;

ALTER FUNCTION public.complian_done(integer) OWNER TO postgres;


-- ─── 3. Done/Out toggle (state flip + alert) ───────────────────────────────
-- Drop any legacy overload first.
DO $drop_complain_done_sp$
DECLARE
    sig text;
BEGIN
    FOR sig IN
        SELECT pg_get_function_identity_arguments(p.oid)
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'complain_done_sp'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.complain_done_sp(%s)', sig);
    END LOOP;
END
$drop_complain_done_sp$;

CREATE OR REPLACE FUNCTION public.complain_done_sp(
    p_com_id   integer,
    p_u_br_id  integer,
    p_oper     character varying
) RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    msg VARCHAR;
BEGIN
    -- User guard: must be Active + Unlocked, and tied to this u_br_id.
    IF NOT EXISTS (
        SELECT 1
          FROM public.users       u
          JOIN public.user_branch ub ON ub.usr_id = u.usr_id
         WHERE ub.u_br_id     = p_u_br_id
           AND TRIM(u.state)     ILIKE 'active'
           AND TRIM(u.lock_user) ILIKE 'unlocked'
    ) THEN
        SELECT body INTO msg FROM public.alerts WHERE title = 'Userlock' LIMIT 1;
        RETURN COALESCE(msg, 'Userlock');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.complain WHERE com_id = p_com_id) THEN
        SELECT body INTO msg FROM public.alerts WHERE title = 'NotRegUpdate' LIMIT 1;
        RETURN COALESCE(msg, 'NotRegUpdate');
    END IF;

    IF p_oper = 'out' THEN
        UPDATE public.complain SET state = 'Inactive' WHERE com_id = p_com_id;
        SELECT body INTO msg FROM public.alerts WHERE title = 'Update' LIMIT 1;
        RETURN COALESCE(msg, 'Update');

    ELSIF p_oper = 'done' THEN
        UPDATE public.complain SET state = 'Active' WHERE com_id = p_com_id;
        SELECT body INTO msg FROM public.alerts WHERE title = 'Update' LIMIT 1;
        RETURN COALESCE(msg, 'Update');
    END IF;

    RETURN 'Invalid Operation';
END;
$function$;

ALTER FUNCTION public.complain_done_sp(integer, integer, character varying) OWNER TO postgres;


-- ─── Smoke tests (commented) ───────────────────────────────────────────────
-- SELECT * FROM public.complian_outstanding(0);
-- SELECT * FROM public.complian_done(0);
-- SELECT public.complain_done_sp(1, 1, 'out');
-- SELECT public.complain_done_sp(1, 1, 'done');

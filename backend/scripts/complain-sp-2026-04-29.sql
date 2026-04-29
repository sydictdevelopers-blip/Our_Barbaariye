-- ═══════════════════════════════════════════════════════════════════════════
-- Complain — PostgreSQL conversion of MySQL `complain_sp` + `vw_complian`
--
-- Database: barbaariye_demo_v10_25_april
--
-- 1) complain_sp(com_id_sp, comp_type_sp, student_sp, teacher_sp,
--                name_sp, phone_sp, cabasho_sp, reg_date_sp,
--                u_br_id_sp, oper)
--    → CRUD with user-state guard (Active + Unlocked) and alert-table messages.
--
-- 2) vw_complain(p_br_id)
--    → Branch-aware listing.
--      • If branch.br_name = 'All' → return every complain row.
--      • Otherwise → only complaints registered by users of that branch.
--
-- Notes vs MySQL:
--    • PG `users` has no `deleted` column — guard relies on
--      state='Active' + lock_user='Unlocked' (matches existing PG procedures).
--    • `complain.reg_date` is DATE in this schema; the time portion in the
--      original MySQL `concat(reg_date, time(...))` is lost on store, so we
--      cast cleanly to DATE.
--    • `branch.br_name` replaces MySQL `branch.name`.
--    • Alert messages come from public.alerts (multi-language via lang_id).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. CRUD function ───────────────────────────────────────────────────────
-- Drop ALL existing complain_sp overloads first. A previous schema shipped a
-- different 10-arg signature (timestamp + state_sp + comp_username_sp +
-- language_sp); leaving it in place causes PG to match our 10-arg call to the
-- wrong overload and throw "invalid input syntax for type timestamp".
DO $drop_complain_sp$
DECLARE
    sig text;
BEGIN
    FOR sig IN
        SELECT pg_get_function_identity_arguments(p.oid)
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'complain_sp'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.complain_sp(%s)', sig);
    END LOOP;
END
$drop_complain_sp$;

CREATE OR REPLACE FUNCTION public.complain_sp(
    com_id_sp     integer,
    comp_type_sp  character varying,
    student_sp    character varying,
    teacher_sp    character varying,
    name_sp       character varying,
    phone_sp      character varying,
    cabasho_sp    text,
    reg_date_sp   date,
    u_br_id_sp    integer,
    oper          character varying
) RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    msg          VARCHAR;
    v_username   VARCHAR;
    v_reg_date   DATE;
    v_name       VARCHAR;
    v_phone      VARCHAR;
BEGIN
    -- ── User guard: must be Active + Unlocked, and tied to this u_br_id ──
    IF NOT EXISTS (
        SELECT 1
          FROM public.users u
          JOIN public.user_branch ub ON ub.usr_id = u.usr_id
         WHERE ub.u_br_id     = u_br_id_sp
           AND TRIM(u.state)     ILIKE 'active'
           AND TRIM(u.lock_user) ILIKE 'unlocked'
    ) THEN
        SELECT body INTO msg FROM public.alerts WHERE title = 'Userlock' LIMIT 1;
        RETURN COALESCE(msg, 'Userlock');
    END IF;

    -- Resolve session username (used as comp_username on insert/update)
    SELECT u.username INTO v_username
      FROM public.users u
      JOIN public.user_branch ub ON ub.usr_id = u.usr_id
     WHERE ub.u_br_id = u_br_id_sp
     LIMIT 1;

    v_reg_date := COALESCE(reg_date_sp, CURRENT_DATE);

    -- ── DELETE ────────────────────────────────────────────────────────────
    IF oper = 'delete' THEN
        IF EXISTS (SELECT 1 FROM public.complain WHERE com_id = com_id_sp) THEN
            DELETE FROM public.complain WHERE com_id = com_id_sp;
            SELECT body INTO msg FROM public.alerts WHERE title = 'Delete' LIMIT 1;
            RETURN COALESCE(msg, 'Delete');
        ELSE
            SELECT body INTO msg FROM public.alerts WHERE title = 'NotRegDelete' LIMIT 1;
            RETURN COALESCE(msg, 'NotRegDelete');
        END IF;
    END IF;

    -- ── Required-field guard (matches MySQL "Fill" branch) ───────────────
    IF cabasho_sp IS NULL OR TRIM(cabasho_sp) = ''
       OR u_br_id_sp IS NULL OR u_br_id_sp = 0
       OR oper IS NULL OR TRIM(oper) = ''
       OR reg_date_sp IS NULL THEN
        SELECT body INTO msg FROM public.alerts WHERE title = 'Fill' LIMIT 1;
        RETURN COALESCE(msg, 'Fill');
    END IF;

    -- Pick the right (name,phone) pair per complain type:
    --   • 'Student' → name = student_sp, phone column reused for teacher_sp
    --   • Otherwise → user-supplied name/phone
    IF comp_type_sp = 'Student' THEN
        IF student_sp IS NULL OR TRIM(student_sp) = '' OR student_sp ILIKE 'Select Student'
           OR teacher_sp IS NULL OR TRIM(teacher_sp) = '' OR teacher_sp ILIKE 'Select Teacher' THEN
            SELECT body INTO msg FROM public.alerts WHERE title = 'Fill' LIMIT 1;
            RETURN COALESCE(msg, 'Fill');
        END IF;
        v_name  := student_sp;
        v_phone := teacher_sp;
    ELSE
        IF name_sp IS NULL OR TRIM(name_sp) = ''
           OR phone_sp IS NULL OR TRIM(phone_sp) = '' THEN
            SELECT body INTO msg FROM public.alerts WHERE title = 'Fill' LIMIT 1;
            RETURN COALESCE(msg, 'Fill');
        END IF;
        v_name  := name_sp;
        v_phone := phone_sp;
    END IF;

    -- ── UPDATE ────────────────────────────────────────────────────────────
    IF oper = 'update' THEN
        IF NOT EXISTS (SELECT 1 FROM public.complain WHERE com_id = com_id_sp) THEN
            SELECT body INTO msg FROM public.alerts WHERE title = 'NotRegUpdate' LIMIT 1;
            RETURN COALESCE(msg, 'NotRegUpdate');
        END IF;

        UPDATE public.complain
           SET name          = v_name,
               phone         = v_phone,
               cabasho       = cabasho_sp,
               reg_date      = v_reg_date,
               comp_username = COALESCE(v_username, comp_username)
         WHERE com_id = com_id_sp;

        SELECT body INTO msg FROM public.alerts WHERE title = 'Update' LIMIT 1;
        RETURN COALESCE(msg, 'Update');
    END IF;

    -- ── INSERT ────────────────────────────────────────────────────────────
    IF oper = 'insert' THEN
        INSERT INTO public.complain (
            name, phone, cabasho, state, comp_username, reg_date, u_br_id
        ) VALUES (
            v_name, v_phone, cabasho_sp, 'Active',
            COALESCE(v_username, ''), v_reg_date, u_br_id_sp
        );
        SELECT body INTO msg FROM public.alerts WHERE title = 'Insert' LIMIT 1;
        RETURN COALESCE(msg, 'Insert');
    END IF;

    RETURN 'Invalid Operation';
END;
$function$;

ALTER FUNCTION public.complain_sp(
    integer, character varying, character varying, character varying,
    character varying, character varying, text, date, integer, character varying)
    OWNER TO postgres;


-- ─── 2. View function (branch-aware listing) ───────────────────────────────
DROP FUNCTION IF EXISTS public.vw_complain(integer);

CREATE OR REPLACE FUNCTION public.vw_complain(p_br_id integer)
RETURNS TABLE (
    id        integer,
    name      character varying,
    phone     character varying,
    comments  text,
    reg_date  date,
    username  character varying
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_branch_name VARCHAR;
    v_count       BIGINT;
BEGIN
    SELECT TRIM(br.br_name)
      INTO v_branch_name
      FROM public.branch br
     WHERE br.br_id = p_br_id;

    IF v_branch_name IS NULL OR v_branch_name ILIKE 'all' THEN
        SELECT COUNT(*) INTO v_count FROM public.complain;
        IF v_count = 0 THEN
            RETURN QUERY
            SELECT 0::integer        AS id,
                   ''::varchar       AS name,
                   ''::varchar       AS phone,
                   COALESCE((SELECT body FROM public.alerts WHERE title = 'notfound' LIMIT 1), 'notfound')::text AS comments,
                   NULL::date        AS reg_date,
                   ''::varchar       AS username;
            RETURN;
        END IF;

        RETURN QUERY
        SELECT c.com_id            AS id,
               c.name              AS name,
               c.phone             AS phone,
               c.cabasho           AS comments,
               c.reg_date          AS reg_date,
               COALESCE(c.comp_username, '')::varchar AS username
          FROM public.complain c
         ORDER BY c.com_id DESC;
    ELSE
        SELECT COUNT(*) INTO v_count
          FROM public.complain c
          JOIN public.user_branch ub ON ub.u_br_id = c.u_br_id
         WHERE ub.br_id = p_br_id;

        IF v_count = 0 THEN
            RETURN QUERY
            SELECT 0::integer        AS id,
                   ''::varchar       AS name,
                   ''::varchar       AS phone,
                   COALESCE((SELECT body FROM public.alerts WHERE title = 'notfound' LIMIT 1), 'notfound')::text AS comments,
                   NULL::date        AS reg_date,
                   ''::varchar       AS username;
            RETURN;
        END IF;

        RETURN QUERY
        SELECT c.com_id            AS id,
               c.name              AS name,
               c.phone             AS phone,
               c.cabasho           AS comments,
               c.reg_date          AS reg_date,
               COALESCE(u.username, '')::varchar AS username
          FROM public.complain   c
          JOIN public.user_branch ub ON ub.u_br_id = c.u_br_id
          JOIN public.users       u  ON u.usr_id   = ub.usr_id
         WHERE ub.br_id = p_br_id
         ORDER BY c.com_id DESC;
    END IF;
END;
$function$;

ALTER FUNCTION public.vw_complain(integer) OWNER TO postgres;


-- ─── 3. Seed alert messages (idempotent, multi-language ready) ──────────────
INSERT INTO public.alerts (title, body, lang_id)
SELECT v.title, v.body, v.lang_id
  FROM (VALUES
    ('Insert',       'Record inserted successfully', 1),
    ('Update',       'Record updated successfully',  1),
    ('Delete',       'Record deleted successfully',  1),
    ('Fill',         'Please fill all required fields', 1),
    ('Userlock',     'User is locked or inactive',  1),
    ('NotRegUpdate', 'Record not found for update', 1),
    ('NotRegDelete', 'Record not found for delete', 1),
    ('notfound',     'This Information Was Not Found!', 1)
  ) AS v(title, body, lang_id)
 WHERE NOT EXISTS (
    SELECT 1 FROM public.alerts a
     WHERE a.title = v.title AND a.lang_id = v.lang_id
 );

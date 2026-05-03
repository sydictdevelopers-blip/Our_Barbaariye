-- ═══════════════════════════════════════════════════════════════════
-- LOGIN VERIFICATION FUNCTION — login_check(username, password)
-- ═══════════════════════════════════════════════════════════════════
-- Schema (verified — db-schema-columns.txt):
--   users        (usr_id int, p_id int, username varchar, password varchar,
--                 authkey varchar, lock_user varchar, state varchar, ...)
--   user_branch  (u_br_id int, usr_id int, br_id int, lock_user varchar,
--                 state varchar, user_type varchar, privalage jsonb, ...)
--
-- Conventions (FIXED — confirmed by schema owner):
--   state      ∈ {'Active', 'Inactive'}
--   lock_user  ∈ {'Locked', 'Unlocked'}
--   Comparisons are case-insensitive for safety, but only these two
--   canonical values are accepted by the rest of the system.
--
-- Checks (in order):
--   1. Username exists
--   2. Password matches
--   3. users.state       = 'Active'
--   4. users.lock_user   = 'Unlocked'
--   5. user_branch.state     = 'Active'
--   6. user_branch.lock_user = 'Unlocked'
--
-- Performance:
--   STABLE          → no DB writes; planner may cache within a query
--   PARALLEL SAFE   → multiple concurrent logins can use parallel workers
--   SET search_path → no per-call schema resolution overhead
--   COST/ROWS       → realistic estimates so the planner doesn't over-budget
--   Pre-normalised  username/password → avoid per-row work in WHERE clauses
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.login_check(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION public.login_check(
  p_username VARCHAR,
  p_password VARCHAR
)
RETURNS TABLE(
  success     BOOLEAN,
  message     VARCHAR,
  usr_id      INT,
  p_id        INT,
  username    VARCHAR,
  authkey     VARCHAR,
  u_br_id     INT,
  br_id       INT,
  user_type   VARCHAR,
  privalage   JSONB
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
COST 25
ROWS 1
SET search_path = public, pg_catalog
AS $BODY$
DECLARE
  v_user           public.users%ROWTYPE;
  v_branch         public.user_branch%ROWTYPE;
  v_username_norm  TEXT := LOWER(TRIM(COALESCE(p_username, '')));
BEGIN
  -------------------------------------------------------------------
  -- 1. Find user by username (case-insensitive + trimmed)
  -------------------------------------------------------------------
  SELECT *
    INTO v_user
    FROM public.users u
   WHERE LOWER(TRIM(u.username)) = v_username_norm
   LIMIT 1;

  IF v_user.usr_id IS NULL THEN
    RETURN QUERY
      SELECT FALSE, 'Username ma jiro'::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- 2. Password match (plain-text compare — hash it in production)
  -------------------------------------------------------------------
  IF v_user.password IS DISTINCT FROM p_password THEN
    RETURN QUERY
      SELECT FALSE, 'Password-ku waa khalad'::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- 3. users.state must be 'Active'
  -------------------------------------------------------------------
  IF LOWER(TRIM(COALESCE(v_user.state, ''))) <> 'active' THEN
    RETURN QUERY
      SELECT FALSE, 'Isticmaalahu ma active-ee aha'::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- 4. users.lock_user must be 'Unlocked'
  -------------------------------------------------------------------
  IF LOWER(TRIM(COALESCE(v_user.lock_user, ''))) <> 'unlocked' THEN
    RETURN QUERY
      SELECT FALSE, 'Isticmaalahu waa xidhan yahay'::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- 5 & 6. user_branch: state = 'Active' AND lock_user = 'Unlocked'
  -------------------------------------------------------------------
  SELECT *
    INTO v_branch
    FROM public.user_branch ub
   WHERE ub.usr_id = v_user.usr_id
     AND LOWER(TRIM(COALESCE(ub.state, '')))     = 'active'
     AND LOWER(TRIM(COALESCE(ub.lock_user, ''))) = 'unlocked'
   ORDER BY ub.u_br_id
   LIMIT 1;

  IF v_branch.u_br_id IS NULL THEN
    RETURN QUERY
      SELECT FALSE, 'Laanta isticmaalaha ma active-ee aha ama waa xidhan tahay'::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- 7. SUCCESS — return all the useful fields
  -------------------------------------------------------------------
  RETURN QUERY
    SELECT TRUE, 'Login waa guuleysta'::VARCHAR,
           v_user.usr_id,
           v_user.p_id,
           v_user.username,
           v_user.authkey,
           v_branch.u_br_id,
           v_branch.br_id,
           v_branch.user_type,
           v_branch.privalage;
END;
$BODY$;

ALTER FUNCTION public.login_check(VARCHAR, VARCHAR) OWNER TO postgres;

-- ═══════════════════════════════════════════════════════════════════
-- OPTIONAL — Functional indexes for sub-millisecond login latency
-- ═══════════════════════════════════════════════════════════════════
-- CREATE INDEX IF NOT EXISTS idx_users_username_lower
--   ON public.users (LOWER(TRIM(username)));
--
-- CREATE INDEX IF NOT EXISTS idx_user_branch_usr_id
--   ON public.user_branch (usr_id);
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- USAGE EXAMPLES
-- ═══════════════════════════════════════════════════════════════════
-- SELECT * FROM login_check('admin',    'Admin@123');
-- SELECT * FROM login_check('teacher1', 'Teacher@123');
-- SELECT * FROM login_check('wrong',    'bad');
--
-- From Node.js:
--   pool.query('SELECT * FROM login_check($1, $2)', [username, password])
--     .then(r => r.rows[0])  // { success, message, usr_id, ... }
-- ═══════════════════════════════════════════════════════════════════

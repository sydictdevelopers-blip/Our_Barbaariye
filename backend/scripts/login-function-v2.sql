-- ═══════════════════════════════════════════════════════════════════
-- LOGIN VERIFICATION FUNCTION v2 — login_check(username)
-- ═══════════════════════════════════════════════════════════════════
-- Changes vs v1:
--   • Takes username only — password verification moves to Node (bcrypt).
--   • Returns password_hash so Node can call bcrypt.compare on it.
--   • authkey no longer returned (it was a legacy credential the client
--     never used after the JWT cookie migration).
--
-- Checks (order):
--   1. Username exists
--   2. users.state       = 'Active'
--   3. users.lock_user   = 'Unlocked'
--   4. user_branch.state     = 'Active'
--   5. user_branch.lock_user = 'Unlocked'
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.login_check(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.login_check(VARCHAR);

CREATE OR REPLACE FUNCTION public.login_check(p_username VARCHAR)
RETURNS TABLE(
  success        BOOLEAN,
  message        VARCHAR,
  password_hash  VARCHAR,
  usr_id         INT,
  p_id           INT,
  username       VARCHAR,
  u_br_id        INT,
  br_id          INT,
  user_type      VARCHAR,
  privalage      JSONB
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
  -- 1. Find user by username (case-insensitive + trimmed)
  SELECT *
    INTO v_user
    FROM public.users u
   WHERE LOWER(TRIM(u.username)) = v_username_norm
   LIMIT 1;

  IF v_user.usr_id IS NULL THEN
    RETURN QUERY
      SELECT FALSE, 'Username ma jiro'::VARCHAR,
             NULL::VARCHAR, NULL::INT, NULL::INT, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -- 2. users.state must be 'Active'
  IF LOWER(TRIM(COALESCE(v_user.state, ''))) <> 'active' THEN
    RETURN QUERY
      SELECT FALSE, 'Isticmaalahu ma active-ee aha'::VARCHAR,
             NULL::VARCHAR, NULL::INT, NULL::INT, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -- 3. users.lock_user must be 'Unlocked'
  IF LOWER(TRIM(COALESCE(v_user.lock_user, ''))) <> 'unlocked' THEN
    RETURN QUERY
      SELECT FALSE, 'Isticmaalahu waa xidhan yahay'::VARCHAR,
             NULL::VARCHAR, NULL::INT, NULL::INT, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -- 4 & 5. user_branch must be Active + Unlocked
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
             NULL::VARCHAR, NULL::INT, NULL::INT, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -- 6. SUCCESS — Node will bcrypt.compare(input, password_hash)
  RETURN QUERY
    SELECT TRUE, 'Found'::VARCHAR,
           v_user.password_hash,
           v_user.usr_id,
           v_user.p_id,
           v_user.username,
           v_branch.u_br_id,
           v_branch.br_id,
           v_branch.user_type,
           v_branch.privalage;
END;
$BODY$;

ALTER FUNCTION public.login_check(VARCHAR) OWNER TO postgres;

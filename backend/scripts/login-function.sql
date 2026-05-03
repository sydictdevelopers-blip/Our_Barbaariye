-- ═══════════════════════════════════════════════════════════════════
-- LOGIN VERIFICATION FUNCTION — login_check(username, password)
-- ═══════════════════════════════════════════════════════════════════
-- Returns one row with:
--   success = TRUE  + user/branch info   → login OK
--   success = FALSE + message            → login blocked (and reason)
--
-- Checks performed in order:
--   1. Username exists
--   2. Password matches
--   3. users.state       = 'Active'
--   4. users.lock_user   is unlocked/false
--   5. user_branch.state     = 'Active'
--   6. user_branch.lock_user is unlocked/false
--
-- NOTE: lock_user is stored as VARCHAR in both tables; accepted
--       "unlocked" forms are: 'unlocked', 'unloked', 'false', 'f', '0'.
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS login_check(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION login_check(
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
AS $BODY$
DECLARE
  v_user   RECORD;
  v_branch RECORD;
  v_unlocked_values TEXT[] := ARRAY['unlocked', 'unloked', 'false', 'f', '0', ''];
BEGIN
  -------------------------------------------------------------------
  -- 1. Find user by username (case-insensitive + trimmed)
  -------------------------------------------------------------------
  SELECT u.usr_id, u.p_id, u.username, u.password, u.authkey,
         u.lock_user, u.state
    INTO v_user
    FROM users u
   WHERE LOWER(TRIM(u.username)) = LOWER(TRIM(p_username))
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
  IF LOWER(COALESCE(v_user.state, '')) <> 'active' THEN
    RETURN QUERY
      SELECT FALSE, 'Isticmaalahu ma active-ee aha'::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- 4. users.lock_user must be unlocked
  -------------------------------------------------------------------
  IF LOWER(TRIM(COALESCE(v_user.lock_user, ''))) <> ALL (v_unlocked_values) THEN
    RETURN QUERY
      SELECT FALSE, 'Isticmaalahu waa xidhan yahay'::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::VARCHAR,
             NULL::INT, NULL::INT, NULL::VARCHAR, NULL::JSONB;
    RETURN;
  END IF;

  -------------------------------------------------------------------
  -- 5 & 6. user_branch: state = Active AND lock_user unlocked
  -------------------------------------------------------------------
  SELECT ub.u_br_id, ub.br_id, ub.user_type, ub.privalage,
         ub.lock_user, ub.state
    INTO v_branch
    FROM user_branch ub
   WHERE ub.usr_id = v_user.usr_id
     AND LOWER(COALESCE(ub.state, '')) = 'active'
     AND LOWER(TRIM(COALESCE(ub.lock_user, ''))) = ANY (v_unlocked_values)
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

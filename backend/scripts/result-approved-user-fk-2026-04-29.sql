-- ============================================================================
-- result-approved-user-fk-2026-04-29.sql
-- Repoint `result.approved_user` FK from `users.usr_id` → `user_branch.u_br_id`,
-- mirroring the change we did for `editted_user` earlier today. Both columns
-- now carry u_br_id values for consistency with `result.u_br_id` (creator).
--
-- Existing data: 1 row holding a usr_id from the first approve test; cleared so
-- the new FK check passes during the ALTER. Re-approve via the UI to repopulate.
-- ============================================================================

UPDATE result SET approved_user = NULL WHERE approved_user IS NOT NULL;

ALTER TABLE result DROP CONSTRAINT IF EXISTS fk_result_approved_user;
ALTER TABLE result
  ADD CONSTRAINT fk_result_approved_user
  FOREIGN KEY (approved_user) REFERENCES user_branch(u_br_id);

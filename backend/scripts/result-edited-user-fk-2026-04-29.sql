-- ============================================================================
-- result-edited-user-fk-2026-04-29.sql
-- Repoint `result.editted_user` FK from `users.usr_id` → `user_branch.u_br_id`,
-- so the column carries u_br_id values (matching the SP's p_user_id arg and the
-- sibling `result.u_br_id` creator column).
--
-- Existing data: 1 test row with editted_user=<usr_id>; cleared so the new FK
-- check passes during the ALTER. Re-edit any affected rows via the UI to repopulate.
-- `approved_user` FK is left as-is (still → users.usr_id); change separately if needed.
-- ============================================================================

UPDATE result SET editted_user = NULL WHERE editted_user IS NOT NULL;

ALTER TABLE result DROP CONSTRAINT IF EXISTS fk_result_edited_user;
ALTER TABLE result
  ADD CONSTRAINT fk_result_edited_user
  FOREIGN KEY (editted_user) REFERENCES user_branch(u_br_id);

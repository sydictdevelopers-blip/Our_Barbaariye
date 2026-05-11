/**
 * Install / refresh the per-row state-toggle SP for assign_class_exam.
 *
 *   assign_class_exam_set_state_sp(p_a_c_ex_sp integer, p_state_sp varchar, oper varchar)
 *
 * Idempotent — uses CREATE OR REPLACE. Safe to re-run.
 *
 * Usage:
 *   cd backend && node scripts/install-assign-class-exam-set-state-sp.js
 */
require('dotenv').config();
const db = require('../config/db');

const SQL = `
CREATE OR REPLACE FUNCTION public.assign_class_exam_set_state_sp(
  p_a_c_ex_sp integer,
  p_state_sp  character varying,
  oper        character varying DEFAULT 'update'
) RETURNS character varying
LANGUAGE plpgsql
AS $func$
BEGIN
  IF COALESCE(oper, 'update') = 'update' THEN
    UPDATE assign_class_exam
       SET state = p_state_sp
     WHERE a_c_ex = p_a_c_ex_sp;
    RETURN 'Updated';
  END IF;
  RETURN 'NoOp';
END;
$func$;
`;

(async () => {
  try {
    await db.query(SQL);
    console.log('OK: assign_class_exam_set_state_sp installed.');
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();

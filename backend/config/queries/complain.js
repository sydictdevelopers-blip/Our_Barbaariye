/**
 * Complain Management queries.
 *
 *   • Complain             → vw_complain(br_id) — full registry view
 *                            (Name / Phone / Comments / Date / User).
 *   • ComplianOutstanding  → complian_outstanding(br_id) — state='Active'.
 *   • ComplianDone         → complian_done(br_id)        — state='Inactive'.
 *
 * Branch handling lives in the SQL functions: br_id whose branch.br_name
 * is 'All' (or unknown) returns every row, otherwise filters by the
 * registering user's branch via user_branch.
 */

module.exports = {
  Complain:            (p) => `SELECT * FROM vw_complain(${Number(p?.br_id) || 0})`,
  ComplianOutstanding: (p) => `SELECT * FROM complian_outstanding(${Number(p?.br_id) || 0})`,
  ComplianDone:        (p) => `SELECT * FROM complian_done(${Number(p?.br_id) || 0})`,
};

/**
 * User Management queries — users list and accounts (branch-aware).
 */

module.exports = {
  Users: (p) => `SELECT * FROM users_show(${Number(p?.br_id) || 0})`,
  accounts: (p) => `SELECT * FROM accounts_show(${Number(p?.br_id) || 0})`,
  gendersections: (p) => `SELECT * FROM accounts_show(${Number(p?.br_id) || 0})`,
};

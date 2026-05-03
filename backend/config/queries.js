/**
 * API Queries Config — whitelist of allowed queries.
 * Keys must match: crudConfig optionsKey (dropdowns) and menuConfig queryName (datatables).
 *
 * Section files live in ./queries/ — kala saaridda waxay sahlaysaa raadinta iyo
 * inay section walba file gaar ah leeyahay (academic, students, exam, …).
 *
 * Entry shapes:
 *   - string                                       → simple SQL
 *   - (params) => string                           → dynamic SQL
 *   - (params) => { sql, prePaginated: true }      → SP already handles
 *       search/limit/offset/branch internally; api.js skips the wrap.
 *       For these, the SP MUST also expose a `total_count` window column
 *       (or callers accept that pagination total may be -1).
 */

const dropdowns = require('./queries/dropdowns');
const academic  = require('./queries/academic');
const students  = require('./queries/students');
const activity  = require('./queries/activity');
const exam      = require('./queries/exam');
const users     = require('./queries/users');
const complain  = require('./queries/complain');
const meeting   = require('./queries/meeting');

const QUERIES = {
  ...dropdowns,
  ...academic,
  ...students,
  ...activity,
  ...exam,
  ...users,
  ...complain,
  ...meeting,
};

/**
 * Returns the resolved entry for `name`, or null if not whitelisted.
 * Always returns the object shape: { sql, prePaginated }.
 *   - prePaginated=true  → SP handles search/limit/offset internally;
 *                          api.js skips the wrap-pagination layer.
 *   - prePaginated=false → api.js wraps with COUNT/LIMIT/OFFSET.
 */
function getQuery(name, params = {}) {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  const found = Object.keys(QUERIES).find((k) => k.toLowerCase() === key);
  if (!found) return null;
  const raw = QUERIES[found];
  const value = typeof raw === 'function' ? raw(params) : raw;
  if (value && typeof value === 'object' && typeof value.sql === 'string') {
    return { sql: value.sql, prePaginated: value.prePaginated === true };
  }
  return { sql: String(value), prePaginated: false };
}

module.exports = { getQuery };

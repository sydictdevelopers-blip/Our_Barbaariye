/**
 * Shared helpers for queries section files.
 */

/** Escape a single-quoted SQL literal. Use only for params interpolated into SP calls. */
function sqlText(s) {
  return String(s ?? '').replace(/'/g, "''");
}

/** Compute (page-1)*limit, clamped to >= 0. */
function offsetOf(p, defaultLimit) {
  const limit = Number(p?.limit) || defaultLimit;
  const page = Math.max(1, Number(p?.page) || 1);
  return (page - 1) * limit;
}

module.exports = { sqlText, offsetOf };

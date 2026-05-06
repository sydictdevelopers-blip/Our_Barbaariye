const db = require('./db');
const { getQuery } = require('./queries');
const { PROCEDURE_PARAM_ORDER } = require('./dynamicController');

/** Map of session-derived SP params → req.user key. Server overrides these at
 *  known positions so a tampered client can't push another branch's id. */
const SESSION_PARAM_MAP = {
  br_id_sp: 'br_id',
  u_br_id_sp: 'u_br_id',
  p_user_id: 'usr_id',
  user_id: 'usr_id',
};

function applySessionOverrides(fnName, params, user) {
  if (!user) return params;
  const order = PROCEDURE_PARAM_ORDER[fnName];
  if (!Array.isArray(order)) return params;
  const out = params.slice();
  for (const [paramName, userKey] of Object.entries(SESSION_PARAM_MAP)) {
    const idx = order.indexOf(paramName);
    if (idx >= 0 && idx < out.length && user[userKey] !== undefined) {
      out[idx] = user[userKey];
    }
  }
  return out;
}

/**
 * POST /api/bulk
 *
 * Generic transaction runner. The frontend describes a bulk operation as a list
 * of steps; each step is one of:
 *
 *   { type: 'sp',   fn: 'name_sp', params: [...]  }
 *       Calls SELECT * FROM name_sp($1, $2, ...).
 *       params may contain { ref: 'name' } / { refIter: 'col' } placeholders.
 *
 *   { type: 'select', query: 'whitelisted', queryParams: {...},
 *     pick?: 'col', saveAs: 'name' }
 *       Runs a queries.js whitelisted SELECT and saves either the picked
 *       column from the first row (when `pick`) or the full rows array.
 *
 *   { type: 'forEach', source: { ref: 'name' } | array, step: <Step> }
 *       Iterates the source array, running the inner step per element.
 *       Inside the inner step, { refIter: 'col' } resolves to the current row.
 *
 * Whole batch runs in one transaction; any failure rolls back everything.
 */

const SP_NAME_RE = /^[a-zA-Z0-9_]+$/;

function resolveValue(value, vars, iterCtx) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (typeof value.ref === 'string') {
      if (!(value.ref in vars)) throw new Error(`Unknown ref '${value.ref}'`);
      return vars[value.ref];
    }
    if (typeof value.refIter === 'string') {
      if (!iterCtx) throw new Error(`refIter '${value.refIter}' used outside forEach`);
      return iterCtx[value.refIter];
    }
  }
  return value;
}

function resolveObject(obj, vars, iterCtx) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    out[k] = resolveValue(v, vars, iterCtx);
  }
  return out;
}

async function execStep(client, step, vars, iterCtx, user) {
  if (!step || typeof step !== 'object') throw new Error('Invalid step');

  if (step.type === 'sp') {
    if (!SP_NAME_RE.test(step.fn || '')) throw new Error(`Invalid SP name: ${step.fn}`);
    const resolved = (step.params || []).map((p) => resolveValue(p, vars, iterCtx));
    const params = applySessionOverrides(step.fn, resolved, user);
    const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT * FROM ${step.fn}(${placeholders})`;
    const r = await client.query(sql, params);
    return r.rows;
  }

  if (step.type === 'select') {
    if (!step.query) throw new Error("select step missing 'query'");
    const queryParams = resolveObject(step.queryParams, vars, iterCtx);
    if (user) {
      // queries.js uses these names — force from JWT.
      queryParams.br_id = user.br_id;
      queryParams.u_br_id = user.u_br_id;
      queryParams.usr_id = user.usr_id;
    }
    const q = getQuery(step.query, queryParams);
    if (!q) throw new Error(`Unknown query: ${step.query}`);
    const r = await client.query(q.sql);
    if (step.saveAs) {
      vars[step.saveAs] = step.pick ? r.rows[0]?.[step.pick] : r.rows;
    }
    return r.rows;
  }

  if (step.type === 'forEach') {
    const arr = resolveValue(step.source, vars, iterCtx);
    if (!Array.isArray(arr)) throw new Error("forEach 'source' is not an array");
    if (!step.step) throw new Error("forEach missing inner 'step'");
    const out = [];
    for (const item of arr) {
      out.push(await execStep(client, step.step, vars, item, user));
    }
    return out;
  }

  throw new Error(`Unknown step type: ${step.type}`);
}

exports.handleBulk = async (req, res) => {
  const steps = Array.isArray(req.body?.steps) ? req.body.steps : null;
  if (!steps) {
    return res.status(400).json({ error: "Missing 'steps' array" });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const vars = {};
    const results = [];
    for (const step of steps) {
      results.push(await execStep(client, step, vars, null, req.user));
    }
    await client.query('COMMIT');
    return res.json({ success: true, vars, results });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[api/bulk] error:', e.message);
    return res.status(500).json({ error: e.message || 'Bulk failed' });
  } finally {
    client.release();
  }
};

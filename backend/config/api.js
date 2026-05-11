/**
 * API Config – POST /api/showdata (fetch), POST /api/all (insert/update/delete)
 */
const bcrypt = require('bcryptjs');
const dynamicController = require('./dynamicController');
const { getQuery } = require('./queries');
const db = require('./db');
const { setSessionCookie, clearSessionCookie, requireAuth } = require('./auth');

function formatColumnLabel(name) {
  return name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function rowsToColumnsData(rows) {
  const columns = rows[0]
    ? Object.keys(rows[0]).map((key) => ({ key, label: formatColumnLabel(key) }))
    : [];
  return { columns, data: rows };
}

function registerApiRoutes(app) {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Barbaariye API is running' });
  });

  /** POST /api/login – { username, password } → { success, message, user? }
   *  PR 4: login_check returns password_hash; bcrypt.compare runs in Node. */
  async function handleLogin(req, res) {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username iyo Password waa lagama-maarmaan',
        });
      }
      const { rows } = await db.query(
        'SELECT * FROM login_check($1)',
        [String(username).trim()]
      );
      const row = rows[0];
      if (!row) {
        return res.status(500).json({ success: false, message: 'Server qalad' });
      }
      if (!row.success) {
        return res.status(401).json({ success: false, message: row.message });
      }

      // Verify the bcrypt hash. Empty / malformed hash = lockout (account
      // never had a password set or migration left it null).
      const hash = row.password_hash || '';
      const ok = hash.startsWith('$2') && await bcrypt.compare(String(password), hash);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Password-ku waa khalad' });
      }

      setSessionCookie(res, {
        usr_id: row.usr_id,
        u_br_id: row.u_br_id,
        br_id: row.br_id,
        user_type: row.user_type,
      });

      return res.json({
        success: true,
        message: 'Login waa guuleysta',
        user: {
          usr_id: row.usr_id,
          p_id: row.p_id,
          username: row.username,
          u_br_id: row.u_br_id,
          br_id: row.br_id,
          user_type: row.user_type,
          // Drives sidebar/tab/button filtering on the client. Not a security
          // boundary — backend already enforces auth via JWT + req.user. This
          // only controls what the UI offers; if a tampered client adds a
          // forbidden menu, calling its endpoint still requires the JWT and
          // (eventually) server-side privilege checks.
          privalage: row.privalage ?? [],
          user_branch_count: row.user_branch_count ?? 1,
        },
      });
    } catch (err) {
      console.error('[api/login] error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Khalad server ayaa dhacay: ' + err.message,
      });
    }
  }

  app.post('/api/login', handleLogin);
  app.post('/login', handleLogin);

  /** POST /api/user-branches – soo celi branches-ka user-ka logged-in (req.user.usr_id) */
  async function handleUserBranches(req, res) {
    try {
      const usr_id = req.user.usr_id;
      const { rows } = await db.query(
        `SELECT u.br_id, u.br_name
           FROM branch u
           JOIN user_branch ub ON u.br_id = ub.br_id
          WHERE ub.usr_id = $1
          ORDER BY u.br_name`,
        [usr_id]
      );
      return res.json({ success: true, branches: rows });
    } catch (err) {
      console.error('[api/user-branches] error:', err.message);
      return res.status(500).json({ success: false, message: 'Khalad server: ' + err.message });
    }
  }

  app.post('/api/user-branches', requireAuth, handleUserBranches);
  app.post('/user-branches', requireAuth, handleUserBranches);

  /** POST /api/logout – clear the session cookie. */
  app.post('/api/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ success: true });
  });
  app.post('/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ success: true });
  });

  /** POST /api/switch-branch – { br_id } → re-issue JWT with the new branch.
   *  Server validates that the logged-in user actually owns the requested
   *  branch via user_branch table — without this, any authenticated user
   *  could elevate to any branch by sending its id. */
  async function handleSwitchBranch(req, res) {
    try {
      const usr_id = req.user.usr_id;
      const requested = Number(req.body?.br_id);
      if (!Number.isFinite(requested) || requested <= 0) {
        return res.status(400).json({ success: false, message: 'br_id waa lagama-maarmaan' });
      }
      const { rows } = await db.query(
        `SELECT ub.u_br_id, ub.user_type, ub.privalage
           FROM user_branch ub
          WHERE ub.usr_id = $1
            AND ub.br_id = $2
            AND LOWER(TRIM(COALESCE(ub.state, '')))     = 'active'
            AND LOWER(TRIM(COALESCE(ub.lock_user, ''))) = 'unlocked'
          LIMIT 1`,
        [usr_id, requested]
      );
      const owned = rows[0];
      if (!owned) {
        return res.status(403).json({ success: false, message: 'Branch-kan uma jirto user-kan' });
      }
      setSessionCookie(res, {
        usr_id,
        u_br_id: owned.u_br_id,
        br_id: requested,
        user_type: owned.user_type,
      });
      // Return new privalage so the client can refresh its UI gating without
      // a full reload (privileges may differ per branch).
      return res.json({
        success: true,
        br_id: requested,
        u_br_id: owned.u_br_id,
        user_type: owned.user_type,
        privalage: owned.privalage ?? [],
      });
    } catch (err) {
      console.error('[api/switch-branch] error:', err.message);
      return res.status(500).json({ success: false, message: 'Khalad server: ' + err.message });
    }
  }

  app.post('/api/switch-branch', requireAuth, handleSwitchBranch);
  app.post('/switch-branch', requireAuth, handleSwitchBranch);

  /** POST /api/data – { queryName, page?, limit?, search? } → { columns, data, pagination } */
  async function handleDataRequest(req, res) {
    try {
      // Trust ONLY the JWT for branch context. Body-supplied br_id/u_br_id
      // are silently overridden so a tampered client can't read other branches.
      const body = {
        ...(req.body || {}),
        br_id: req.user.br_id,
        u_br_id: req.user.u_br_id,
        usr_id: req.user.usr_id,
      };
      const queryName = (body.queryName || body.query || '').toString().trim();
      const page = Math.max(1, parseInt(body.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(body.limit, 10) || 10));
      const search = (body.search ?? body.q ?? '').toString().trim();
      if (search && process.env.NODE_ENV !== 'production') {
        console.log('[api/data] search:', JSON.stringify(search));
      }
      const entry = getQuery(queryName || 'accounts', body);
      if (!entry) return res.status(404).json({ error: 'Query not allowed or not found', queryName: queryName || null });
      const { sql, prePaginated } = entry;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[api/data] queryName=${queryName} prePaginated=${prePaginated} sql=${sql}`);
      }
      let columns, rows, total;
      if (prePaginated) {
        // SP already applied search/limit/offset/branch — run directly, no wrap.
        ({ columns, data: rows, total } = await dynamicController.runSelectQueryDirect(sql));
      } else {
        ({ columns, data: rows, total } = await dynamicController.runSelectQueryPaginated(sql, page, limit, search));
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[api/data] queryName=${queryName} total=${total} rows=${rows.length} sample=`, rows.slice(0, 3));
      }
      res.json({
        columns,
        data: rows,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      const body = req.body || {};
      const qn = (typeof queryName !== 'undefined' ? queryName : (body.queryName || body.query || '').toString().trim()) || null;
      const safeLimit = typeof limit !== 'undefined' ? limit : 10;
      console.error('[api/data] queryName:', qn, 'error:', err.message);
      let msg = err.message || 'Query failed';
      // Mask only true "missing relation" (table/view) errors — keep "function does not exist"
      // visible so missing stored procedures surface as real errors during development.
      const isMissingTable = /relation\s+["']?[\w.]+["']?\s+does not exist/i.test(msg);
      if (isMissingTable && process.env.NODE_ENV !== 'production') {
        res.json({ columns: [], data: [], pagination: { total: 0, page: 1, limit: safeLimit, totalPages: 0 } });
        return;
      }
      if (/ECONNREFUSED|ETIMEDOUT/.test(msg) && process.env.NODE_ENV !== 'production') {
        msg += ' On DB server (see .env DB_HOST): allow port 5432 from your IP and pg_hba.conf.';
      }
      res.status(500).json({ error: msg, queryName: qn });
    }
  }

  app.post('/api/data', requireAuth, handleDataRequest);
  app.post('/api/showdata', requireAuth, (req, res) =>
    handleDataRequest(
      { ...req, body: { ...req.body, page: req.body?.page ?? 1, limit: req.body?.limit ?? 100 } },
      res
    )
  );
  // Same handlers at /data and /showdata (when proxy strips /api, e.g. http://172.20.0.20/api -> backend gets /data)
  app.post('/data', requireAuth, handleDataRequest);
  app.post('/showdata', requireAuth, (req, res) =>
    handleDataRequest(
      { ...req, body: { ...req.body, page: req.body?.page ?? 1, limit: req.body?.limit ?? 100 } },
      res
    )
  );

  /** POST /api/stream – { queryName } → streaming JSON array (xogta badan 1M+ rows) */
  function handleStream(req, res) {
    const queryName = (req.body?.queryName || req.body?.query || '').trim();
    const body = {
      ...(req.body || {}),
      br_id: req.user.br_id,
      u_br_id: req.user.u_br_id,
      usr_id: req.user.usr_id,
    };
    const entry = getQuery(queryName || 'accounts', body);
    if (!entry) return res.status(404).json({ error: 'Query not allowed or not found' });
    dynamicController.handleStreamRequest(req, res, entry.sql);
  }
  app.post('/api/stream', requireAuth, handleStream);
  app.post('/stream', requireAuth, handleStream);
}

module.exports = { registerApiRoutes };

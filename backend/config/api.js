/**
 * API Config – POST /api/showdata (fetch), POST /api/all (insert/update/delete)
 */
const dynamicController = require('./dynamicController');
const { getQuery } = require('./queries');
const db = require('./db');

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

  /** POST /api/login – { username, password } → { success, message, user? } */
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
        'SELECT * FROM login_check($1, $2)',
        [String(username).trim(), String(password)]
      );
      const row = rows[0];
      if (!row) {
        return res.status(500).json({ success: false, message: 'Server qalad' });
      }
      if (!row.success) {
        return res.status(401).json({ success: false, message: row.message });
      }
      // Guul: soo celi xogta useer-ka (authkey la iska ilaaliyo HTTP-ka)
      return res.json({
        success: true,
        message: row.message,
        user: {
          usr_id: row.usr_id,
          p_id: row.p_id,
          username: row.username,
          authkey: row.authkey,
          u_br_id: row.u_br_id,
          br_id: row.br_id,
          user_type: row.user_type,
          privalage: row.privalage,
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

  /** POST /api/user-branches – { usr_id } → { branches: [{br_id, br_name}] } */
  async function handleUserBranches(req, res) {
    try {
      const { usr_id } = req.body || {};
      if (!usr_id) return res.status(400).json({ success: false, message: 'usr_id waa lagama-maarmaan' });
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

  app.post('/api/user-branches', handleUserBranches);
  app.post('/user-branches', handleUserBranches);

  /** POST /api/data – { queryName, page?, limit?, search? } → { columns, data, pagination } */
  async function handleDataRequest(req, res) {
    try {
      const body = req.body || {};
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

  app.post('/api/data', handleDataRequest);
  app.post('/api/showdata', (req, res) =>
    handleDataRequest(
      { ...req, body: { ...req.body, page: req.body?.page ?? 1, limit: req.body?.limit ?? 100 } },
      res
    )
  );
  // Same handlers at /data and /showdata (when proxy strips /api, e.g. http://172.20.0.20/api -> backend gets /data)
  app.post('/data', handleDataRequest);
  app.post('/showdata', (req, res) =>
    handleDataRequest(
      { ...req, body: { ...req.body, page: req.body?.page ?? 1, limit: req.body?.limit ?? 100 } },
      res
    )
  );

  /** POST /api/stream – { queryName } → streaming JSON array (xogta badan 1M+ rows) */
  app.post('/api/stream', (req, res) => {
    const queryName = (req.body?.queryName || req.body?.query || '').trim();
    const entry = getQuery(queryName || 'accounts', req.body || {});
    if (!entry) return res.status(404).json({ error: 'Query not allowed or not found' });
    dynamicController.handleStreamRequest(req, res, entry.sql);
  });
  app.post('/stream', (req, res) => {
    const queryName = (req.body?.queryName || req.body?.query || '').trim();
    const entry = getQuery(queryName || 'accounts', req.body || {});
    if (!entry) return res.status(404).json({ error: 'Query not allowed or not found' });
    dynamicController.handleStreamRequest(req, res, entry.sql);
  });
}

module.exports = { registerApiRoutes };

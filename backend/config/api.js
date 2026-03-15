/**
 * API Config – POST /api/showdata (fetch), POST /api/all (insert/update/delete)
 */
const dynamicController = require('./dynamicController');
const { getQuery } = require('./queries');

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
      const sql = getQuery(queryName || 'accounts');
      if (!sql) return res.status(404).json({ error: 'Query not allowed or not found', queryName: queryName || null });
      const { columns, data: rows, total } = await dynamicController.runSelectQueryPaginated(sql, page, limit, search);
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
      const isMissingTable = /relation\s+["']?[\w.]+["']?\s+does not exist|does not exist/i.test(msg);
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
    const sql = getQuery(queryName || 'accounts');
    if (!sql) return res.status(404).json({ error: 'Query not allowed or not found' });
    dynamicController.handleStreamRequest(req, res, sql);
  });
  app.post('/stream', (req, res) => {
    const queryName = (req.body?.queryName || req.body?.query || '').trim();
    const sql = getQuery(queryName || 'accounts');
    if (!sql) return res.status(404).json({ error: 'Query not allowed or not found' });
    dynamicController.handleStreamRequest(req, res, sql);
  });
}

module.exports = { registerApiRoutes };

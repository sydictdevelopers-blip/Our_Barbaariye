const db = require('./db');

/** Allowed stored procedure names (security whitelist) – ku dar magacyada habraaca ee aad isticmaasho */
const ALLOWED_PROCEDURES = new Set([
    'level_sp', 'class_sp', 'accounts_sp', 'subjects_sp', 'student_classes_sp', 'studentsubjects_sp',
    'students_sp', 'studentacademicyears_sp', 'people_sp'
]);

/** Param order to match PostgreSQL function signatures (add/modify per DB). */
const PROCEDURE_PARAM_ORDER = {
    level_sp: ['lev_id_sp', 'l_ty_id_sp', 'level_sp', 'fee_sp', 'br_id_sp', 'u_br_id_sp', 'oper'],
    class_sp: ['cl_id_sp', 'class_sp', 'lev_id_sp', 'gr_id_sp', 'state_sp', 'br_id_sp', 'u_br_id_sp', 'oper'],
};

/**
 * handleDynamicRequest() – U waca PostgreSQL stored procedures maraya /api/all
 * Body: { fn: 'level_sp', ...params } – p_operation waa la iska reebaa (ma u gudbin DB)
 */
exports.handleDynamicRequest = async (req, res) => {
    let params = [];
    let procedureName = null;

    const sendJsonError = (status, message) => {
        res.status(status).set('Content-Type', 'application/json');
        res.send(JSON.stringify({ error: message }));
    };

    try {
        const body = req.body || {};
        if (Object.keys(body).length === 0) {
            return res.status(400).set('Content-Type', 'application/json').send(JSON.stringify({ error: 'Empty request' }));
        }

        // Procedure name: use fn explicitly, else first entry value (legacy)
        procedureName = (typeof body.fn === 'string' && body.fn.trim()) ? body.fn.trim() : null;
        if (!procedureName) {
            const firstEntry = Object.entries(body)[0];
            procedureName = firstEntry ? String(firstEntry[1] || '').trim() : null;
        }
        if (!procedureName) {
            return sendJsonError(400, 'Missing fn (procedure name)');
        }

        // Params: exclude fn and p_operation. Use PROCEDURE_PARAM_ORDER if defined, else body key order
        const bodyParams = { ...body };
        delete bodyParams.fn;
        delete bodyParams.p_operation;
        const order = PROCEDURE_PARAM_ORDER[procedureName];
        if (order && order.length) {
            params = order.map((key) => (bodyParams[key] !== undefined && bodyParams[key] !== null ? bodyParams[key] : ''));
        } else {
            params = Object.entries(bodyParams).map(([, val]) => val);
        }

        // Security: format + whitelist
        if (!/^[a-zA-Z0-9_]+$/.test(procedureName)) {
            console.warn(`[api/all] Invalid procedure name: ${procedureName}`);
            return sendJsonError(400, 'Invalid function name');
        }
        if (!ALLOWED_PROCEDURES.has(procedureName)) {
            console.warn(`[api/all] Procedure not allowed: ${procedureName}`);
            return sendJsonError(403, `Procedure not allowed: ${procedureName}. Add to ALLOWED_PROCEDURES in dynamicController.js if needed.`);
        }

        /**
         * Step 6: Dhis Weydiinta SQL (Construct the SQL Query)
         * 
         * TALLAABO:
         * 1. Abuur paramPlaceholders → $1, $2, $3, ... (si loo ilaaliyo SQL injection)
         * 2. Abuur query → SELECT * FROM procedureName($1, $2, ...)
         * 
         * MUHIIM: Waxaan isticmaaleynaa weydiin leh xuduudo (parameterized query)
         *         Ma isku xireyno (concatenate) qiimayaasha. Kaliya waxaan galineynaa magaca habraaca la xaqiijiyay.
         */
        const paramPlaceholders = params.map((_, index) => `$${index + 1}`).join(', ');
        const query = `SELECT * FROM ${procedureName}(${paramPlaceholders})`;

        console.log(`[api/all] ${procedureName} params(${params.length}):`, params.map((p, i) => `$${i + 1}=${String(p).slice(0, 40)}`).join(' '));

        /**
         * Step 7: Fuli Weydiinta (Execute Query)
         * 
         * TALLAABO:
         * 1. db.query(query, params) → u wac PostgreSQL function-ka
         * 2. Ka hel result (rows array)
         */
        const result = await db.query(query, params);

        /**
         * Step 8: Qaabaynta Jawaabta (Format Response)
         * 
         * MUHIIM:
         * Hab-dhaqankii hore: "Backend-ku wuxuu soo celinayaa oo kaliya tiirka hore ee safka hore ee soo laabtay"
         * "Frontend-ku wuxuu sugayaa jawaab qoraal cad ah (plain text), ee ma aha JSON"
         * 
         * TALLAABO:
         * 1. Haddii result.rows.length > 0 → ka hel firstRow + firstColumnValue
         * 2. res.set('Content-Type', 'text/plain') → u sheeg browser-ka in response-ku yahay text
         * 3. res.send(String(firstColumnValue)) → soo celi first column value (text)
         * 4. Haddii ma jiro result → soo celi empty string ('')
         */
        if (result.rows.length > 0) {
            // Qaado safka hore (Get the first row)
            const firstRow = result.rows[0];
            // Qaado qiimaha tiirka hore (Getting first column's value)
            const firstColumnValue = Object.values(firstRow)[0];

            // U soo dir sidii qoraal cad (Send as plain text)
            res.set('Content-Type', 'text/plain');
            res.send(String(firstColumnValue));
        } else {
            // No row returned – treat as success with empty message (some procedures return nothing)
            res.set('Content-Type', 'text/plain');
            res.send('success');
        }

    } catch (error) {
        console.error('[api/all] Database error:', error.message);
        const isProduction = process.env.NODE_ENV === 'production';
        const message = isProduction ? 'Qalad nidaamka' : error.message;
        res.status(500).set('Content-Type', 'application/json');
        res.send(JSON.stringify({ error: message, procedure: procedureName || null }));
    }
};

/** Xogta SELECT: amniga. */
const FORBIDDEN = ['DELETE', 'DROP', 'UPDATE', 'TRUNCATE', 'INSERT', 'ALTER', 'CREATE'];

/** Run SELECT query (api/showdata) */
exports.runSelectQuery = async (query) => {
  const q = (query || '').trim().toUpperCase();
  if (!q.startsWith('SELECT')) throw new Error('Only SELECT allowed');
  const bad = FORBIDDEN.find((w) => q.includes(w));
  if (bad) throw new Error(`Forbidden: ${bad}`);
  const result = await db.query(query);
  return result.rows || [];
};

/** Run SELECT with pagination (api/data) – returns { columns, data, total }. Optional search: ILIKE on all columns. */
exports.runSelectQueryPaginated = async (query, page = 1, limit = 10, search = '') => {
  const q = (query || '').trim().toUpperCase();
  if (!q.startsWith('SELECT')) throw new Error('Only SELECT allowed');
  const bad = FORBIDDEN.find((w) => q.includes(w));
  if (bad) throw new Error(`Forbidden: ${bad}`);
  const searchTerm = (search ?? '').toString().trim();
  const hasSearch = searchTerm.length > 0;
  const offset = (page - 1) * limit;

  let total, rows;
  if (hasSearch) {
    const searchParam = '%' + searchTerm + '%';
    const whereClause = `EXISTS (
      SELECT 1 FROM jsonb_each_text(to_jsonb(_t)) AS j(k, v)
      WHERE v ILIKE $1
    )`;
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM (${query}) AS _t WHERE ${whereClause}`,
      [searchParam]
    );
    total = countResult.rows[0]?.total ?? 0;
    const result = await db.query(
      `SELECT * FROM (${query}) AS _t WHERE ${whereClause} LIMIT $2 OFFSET $3`,
      [searchParam, limit, offset]
    );
    rows = result.rows || [];
  } else {
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM (${query}) AS _ct`);
    total = countResult.rows[0]?.total ?? 0;
    const result = await db.query(`SELECT * FROM (${query}) AS _paged LIMIT $1 OFFSET $2`, [limit, offset]);
    rows = result.rows || [];
  }
  const columns = rows[0]
    ? Object.keys(rows[0]).map((key) => ({
        key,
        label: key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
      }))
    : [];
  return { columns, data: rows, total };
};

/** POST /api/stream – row-by-row JSON (xogta badan) – sql waa la gudbiyay api.js (queries whitelist) */
const QueryStream = require('pg-query-stream');
exports.handleStreamRequest = async (req, res, sql) => {
  const client = await db.pool.connect();
  try {
    const stream = client.query(new QueryStream(sql));
    res.setHeader('Content-Type', 'application/json');
    let isFirst = true;
    res.write('[');
    stream.on('data', (row) => {
      if (!isFirst) res.write(',');
      res.write(JSON.stringify(row));
      isFirst = false;
    });
    stream.on('end', () => {
      res.write(']');
      res.end();
      client.release();
    });
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
      client.release();
    });
  } catch (err) {
    console.error('Stream setup:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    client.release();
  }
};
const db = require('./db');

/**
 * Dynamic mode: any stored procedure ending with '_sp' is allowed.
 * Security: procedure name is validated with strict regex (/^[a-zA-Z0-9_]+$/)
 * to prevent SQL injection — only safe identifier characters are allowed.
 */

/**
 * Param order to match PostgreSQL function signatures.
 * All procedures use 'oper' with full-word codes: 'insert' | 'update' | 'delete'.
 */
const PROCEDURE_PARAM_ORDER = {
  subject_sp: ['sub_id_sp', 'name_sp', 'state_sp', 'ordering_sp', 'oper'],
  level_sp: ['lev_id_sp', 'l_ty_id_sp', 'level_name_sp', 'fee_sp', 'br_id_sp', 'u_br_id_sp', 'oper'],
  class_sp: ['cl_id_sp', 'class_sp', 'lev_id_sp', 'gr_id_sp', 'br_id_sp', 'u_br_id_sp', 'sh_id_sp', 'oper'],
  class_formaster_sp: ['c_f_id_sp', 'cl_id_sp', 'emp_id_sp', 'std_id_sp', 'a_y_id_sp', 'state_sp', 'u_br_id_sp', 'oper'],
  subject_class_sp: ['sub_cl_id_sp', 'cl_id_sp', 'sub_id_sp', 'emp_id_sp', 'no_of_period_sp', 'state_sp', 'u_br_id_sp', 'a_y_id_sp', 'oper'],
  lesson_plan_sp: ['l_p_id_sp', 'emp_id_sp', 'sub_cl_id_sp', 'chap_id_sp', 'topic_sp', 'page_sp', 'description_sp', 'u_br_id_sp', 'oper'],
  lesson_activity_sp: ['ac_t_id_sp', 'ac_id_sp', 'cl_id_sp', 'sub_cl_id_sp', 'marks_sp', 'description_sp', 'deadline_sp', 'e_r_id_sp', 'language_sp', 'oper'],
  lesson_activity_result_sp: ['lar_id_sp', 'ac_t_id_sp', 'std_cl_id_sp', 'marks_sp', 'state_sp', 'oper'],
  bulk_lesson_activity_result_sp: ['a_y_id_sp', 'cl_id_sp', 'b_id_sp', 'ex_reg_id_sp', 'oper'],
  activity_sp: ['act_id_sp', 'activity_name_sp', 'description_sp', 'state_sp', 'br_id_sp', 'u_br_id_sp', 'oper'],
  subject_activity_sp: ['sub_act_id_sp', 'act_id_sp', 'subject_id_sp', 'max_marks_sp', 'state_sp', 'oper'],
  student_activity_edit_sp: ['sta_id_sp', 'student_id_sp', 'sub_act_id_sp', 'marks_sp', 'state_sp', 'oper'],
  academic_year_sp: ['a_y_id_sp', 'academic_name_sp', 'started_sp', 'ended_sp', 'active_sp', 'u_br_id_sp', 'oper'],
  users_sp: ['usr_id_sp', 'p_id_sp', 'username_sp', 'password_sp', 'br_id_sp', 'state_sp', 'lock_user_sp', 'oper'],
  user_privilege_sp: ['usr_id_sp', 'privalage_sp', 'oper'],
  responsible_sp: ['res_id_sp', 'p_id_sp', 'p_name_sp', 'tel_sp', 'phone_sp', 'sex_sp', 'ad_id_sp', 'state_sp', 'u_br_id_sp', 'oper'],
  bus_sp: ['bus_id_sp', 'bus_name_sp', 'emp_id_sp', 'targo_sp', 'u_br_id_sp', 'oper'],
  schools_sp: ['num', 'sname', 'reg_no', 'user_id', 'oper'],
  student_state_sp: ['ids', 'clas', 'academic', 'reason', 'oper_fee', 'fee_amount', 'account_pr', 'to_class', 'description_sp', 'date_sp', 'user_id'],
  student_responsible: ['p_num', 'p_waalid', 'p_operation', 'p_user_id'],
  del_responsible_with_no_std_spv: [],
  exam_sp: ['ex_id_sp', 'exam_sp_v', 'ordering_sp', 'u_br_id_sp', 'oper'],
  exam_reg_sp: ['ex_reg_id_sp', 'a_y_id_sp', 'ex_id_sp', 'exam_type_sp', 'marks_sp', 'start_date_sp', 'end_date_sp', 'deadline_sp', 'br_id_sp', 'exam_status_sp', 'attendance_marks_sp', 'u_br_id_sp', 'oper'],
  assign_class_exam_sp: ['a_c_e_id_sp', 'er_id_sp', 'cl_id_sp', 'b_id_sp', 'u_br_id_sp', 'oper'],
  remove_assign_class_byclass_sp: ['cl_id_sp', 'b_id_sp', 'a_y_id_sp', 'ex_id_sp', 'u_br_id_sp', 'br_id_sp'],
  remove_assign_class_byexam_sp: ['a_y_id_sp', 'ex_id_sp', 'u_br_id_sp', 'br_id_sp'],
  exam_schedule_sp: ['ex_s_id_sp', 'day_id_sp', 'per_id_sp', 'sub_cl_id_sp', 'sh_id_sp', 'cl_id_sp', 'ex_r_id_sp', 'start_time_sp', 'end_time_sp', 'exam_date_sp', 'u_br_id_sp', 'oper'],
  exam_siting_sp: ['ex_set_id_sp', 'a_y_id_sp', 'percentage_fail_pass_sp', 'attendance_marks_sp', 'activity_marks_sp', 'u_br_id_sp', 'oper'],
  student_marge_sp: ['std_frm', 'std_to'],
  update_all_responsibles_one_class_sp: ['p_res_id', 'p_full_name', 'p_phone_one', 'p_phone_two', 'p_u_br_id'],
  update_emis_student_id_sp: ['p_std_id', 'p_id_card', 'p_u_br_id'],
};

/**
 * handleDynamicRequest() – U waca PostgreSQL stored procedures maraya /api/all
 * Body: { fn: 'level_sp', ...params, oper: 'insert'|'update'|'delete' }
 * Dhammaan SP-yadu waxay isticmaalaan 'oper' oo qaabka erey buuxa ah.
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

        // Params: exclude fn. 'oper' is a real SP param, ee waa la haynaa.
        const bodyParams = { ...body };
        delete bodyParams.fn;
        if (typeof bodyParams.oper === 'string') {
            bodyParams.oper = bodyParams.oper.trim().toLowerCase();
        }

        const order = PROCEDURE_PARAM_ORDER[procedureName];

        if (Array.isArray(order)) {
            // Explicit param order defined (even an empty array means "zero params") → use it exactly
            params = order.map((key) => (bodyParams[key] !== undefined && bodyParams[key] !== null ? bodyParams[key] : ''));
        } else {
            // No explicit order → pass bodyParams values in received key order
            params = Object.entries(bodyParams).map(([, val]) => val);
        }

        // Security: validate procedure name format only (alphanumeric + underscore)
        // This prevents SQL injection — no whitelist needed in dynamic mode.
        if (!/^[a-zA-Z0-9_]+$/.test(procedureName)) {
            console.warn(`[api/all] Invalid procedure name: ${procedureName}`);
            return sendJsonError(400, 'Invalid function name');
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
        console.log(query);
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
            // NULL / undefined DB response → "success" (ma "null" string) si frontend-ku u aqoonsado guul
            const plainOut = firstColumnValue == null || firstColumnValue === '' ? 'success' : String(firstColumnValue);

            // U soo dir sidii qoraal cad (Send as plain text)
            res.set('Content-Type', 'text/plain');
            res.send(plainOut);
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

/** Xogta SELECT: amniga. Word-boundary regex si magacyada function-ka oo
 *  ku jira `update_*` aan loo qaldin keyword DML. String literals waa la
 *  saaraa ka hor hubinta si SP params sida 'update'/'insert' aan u qalad
 *  ahaan u soo bandhigin keyword DML. */
const FORBIDDEN_RE = /\b(DELETE|DROP|UPDATE|TRUNCATE|INSERT|ALTER|CREATE)\b/;
const stripQuoted = (s) => s.replace(/'(?:[^']|'')*'/g, "''");
function assertSafeSelect(query) {
  const q = (query || '').trim().toUpperCase();
  if (!q.startsWith('SELECT')) throw new Error('Only SELECT allowed');
  const bad = stripQuoted(q).match(FORBIDDEN_RE);
  if (bad) throw new Error(`Forbidden: ${bad[1]}`);
}

/** Run SELECT query (api/showdata) */
exports.runSelectQuery = async (query) => {
  assertSafeSelect(query);
  const result = await db.query(query);
  return result.rows || [];
};

/**
 * Run SELECT directly with no wrap (api/data, prePaginated entries) – returns
 * { columns, data, total }. The SP itself is expected to apply search/limit/
 * offset and (optionally) emit a `total_count` window column on every row.
 * If `total_count` is absent, total = rows.length (LIMIT-bounded).
 */
exports.runSelectQueryDirect = async (query) => {
  assertSafeSelect(query);
  const result = await db.query(query);
  const rows = result.rows || [];
  const first = rows[0];
  const hasTotal = first && Object.prototype.hasOwnProperty.call(first, 'total_count');
  const total = hasTotal ? Number(first.total_count) || 0 : rows.length;
  // Hide the helper column from the response so the frontend table doesn't render it.
  const data = hasTotal ? rows.map(({ total_count, ...rest }) => rest) : rows;
  const columns = data[0]
    ? Object.keys(data[0]).map((key) => ({
        key,
        label: key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
      }))
    : [];
  return { columns, data, total };
};

/** Run SELECT with pagination (api/data) – returns { columns, data, total }. Optional search: ILIKE on all columns. */
exports.runSelectQueryPaginated = async (query, page = 1, limit = 10, search = '') => {
  assertSafeSelect(query);
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
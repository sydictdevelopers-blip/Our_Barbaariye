const path = require('path');
const { Pool, types } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Pg-node by default converts DATE / TIMESTAMP columns into JS Date objects
// using the SERVER's local timezone. On a server in EAT (UTC+3) a stored
// `2025-04-28` becomes `Date(2025-04-28T00:00:00 +03:00)` which serializes to
// `"2025-04-27T21:00:00.000Z"` — one day off. We override the parsers so the
// raw PostgreSQL string crosses the wire unchanged: the frontend renders
// exactly what's stored, no timezone math involved.
//
// OIDs: 1082=DATE, 1114=TIMESTAMP, 1184=TIMESTAMPTZ, 1083=TIME, 1266=TIMETZ.
const passThrough = (val) => val;
types.setTypeParser(1082, passThrough);
types.setTypeParser(1114, passThrough);
types.setTypeParser(1184, passThrough);
types.setTypeParser(1083, passThrough);
types.setTypeParser(1266, passThrough);

/**
 * Build connection string so password is always part of a string (fixes SASL error).
 * DB_HOST can be localhost or a remote IP (e.g. 192.168.x.x from Webmin/PostgreSQL).
 */
function getConnectionString() {
  const user = process.env.DB_USER || 'postgres';
  const host = process.env.DB_HOST || 'localhost';
  const database = process.env.DB_NAME || 'barbaariye_demo_v10';
  const port = parseInt(process.env.DB_PORT, 10) || 5432;
  const raw = process.env.DB_PASSWORD;
  const password = raw != null && raw !== '' ? encodeURIComponent(String(raw).trim()) : '';
  const userEnc = encodeURIComponent(user);
  return `postgresql://${userEnc}:${password}@${host}:${port}/${database}`;
}

const pool = new Pool({
  connectionString: getConnectionString(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // allow time for remote DB (e.g. 192.x.x.x)
});

pool.on('error', (err) => {
  console.error('Qalad lama filaan ah oo ku yimid macmiilka shaqaynaya', err)
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};

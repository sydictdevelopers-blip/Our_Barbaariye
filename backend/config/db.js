const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

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

/**
 * apply-migrations.js
 *
 * Run dhammaan migrations-ka SQL ee `backend/scripts/*.sql` (ama hal file kaliya
 * via CLI arg) database-ka, kala saadigaal magacyada (alphabetical).
 *
 * Usage:
 *   node scripts/apply-migrations.js           # dhammaan *.sql
 *   node scripts/apply-migrations.js name.sql  # hal file
 *   npm run migrate                            # script alias (package.json)
 *
 * SQL files-keenna way idempotent yihiin (DROP FUNCTION IF EXISTS + CREATE OR
 * REPLACE), sidaa darteed dib u shaqaynta amaan ah.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = __dirname;
// Skip non-migration helpers and big legacy bundles.
const SKIP = new Set([
  'show-functions-backup-2026-04-25.sql', // backup-only, don't replay
  'show-functions-to-rewrite.sql',        // notes file
  'show-functions-all-check.sql',         // check/diagnostic
  'student-state-diagnostic.sql',         // diagnostic
]);

function listMigrations(filter) {
  if (filter) {
    if (!filter.endsWith('.sql')) filter += '.sql';
    if (!fs.existsSync(path.join(SCRIPTS_DIR, filter))) {
      throw new Error(`Lama helin: scripts/${filter}`);
    }
    return [filter];
  }
  return fs.readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith('.sql') && !SKIP.has(f))
    .sort();
}

async function main() {
  const arg = process.argv[2];
  const files = listMigrations(arg);
  if (!files.length) {
    console.log('Migration ma jiro.');
    return;
  }

  const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
  });

  let okCount = 0;
  let failCount = 0;
  for (const f of files) {
    const sql = fs.readFileSync(path.join(SCRIPTS_DIR, f), 'utf8');
    try {
      await pool.query(sql);
      console.log(`OK   ${f}`);
      okCount += 1;
    } catch (e) {
      console.error(`FAIL ${f}\n     → ${e.message}`);
      failCount += 1;
    }
  }
  await pool.end();

  console.log(`\nGuulaystey: ${okCount}   Fashilmay: ${failCount}   Wadarta: ${files.length}`);
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Khalad guud:', e.message);
  process.exit(1);
});

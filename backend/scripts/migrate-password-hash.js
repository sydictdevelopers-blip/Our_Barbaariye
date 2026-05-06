#!/usr/bin/env node
/**
 * migrate-password-hash.js — one-shot password column migration.
 *
 * 1. ADD COLUMN password_hash VARCHAR(255)
 * 2. For every user with a non-empty plaintext password, write
 *    bcrypt($2a$, cost=12) into password_hash.
 * 3. DROP COLUMN password
 * 4. Replace login_check + users_sp SPs with the password_hash variants.
 *
 * Idempotent: skips users whose hash already starts with `$2`. Safe to
 * re-run if the migration was interrupted before drop-column.
 *
 * Usage:  node scripts/migrate-password-hash.js
 */
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', 'config', '.env') });

const COST = 12;

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, column]
  );
  return rows.length > 0;
}

async function runFile(client, filename) {
  const sql = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  await client.query(sql);
  console.log(`  ✓ applied ${filename}`);
}

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const client = await pool.connect();

  try {
    console.log('[migrate] starting password-hash migration');

    const hasPasswordCol = await columnExists(client, 'users', 'password');
    const hasHashCol = await columnExists(client, 'users', 'password_hash');

    // Step 1 — add column if missing
    if (!hasHashCol) {
      console.log('[step 1] ADD COLUMN password_hash');
      await client.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)');
    } else {
      console.log('[step 1] password_hash column already exists — skipping ADD');
    }

    // Step 2 — backfill from plaintext
    if (hasPasswordCol) {
      console.log('[step 2] backfilling password_hash from plaintext password');
      const { rows } = await client.query(
        `SELECT usr_id, password, password_hash
           FROM users
          WHERE password IS NOT NULL AND password <> ''`
      );
      let migrated = 0, skipped = 0;
      for (const row of rows) {
        if (row.password_hash && row.password_hash.startsWith('$2')) {
          skipped++;
          continue;
        }
        const hash = await bcrypt.hash(row.password, COST);
        await client.query(
          'UPDATE users SET password_hash = $1 WHERE usr_id = $2',
          [hash, row.usr_id]
        );
        migrated++;
      }
      console.log(`  ✓ hashed ${migrated} users, ${skipped} already-hashed skipped`);
    } else {
      console.log('[step 2] password column already gone — skipping backfill');
    }

    // Step 3 — replace SPs to read/write password_hash
    console.log('[step 3] replacing login_check + users_sp SPs');
    await runFile(client, 'login-function-v2.sql');
    await runFile(client, 'users-sp-v2.sql');

    // Step 4 — drop the plaintext column (only after SPs no longer reference it)
    if (hasPasswordCol) {
      console.log('[step 4] DROP COLUMN password');
      await client.query('ALTER TABLE users DROP COLUMN password');
    } else {
      console.log('[step 4] password column already dropped — skipping');
    }

    console.log('[migrate] done ✓');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err.message);
  console.error(err);
  process.exit(1);
});

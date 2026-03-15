/**
 * Tijaabo API-ka – health iyo /api/data
 * Isticmaal: node scripts/test-api.js
 *        ama: node scripts/test-api.js http://192.145.173.81:3000
 */
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

async function test() {
  console.log('Base URL:', BASE);
  console.log('---');

  // 1. Health
  try {
    const r = await fetch(`${BASE}/health`);
    const j = await r.json();
    console.log('GET /health:', r.status, j);
  } catch (e) {
    console.error('GET /health failed:', e.message);
  }

  // 2. POST /api/data – level_type (dropdown)
  try {
    const r = await fetch(`${BASE}/api/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryName: 'level_type', page: 1, limit: 10 }),
    });
    const j = await r.json();
    console.log('POST /api/data (level_type):', r.status, 'rows:', j.data?.length ?? 0);
    if (j.data?.length) console.log('  Sample:', j.data[0]);
    if (j.error) console.log('  Error:', j.error);
  } catch (e) {
    console.error('POST /api/data (level_type) failed:', e.message);
  }

  // 3. POST /api/data – accounts
  try {
    const r = await fetch(`${BASE}/api/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryName: 'accounts', page: 1, limit: 5 }),
    });
    const j = await r.json();
    console.log('POST /api/data (accounts):', r.status, 'rows:', j.data?.length ?? 0);
    if (j.error) console.log('  Error:', j.error);
  } catch (e) {
    console.error('POST /api/data (accounts) failed:', e.message);
  }

  console.log('---');
  console.log('Done.');
}

test();

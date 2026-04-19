#!/usr/bin/env node
/**
 * Soo saar IP-ka public ee PC-kaaga – ku dar server-ka pg_hba.conf.
 * Run: node scripts/show-my-ip.js   (ama: npm run my-ip)
 */
const https = require('https');
const url = 'https://api.ipify.org';

https.get(url, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    const ip = (data && data.trim()) || '?';
    console.log('');
    console.log('  IP-kaaga (public) waa:  ' + ip);
    console.log('');
    console.log('  Ku dar server-ka (pg_hba.conf) line-kan:');
    console.log('  host    all    all    ' + ip + '/32    scram-sha-256');
    console.log('');
  });
}).on('error', () => {
  console.log('  Lama helin IP. Browser: https://whatismyip.com');
});

/**
 * server.js - Express server-ka backend-ka
 * 
 * SIDEE UU U SHAQEEYO:
 * 1. Express server-ka wuxuu sameeyaa REST API endpoints (/api/all, /api/data, /api/stream)
 * 2. Wuxuu isticmaalayaa middleware-ka (helmet, cors, compression, bodyParser)
 * 3. Wuxuu u wacaa dynamicController-ka si uu u fuliyo PostgreSQL stored procedures
 * 
 * TALLAABO:
 * - Step 1: require() → soo deji dependencies (express, cors, helmet, compression, bodyParser, dotenv)
 * - Step 2: require() → soo deji dynamicController (handleDynamicRequest, handleDataRequest, handleStreamRequest)
 * - Step 3: express() → abuur Express app instance
 * - Step 4: app.use() → ku dar middleware-ka (compression, helmet, cors, bodyParser, logger)
 * - Step 5: app.post() → abuur API endpoints (/api/all, /api/data, /api/stream)
 * - Step 6: app.get() → abuur health check endpoint (/health)
 * - Step 7: app.listen() → billow server-ka port-ka (3000)
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Load .env: backend/.env ama backend/config/.env (labadaba la akhriyo)
const envBackend = path.resolve(__dirname, '..', '.env');
const envConfig = path.resolve(__dirname, '.env');
if (fs.existsSync(envBackend)) require('dotenv').config({ path: envBackend });
if (fs.existsSync(envConfig)) require('dotenv').config({ path: envConfig });

// Step 2: Soo deji dynamicController iyo api config
const dynamicController = require('./dynamicController');
const api = require('./api');
const moduleHelp = require('./moduleHelpController');
const studentImage = require('./studentImageController');
const { requireAuth } = require('./auth');

// Step 3: Abuur Express app instance
const app = express();

// Step 4a: Ku dar compression middleware (Gzip compression) – response-ka wuxuu noqon karaa yar
app.use(compression());

// Step 4b: Xisaabi PORT-ka (.env: PORT=3030; haddii ma jiro -> 3000)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Step 4c: Ku dar helmet middleware (Security headers) – ilaali XSS, clickjacking, iwm
// crossOriginResourcePolicy='cross-origin' → ogolow in /uploads ka la arko frontend origin kale
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Step 4d: CORS – allow frontend at localhost:5173 to call backend at 192.x.x.x:3030
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://172.20.0.20',
  'http://172.20.0.20/',
  'http://192.145.173.81',
  'http://192.145.173.81:5173',
];
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : [];
const originList = corsOrigins.length > 0 ? corsOrigins : defaultOrigins;
app.use(cors({
  origin: originList,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));

// Step 4e: Ku dar bodyParser middleware (Parse urlencoded and JSON)
// Muhiim: Frontend-ka wuxuu soo gudbinayaa form data (urlencoded) ama JSON
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// Step 4e2: Cookie parser — req.cookies.session ayuu daah-furayaa JWT-ga.
// (PR 1: cookie-ga waa la abuurayaa marka login dhaco, laakiin endpoint-yadu
// weli ma uusan xaqiijinin — enforcement-ku PR 2 ayuu ku jiraa.)
app.use(cookieParser());

// Step 4f: Ku dar logger middleware (Simple request logger)
// TALLAABO: Muuji method + URL marka request-ka soo dhaco
app.use((req, res, next) => {
    console.log(`[LOG] ${req.method} ${req.url}`);
    next(); // U gudbi request-ka endpoint-ka
});

// Step 4g: Test database connection (development only – disabled in production for security)
function handleDbCheck(req, res) {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    const db = require('./db');
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    db.query('SELECT 1')
        .then(() => res.json({ success: true, message: 'DB connected', db: `${host}:${port}` }))
        .catch((err) => {
            const msg = err.message || '';
            const hint = /ECONNREFUSED|ETIMEDOUT/.test(msg)
                ? ` Ensure PostgreSQL on ${host} allows remote connections: port ${port} open, pg_hba.conf allows your IP.`
                : '';
            res.status(500).json({
                success: false,
                message: 'Database connection failed',
                error: msg + hint,
                db: `${host}:${port}`,
            });
        });
}
app.get('/api/db-check', handleDbCheck);
app.post('/api/test-db', handleDbCheck);

// Step 5: Abuur API endpoints
// Step 5a: /api/all and /all (when proxy strips /api, e.g. http://172.20.0.20/api)
app.post('/api/all', requireAuth, dynamicController.handleDynamicRequest);
app.post('/all', requireAuth, dynamicController.handleDynamicRequest);

// Generic bulk transaction runner — accepts a steps array, runs in one transaction.
const bulkController = require('./bulkController');
app.post('/api/bulk', requireAuth, bulkController.handleBulk);

// Step 6: Health check – JSON so clients can parse (works when proxy strips /api)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Nidaamku wuu shaqaynayaa (System operational)' });
});

// Step 6b: Barbaariye API routes (from api config)
api.registerApiRoutes(app);
moduleHelp.registerModuleHelpRoutes(app);
studentImage.register(app);

// 404 – return JSON so frontend can parse (avoid "Cannot POST /data" plain text)
app.use((req, res) => {
  res.status(404).set('Content-Type', 'application/json');
  res.send(JSON.stringify({ error: 'Not found', path: req.path, method: req.method }));
});

// Step 7: Billow server-ka port-ka (3000)
// TALLAABO: app.listen() → billow server-ka + muuji fariin
// 0.0.0.0 = dhageysto dhamaan IP-yada (si PC-yada kale ee network-ka ugu wacaan)
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server-ku wuxuu ku socdaa port-ka ${PORT} (process.env.PORT = ${process.env.PORT || 'undefined'})`);
    console.log(`Habka Ku-dayashada ee Legacy: WAA DIYAAR`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\nPort ${PORT} waa la isticmaalayaa (address already in use).`);
        console.error('Xal 1: Ka dami process-ka isticmaala port-kan, ka dibna dib u bilow.');
        console.error('  Linux:');
        console.error(`    lsof -ti :${PORT} | xargs kill -9`);
        console.error(`    # ama: sudo kill -9 $(lsof -t -i:${PORT})`);
        console.error('  Windows (PowerShell):');
        console.error(`    Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
        console.error('Xal 2: Isticmaal port kale: .env ku qor PORT=5000 (ka dib vite.config.js target u beddel port-ka cusub).\n');
    } else {
        console.error(err);
    }
    process.exit(1);
});

module.exports = app;

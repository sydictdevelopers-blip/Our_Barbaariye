# Backend – local + DB online (192) checklist

## Setup summary

- **Local:** Backend runs on your PC (port 3000). Frontend uses Vite proxy `/api` → `http://127.0.0.1:3000`.
- **DB online:** PostgreSQL on 192.145.173.81 (Webmin). Backend on your PC connects to it via `.env` (DB_HOST=192.145.173.81).

---

## 1. Run backend locally (your PC)

```bash
cd backend
npm install
# .env: PORT=3000, DB_HOST=192.145.173.81, DB_NAME=..., DB_USER=..., DB_PASSWORD=...
npm start
```

You should see: `Server-ku wuxuu ku socdaa port-ka 3000`.

---

## 2. Check DB connection

- **Browser or Postman:** `GET http://localhost:3000/api/db-check`
- If **success:** `{ "success": true, "message": "DB connected", "db": "192.145.173.81:5432" }`
- If **ECONNREFUSED:** DB server (192) is not accepting connections from your PC. Do step 3 on the **192 server**.

---

## 3. On the 192 server (so your PC can connect to PostgreSQL)

PostgreSQL must accept remote connections:

**A) postgresql.conf**  
- Set `listen_addresses = '*'` (or `'0.0.0.0'`), then restart PostgreSQL.

**B) pg_hba.conf**  
- Add a line for your PC’s IP, e.g.  
  `host  all  all  YOUR_PC_IP/32  scram-sha-256`  
  Then restart PostgreSQL.

**C) Firewall**  
- Allow port **5432** from your IP, e.g.  
  `sudo ufw allow from YOUR_PC_IP to any port 5432`  
  then `sudo ufw reload`.

---

## 4. Port 3000 already in use?

**Windows (PowerShell):**
```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Or use another port:** In `.env` set `PORT=5000`, and in project root `vite.config.js` set proxy target to `http://127.0.0.1:5000`.

---

## 5. Test API (Postman or curl)

- **Health:** `GET http://localhost:3000/health` or `GET http://localhost:3000/api/health`
- **DB check:** `GET http://localhost:3000/api/db-check`
- **Data:** `POST http://localhost:3000/api/data`  
  Body (raw JSON): `{"queryName":"accounts","page":1,"limit":10}`

Use **query names** from `queries.js` (e.g. `level_type`, `accounts`), not raw SQL.

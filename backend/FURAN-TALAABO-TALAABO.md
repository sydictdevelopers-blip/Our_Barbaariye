# Sida loo furo PostgreSQL server-ka 192 (step by step)

**Ujeedada:** Si backend-kaaga (PC) ugu xiriirto database-ka 192.145.173.81:5432.

**Halka la sameeyo:** Dhammaan talaabooyinkan waa **server-ka 192** (SSH ama Webmin terminal).

---

## Tallaabo 1: Ka hel IP-ka PC-kaaga

**PC-kaaga (Windows):**
1. Fur **Command Prompt** ama **PowerShell**.
2. Qor: `ipconfig`
3. Ka eeg **IPv4 Address** – tusaale: `41.59.100.50`. Tani waa **IP-kaaga** (waxaad ku beddeli doontaa `YOUR_PC_IP` talaabooyinka soo socda).

**Ama:** Browser-ka tag https://whatismyip.com – waxaa ku qoran IP-kaaga.

**Xusuus:** Qor IP-kaaga (tusaale 41.59.100.50) – waxaan u isticmaali doonaa talaabooyinka.

---

## Tallaabo 2: PostgreSQL inuu maqlo “remote”

1. **Server-ka 192** ku SSH garee ama Webmin ka fur **Terminal** / **File Manager**.
2. **Ka hel** faylka `postgresql.conf`:
   - Linux: sida `/etc/postgresql/14/main/postgresql.conf` (14 beddel version-ka)
   - Tusaale: `sudo find / -name postgresql.conf 2>/dev/null`
3. **Fur** faylka (tusaale: `sudo nano /etc/postgresql/14/main/postgresql.conf`).
4. **Ka raadi** erayga: `listen_addresses`
5. **Beddal:**
   - Haddii ay tidhaahdo: `listen_addresses = 'localhost'`
   - U beddel: `listen_addresses = '*'`
6. **Kaydi** (nano: Ctrl+O, Enter, ka dib Ctrl+X).
7. **Dib u bilow** PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```
   (Ama: `sudo service postgresql restart`)

---

## Tallaabo 3: Ogolaanshaha IP-kaaga (pg_hba.conf)

1. **Ka hel** faylka `pg_hba.conf` (isla folder-ka postgresql.conf ama `data/`).
   - Tusaale: `/etc/postgresql/14/main/pg_hba.conf`
2. **Fur** faylka: `sudo nano /etc/postgresql/14/main/pg_hba.conf`
3. **Ku dar** (dhinaca hoose ee faylka) line-kan; **YOUR_PC_IP** beddel IP-kaaga (Tallaabo 1):
   ```
   host    all    all    YOUR_PC_IP/32    scram-sha-256
   ```
   Tusaale haddii IP-kaagu yahay 41.59.100.50:
   ```
   host    all    all    41.59.100.50/32    scram-sha-256
   ```
4. **Kaydi** faylka.
5. **Dib u bilow** PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

---

## Tallaabo 4: Firewall – port 5432 furan

**Server-ka 192** (Linux):

**Haddii aad isticmaasho ufw:**
```bash
sudo ufw allow from YOUR_PC_IP to any port 5432
sudo ufw reload
sudo ufw status
```
(YOUR_PC_IP beddel IP-kaaga, tusaale 41.59.100.50.)

**Haddii aad isticmaasho firewalld:**
```bash
sudo firewall-cmd --add-rich-rule='rule family="ipv4" source address="YOUR_PC_IP" port port="5432" protocol="tcp" accept' --permanent
sudo firewall-cmd --reload
```

**Windows server:** Windows Firewall → Inbound Rule → New Rule → Port → TCP 5432 → Allow.

---

## Tallaabo 5: Tijaabo (PC-kaaga)

1. **Backend-ka** ka socda PC-kaaga: `cd backend` → `npm start`.
2. **Postman** fur, samee **GET** request:
   - URL: `http://localhost:3000/api/db-check`
3. **Send**.
4. **Haddii wanaagsan:** waxaad arki doontaa:
   ```json
   { "success": true, "message": "DB connected", "db": "192.145.173.81:5432" }
   ```
5. **Haddii weli ECONNREFUSED:** dib u eeg 192: firewall, pg_hba.conf (IP sax ma uu?), postgresql.conf, oo PostgreSQL dib u bilow.

---

## Soo koobida (checklist)

| # | Waxa la sameeyo | Halka |
|---|------------------|--------|
| 1 | Ka qor IP-ka PC-kaaga | PC-kaaga (ipconfig ama whatismyip.com) |
| 2 | postgresql.conf: `listen_addresses = '*'` | Server 192 |
| 3 | Dib u bilow PostgreSQL | Server 192 |
| 4 | pg_hba.conf: ku dar `host all all YOUR_IP/32 scram-sha-256` | Server 192 |
| 5 | Dib u bilow PostgreSQL | Server 192 |
| 6 | Firewall: port 5432 furan ka IP-kaaga | Server 192 |
| 7 | Postman: GET localhost:3000/api/db-check | PC-kaaga |

Haddii aad 192 uga maqan tahay, faylkan gudbi qofka maamulaya server-ka.

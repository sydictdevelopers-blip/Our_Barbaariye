# Allow remote PostgreSQL access (192.145.173.81)

Your app gets: **connect ECONNREFUSED 192.145.173.81:5432**

That means PostgreSQL on **192.145.173.81** is not accepting connections from your PC. Do the following **on the 192 server** (SSH or Webmin/terminal).

---

## Step 1: PostgreSQL must listen on all interfaces

**File:** `postgresql.conf`  
(Location: often `/etc/postgresql/14/main/postgresql.conf` or similar; on Windows: `data/postgresql.conf`.)

Find:
```ini
listen_addresses = 'localhost'
```

Change to:
```ini
listen_addresses = '*'
```

Save, then **restart PostgreSQL**:
- Linux: `sudo systemctl restart postgresql` (or `sudo service postgresql restart`)
- Windows: Restart the PostgreSQL service from Services.

---

## Step 2: Allow your PC’s IP in pg_hba.conf

**File:** `pg_hba.conf`  
(Same folder as `postgresql.conf`, or in the data directory.)

Add a line so your PC can connect. Replace `YOUR_PC_IP` with your real IP (e.g. from https://whatismyip.com or `ipconfig` on your PC):

```
# Allow remote from your PC (replace YOUR_PC_IP with your actual IP)
host    all    all    YOUR_PC_IP/32    scram-sha-256
```

Example if your IP is 41.59.100.50:
```
host    all    all    41.59.100.50/32    scram-sha-256
```

To allow a whole network (e.g. 41.59.100.0–255):
```
host    all    all    41.59.100.0/24    scram-sha-256
```

Save, then **restart PostgreSQL** again.

---

## Step 3: Open port 5432 in the firewall (on 192)

**Linux (ufw):**
```bash
# Allow from your IP only (replace YOUR_PC_IP)
sudo ufw allow from YOUR_PC_IP to any port 5432
sudo ufw reload
sudo ufw status
```

**Linux (firewalld):**
```bash
sudo firewall-cmd --add-rich-rule='rule family="ipv4" source address="YOUR_PC_IP" port port="5432" protocol="tcp" accept' --permanent
sudo firewall-cmd --reload
```

**Windows:** In Windows Firewall, add an inbound rule for port **5432** TCP, and allow your PC’s IP or subnet.

**Cloud (AWS / Azure / etc.):** In the security group / firewall, add an inbound rule: port **5432**, source = your IP or your office network.

---

## Step 4: Test from your PC

After saving and restarting:

1. **Postman:** `GET http://localhost:3000/api/db-check`  
   You should see: `"success": true, "message": "DB connected"`.

2. **Postman:** `POST http://localhost:3000/api/data` with body:
   ```json
   { "queryName": "level_type", "page": 1, "limit": 10 }
   ```
   You should get `columns` and `data` instead of an error.

---

## Quick checklist (on 192)

- [ ] `postgresql.conf`: `listen_addresses = '*'`
- [ ] `pg_hba.conf`: line with your PC IP and `scram-sha-256`
- [ ] PostgreSQL restarted after both changes
- [ ] Firewall allows port 5432 from your IP
- [ ] Test from your PC: `/api/db-check` returns success

If you don’t have access to 192, send this file to the server or network admin.

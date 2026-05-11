# HRM Module — Note iyo Documentation

**Taariikh la dhammaystiray:** 2026-05-10
**Database target:** `new_barbaariye` (localhost:5432, user `postgres`)

---

## 1. Database — Migrations

Faylasha:
- `hrm_migration.sql` — Migration weyn (idempotent, dib-loo-orori karo)
- `fix_schedule_sp.sql` — Saxitaan gaar ah ee `employee_schedule_sp` legacy bug

Habka ku-shaqeynta migration:
```bash
$env:PGPASSWORD="3335"
psql -U postgres -h localhost -d new_barbaariye -v ON_ERROR_STOP=1 -f backend/sql/hrm_migration.sql
```

### Schema additions
- `employee.salary_type` VARCHAR(50)
- `employee_vocation.end_date` DATE
- `teacher_state` (ts_id, emp_id FK, state, reg_date, u_br_id)
- `day` table waxa loogu shubay 7 maalmood (Saturday → Friday)

### Stored Procedures

| SP | Args | Returns | Doorka |
|----|------|---------|--------|
| `employee_show(p_branch_id)` | int | TABLE | List employees per branch (la saxay column type bug) |
| `employee_edit_show(p_emp_id)` | int | TABLE | Single-row fetch ee edit modal |
| `employee_sp(...)` | 17 args + oper | result varchar | Single canonical overload — people + employee atomic CRUD. Legacy 14-arg variant was dropped to avoid ambiguity. |
| `job_sp(j_id, j_name, oper)` | 3 args | result varchar | CRUD job + duplicate-check |
| `teacher_state_sp(...)` | 5 args | result varchar | CRUD teacher state |
| `teacher_state_show(p_branch_id)` | int | TABLE | List per branch |
| `employee_schedule_sp(...)` | 11 args | text | CRUD jadwalka (legacy bug: `employee_schedule` → `employee_scheduale`) |
| `employee_schedule_show(p_emp_id)` | int | TABLE + total_hours | List per employee, weekday-ordered |
| `employee_vocation_sp(...)` | 8 args (start_date + end_date) | result varchar | CRUD vocations |
| `employee_vocation_show(p_emp_id)` | int | TABLE + info | List + auto-formatted info string |
| `job_options_show(search, limit, offset)` | 3 args | TABLE + total_count | Dropdown options |
| `shift_options_show(...)` | 3 args | TABLE + total_count | Dropdown options |
| `day_options_show(...)` | 3 args | TABLE (Sat→Fri ordered) | Dropdown options |

---

## 2. Backend — Express

### Files isbedelay / cusub
| File | Isbedelka |
|------|-----------|
| `backend/config/queries/hrm.js` | **CUSUB** — Whitelist queries: Employees, EmployeeEdit, Jobs, TeacherStates, EmployeeSchedules, EmployeeVocations + dropdowns |
| `backend/config/queries.js` | hrm-ka loo wado dispatcher-ka (line 25 + 35) |
| `backend/config/dynamicController.js` | `PROCEDURE_PARAM_ORDER` lagu daray 5 SP cusub |
| `backend/config/api.js` | Switch-branch case-sensitivity bug saxay (`LOWER(x) = 'Active'` → `'active'`) |
| `backend/.env` | DB_USER=`postgres` / DB_PASSWORD=`3335` / DB_NAME=`new_barbaariye` |

### CSP entry tuse (waafaqaya 19-arg signature-ka SP-ka):
```js
employee_sp: [
  'emp_id_sp', 'name_sp', 'tell_sp', 'sex_sp', 'email_sp', 'add_id_sp',
  'sh_id_sp', 'j_id_sp', 'tt_id_sp', 'emp_type_sp', 'salary_type_sp',
  'salary_sp', 'degree_sp', 'br_id_sp', 'cv_sp', 'image_sp',
  'hired_date_sp', 'u_br_id_sp', 'oper',
],
```

### Insert flow (saxitaanka muhiimka ah)
- `INSERT INTO people (...) RETURNING p_id INTO last_p_id;` — captures the new
  person id in the same transaction.
- `INSERT INTO employee (..., p_id, ...) VALUES (..., last_p_id, ...);` — uses
  the captured id, no race conditions.
- `tt_id` (title) resolves: explicit param → lookup by emp_type → default 1.
- Messages come from `alerts` table; literal fallback if a row is missing.

`br_id_sp` / `u_br_id_sp` waxaa server-ku si toos ah uga buuxiyaa JWT-ka (uma baahno cilent-ka inuu diro).

---

## 3. Frontend — React + Vite

### Menu (menuConfig.jsx)
HRM (parent, UserCog icon) →
- **Employee** (`/EmployeeOffice`) — 3 tabs: Employee · Jobs · Teacher State
- **Employee Schedule** (`/EmployeeSchedule`)
- **Employee Vocation** (`/EmployeeVocation`)

### Pages (`src/utility/pages/hrmFolder/`)
| File | Doorka |
|------|--------|
| `EmployeeOfficeTabs.jsx` | 3 tabs (Employee/Jobs/TeacherStates) — EntityTab pattern + CrudModal |
| `EmployeeSchedulePage.jsx` | Multi-row schedule form + transactional bulk insert (runBulk) |
| `EmployeeVocationPage.jsx` | Employee picker + CRUD with confirmation alerts |

### Design
Dhammaan saddexda HRM page waxay isticmaalaan **isku design**:
- Card wrapper (rounded-2xl, soft border, shadow)
- 3px gradient strip (`#0B3C5D → #0D9488`)
- Tabs-component header (gradient teal/blue)
- Action toolbar (employee select + Show Data + Add new)
- DataTableCard (search, sort, pagination)

### CRUD Configs (crudConfig.jsx)
- `Employees` — 12 fields (name, phone, email, sex, address, type, job, degree, shift, salary type, salary, hired date) + `image-upload` field. Submits to `employee_sp` (17-arg overload).
- `Jobs` — 1 field (j_name)
- `TeacherStates` — employee select + state (Active/Inactive/Suspended/OnLeave)
- `EmployeeVocations` — employee + start_date + end_date + type + description

### Routes (App.jsx)
```jsx
<Route path="/EmployeeOffice"   element={<EmployeeOfficeTabs />} />
<Route path="/EmployeeSchedule" element={<EmployeeSchedulePage />} />
<Route path="/EmployeeVocation" element={<EmployeeVocationPage />} />
```

---

## 4. i18n — Saddex luuqadood (SO / EN / AR)

[`src/i18n/i18n.js`](../../src/i18n/i18n.js) waxa lagu daray luuqad walba:

- **menu:** `hrm`, `employeeOffice`, `employeeSchedule`, `employeeVocation`
- **tabs:** `employees`, `jobs`, `teacherStates`
- **action:** `cancel`, `delete`, `toggleState`
- **tableHeaders:** `j_name`, `salary_type`, `degree`, `hired_date`, `emp_type`, `address`, `info`, `total_hours`, `time_in`, `time_out`, `day_name`
- **dbValues:** maalmaha (Saturday→Sabti/السبت), shifts, salary types, employee types, vocation types, teacher states
- **hrm.* namespace dhan** (employees / jobs / teacherStates / vocations / schedule + nested fields/ph/cols/opts)
- Arabic-ka oo RTL si toos ah u shaqeeya

---

## 5. End-to-end Tests (psql)

Dhammaan SPs waxaa la tijaabiyay si dhamaystiran:

| Test | Result |
|------|--------|
| Employees: insert (people+employee), show, delete | ✓ |
| Jobs: insert, update, delete + duplicate-check | ✓ |
| TeacherStates: insert + show | ✓ |
| Vocations: insert (start+end), show with formatted info | ✓ |
| Schedule: insert, show with computed `total_hours` (e.g. "05 HOURS 00 MINUTES") | ✓ |
| Dropdowns: job_options / shift_options / day_options (Sat→Fri ordered) | ✓ |

---

## 6. Tilmaamo isticmaalka

### Si aad u aragto HRM menu (mar walba marka cusub la sameeyo):
1. Furow `/user-privilege`
2. Calaamadi `HRM` iyo saddexda children + tabs + actions
3. Save → re-login (privalage waxay JWT-ka ku jirta — ma cusboonaysaan ilaa cookie cusub)
4. Sidebar-ka HRM hadda waa muuqdaa

### Si aad u baddesho luuqada:
- Navbar → Globe icon → Dooro EN / SO / AR
- Arabic = RTL toos ah (HTML `dir` attribute waa la cusbooneysiiyaa)

---

## 7. Bug-yada la helay oo la saxay intii hawsha la qabanayey

1. **PostgreSQL `syd` user wuxuu lahaa password qaldan** — la beddelay `postgres`/3335 + DB la beddelay `BarbaariyeDemo_v_10` → `new_barbaariye`
2. **Switch-branch SQL** `LOWER(x) = 'Active'` had iyo jeer false (case mismatch) — la saxay
3. **`makeOptionLoader`** wuxuu rabaa `valueKey/labelKey/sortByActiveState` — qaybaha hore waxaan ku qoray `sortKey` (qalad)
4. **`image_sp`** field ahaa hidden — la beddelay `type: 'image-upload'` si file upload uga shaqeeyo (S3)
5. **Legacy `employee_schedule_sp`** wuxuu ku tilmaamayey table aan jirin `employee_schedule` — la saxay si uu u isticmaalo `employee_scheduale`
6. **`day_options_show`** order qaldan (Saturday=8, Monday=9, Sunday=10...) — la saxay si CASE-based weekday ordering ah
7. **swal i18n keys** qaldan — `swal.success.X` → `swal.texts.X`, `swal.titles.warn` → `swal.titles.warning`
8. **`employee_show`** — column type mismatch (TEXT vs VARCHAR) — la saxay si CONCAT()::VARCHAR ah
9. **`employee_vocation_sp`** signature qaldan — la cusbooneysiiyay si uu u qaato start_date + end_date
10. **`employee_vocation_show`** — la dib u qoray si uu u soo celiyo `info` column auto-formatted ah

---

## 8. Faylasha muhiimka ah

```
backend/
├── sql/
│   ├── hrm_migration.sql        # Migration weyn (idempotent)
│   ├── fix_schedule_sp.sql      # Schedule SP fix (gaar)
│   └── HRM_NOTES.md             # Note tani
├── config/
│   ├── queries/hrm.js           # Backend queries (cusub)
│   ├── queries.js               # Wired into dispatcher
│   ├── dynamicController.js     # PROCEDURE_PARAM_ORDER updated
│   └── api.js                   # switch-branch fixed
└── .env                         # DB credentials updated

src/
├── config/
│   ├── menuConfig.jsx           # HRM menu added
│   └── crudConfig.jsx           # 4 entity configs added
├── utility/pages/hrmFolder/     # 3 pages cusub
│   ├── EmployeeOfficeTabs.jsx
│   ├── EmployeeSchedulePage.jsx
│   └── EmployeeVocationPage.jsx
├── i18n/i18n.js                 # SO/EN/AR keys for HRM
└── App.jsx                      # Routes registered
```

---

## 9. Mustaqbalka — Wax laga yaabo in la cusbooneysiiyo

- File-upload field-ka image_sp uma test-arin si dhab ah (S3 wuxuu u baahan yahay AWS keys ee `.env`-ka — kuwaas way jiraan laakin shaqada upload-ka khariga laga ma tijaabin)
- Schedule form-ka in la dhameystiro feature ah "Apply same schedule to multiple employees" haddii loo baahdo
- Total hours sum row (Sum: 25 HOURS 0 MINUTES) waxay ku jirtaa screenshot-ka legacy laakin EmployeeSchedulePage-ka cusub kuma jirin — laga yaabaa in lagu daro mar dambe haddii loo baahdo
- "On Leave" state ee teacher_state-ka iyo `teacher_state_show` waxay nooga turjumeen `'OnLeave'` (one-word) iyo `'On Leave'` (two-words) — labadu way shaqeeyaan laakin codka ka eege

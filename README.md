# Attendance & Grading Multi-App Tool (PostgreSQL + React + Vite)

A modern, responsive multi-application tool built with **React**, **Vite**, **TailwindCSS**, backed by a robust **PostgreSQL** database and modular **Express** backend.

---

## 🚀 Features & Multi-App Workflow

1. **Section Selection**:
   - Choose a Year Level (e.g., 1st Year, 2nd Year, etc.).
   - Click on any configured Section.
   - Section names must start with `1`, `2`, `3`, or `4` for 1st, 2nd, 3rd, or 4th Year respectively.
   - Deleting a year level or its last reference to a section archives its students, attendance, grades, grading settings, and schedule for 30 days. Restore archived sections from **Settings → Deleted Sections** before the archive expires.
2. **Tool Selection Modal**:
   - Once a section is selected, choose between:
     - 📅 **Attendance System**: Track daily classroom attendance, mark absences, view holiday schedules, and export attendance spreadsheets.
     - 📊 **Grading System**: MS Excel-like layout with Main Grade Sheet and Grade Input Ground with auto-transmutation formulas and Excel export.

---

## 📊 Grading System Specifications

### Sheets & Layout
- **Sheet 1: Main Grade Sheet**
  - **Major Exam (40%)**: MET (Total score), MER (Transmuted Rating), MEP (Percentage `MER * 40%`)
  - **Quiz (25%)**: QT (Total score), QR (Transmuted Rating), QP (Percentage `QR * 25%`)
  - **Recitation (25%)**: RT (Total score), RR (Transmuted Rating), RP (Percentage `RR * 25%`)
  - **Deportment (5%)**: DR (Deportment Rating `90 - deductions`), DP (Percentage `DR * 5%`)
  - **Attendance (5%)**: AT (Days present), AR (Transmuted Rating), AP (Percentage `AR * 5%`)
  - **CS (60%)**: Class Standing (`QP + RP + DP + AP`)
  - **GRADE**: Final Grade (`MEP + CS`, or `"AW"`/`"UW"`)
- **Sheet 2: Grade Input Ground (`CS Mid` / `CS Fin`)**
  - Input scores for **PE**, **ME**, **+**, **–** -> auto-sums **MET**
  - Input scores for **Quizzes / Lab Activities** (HQ1, HQ2, LA1, LA2...) -> auto-sums **LAT / QT**
  - Dynamic button to add custom Quiz/Activity columns.
  - Automatically syncs student names and attendance data with the Attendance system.
- **Roster Import**: Supports both bulk paste (one student per line) and `.csv` / `.xlsx` file uploads.
- **Export to Excel**: Generates `.xlsx` files with formatted tables matching the spreadsheet design.

### Exact Calculation Formulas
- **MER**: `=IF(AND($B7 <> "", AND($N7 <> "AW", $N7 <> "UW")), IF(C7 <> "", ROUND(C7 /C$5 * (U$11 - V$11) + V$11, 0), ""), "")`
- **QR / ARR**: `=IF(AND($B7 <> "", AND($N7 <> "AW", $N7 <> "UW")), IF(F7 <> "", ROUND(F7 /F$5 * (X$11 - Y$11) + Y$11, 0), ""), "")`
- **RR**: `=IF(AND($B7 <> "", AND($N7 <> "AW", $N7 <> "UW")), IF(I7 <> "", ROUND(I7 /I$5 * ($U$18 - $V$18) + $V$18, 0), ""), "")`
- **DR**: `=IF(N7 <> "", IF(OR(N7 = "AW", N7 = "UW"), "", 90 - (IF(N$5 <= 5, (N$5 - N7) * 4, (IF(N$5 <= 10, (N$5 - N7) * 2.5, (N$5 - N7) * 1.5))))), "")`
- **AR**: `=IF(N7 <> "", IF(OR(N7 = "AW", N7 = "UW"), "", ROUND(N7 / N$5 * (U$6 - V$6) + V$6, 2)), "")`
- **MEP**: `ROUND(MER * 40%, 2)`
- **QP**: `ROUND(QR * 25%, 2)`
- **RP**: `ROUND(RR * 25%, 2)`
- **DP**: `ROUND(DR * 5%, 2)`
- **AP**: `ROUND(AR * 5%, 2)`
- **CS 60%**: `QP + RP + DP + AP`
- **Final Grade**: `IF(remarks IN ('AW','UW'), remarks, ROUND(MEP + CS, 2))`

---

## 🏗️ Architecture & Backend Structure

```
server/
├── config/
│   └── db.js            # PostgreSQL connection pool & health checks
├── controllers/
│   ├── configController.js      # App title, term dates, sections & schedules
│   ├── adminController.js       # Teacher accounts and access-key lifecycle
│   ├── studentController.js     # Student roster management (CRUD & bulk import)
│   ├── attendanceController.js  # Attendance status tracking and toggle operations
│   ├── gradeController.js       # Grade scores, column specs & configurations
│   ├── holidayController.js     # Custom holiday management
│   └── systemController.js      # System health and guarded data reset
├── db/
│   ├── schema.sql       # Idempotent baseline schema
│   ├── migrations/      # Versioned database changes
│   ├── initDb.js        # Baseline schema and migrations
│   ├── backupDb.js      # Manual pg_dump backup
│   ├── restoreDb.js     # Confirmed pg_restore
│   └── resetDb.js       # Guarded application-data reset
├── middleware/
│   ├── errorHandler.js  # Centralized error handling
│   └── requireAuth.js   # Session and administrator authorization
├── routes/
│   ├── configRoutes.js
│   ├── studentRoutes.js
│   ├── attendanceRoutes.js
│   ├── gradeRoutes.js
│   ├── holidayRoutes.js
│   ├── systemRoutes.js
│   └── index.js         # Central router mounting all `/api` endpoints
└── index.js             # Express application entry point (Port 5000)
```

---

## 🗄️ PostgreSQL Database Schema (`attendance_db`)

- **`app_config`**: Application title, term dates, sections, and class schedules.
- **`students`**: Student roster per section (`id`, `section_id`, `name`, `created_at`).
- **`attendance`**: Daily attendance records (`section_id`, `student_id`, `date`, `status`).
- **`grade_configs`**: Grading weights, transmutation ratings, and quiz column definitions per section & term.
- **`grades`**: Student raw scores (PE, ME, +, –, quizzes, RT, AT override, remarks) per section & term.
- **`section_archives`**: Deleted section data retained for 30 days and available for restoration.
- **`holidays`**: Custom school and local holidays, private to each workspace.
- **`auth_sessions`** and **`auth_login_attempts`**: Server-side login sessions and throttling state.
- **`app_users`**: Administrator and teacher identities, hashed access keys, and workspace ownership.
- **`account_security_events`**: Account creation, activation, and key-rotation events only; teacher activity is not logged.
- **`schema_migrations`**: Applied SQL migration versions.

Every teacher and the administrator have separate private records and settings. Attendance and grade rows are constrained to both the owning workspace and the section of their student. The API also validates dates, supported terms, score values, grading weights, maxima, and quiz definitions before saving.

---

## 🚀 Available Scripts

| Command | Description |
|---|---|
| **`start.bat`** | **One-command launcher** on Windows (double-click in Explorer or run in terminal) |
| **`npm start`** or **`npm run dev`** | Concurrently runs both the **PostgreSQL API Server** and **Vite Frontend** |
| **`npm run server`** | Runs only the Express API Server (`http://localhost:5000`) |
| **`npm run client`** | Runs only the Vite dev server (`http://localhost:5173` or `5174`) |
| **`npm run build`** | Builds the optimized production bundle |
| **`npm test`** | Runs migration, grading, attendance, import, and section workflow tests |
| **`npm run db:init`** | Initializes database tables |
| **`npm run db:backup`** | Manually creates a custom-format PostgreSQL dump in `BACKUP_DIR` (default: `backups`) |
| **`npm run db:restore -- --file <dump>`** | Manually restores a dump after typing the exact target database name |
| **`npm run db:reset`** | Resets application data only after `ALLOW_DATABASE_RESET=true` and exact-name confirmation |

### Database operations and backups

The server applies numbered migrations before the tenant-aware baseline schema when upgrading an existing database; this ensures workspace columns exist before the new schema indexes are created. A fresh database receives the baseline first. Database connection credentials must come from the environment or `.env`; there is no built-in database password.

Backups are manual only. Install the PostgreSQL client utilities (`pg_dump` and `pg_restore`) and ensure they are on `PATH`, then run `npm run db:backup` before upgrades or other risky operations. The dump contains student, attendance, grade, configuration, and authentication data; keep it in access-controlled storage and outside source control. No automatic backup or cleanup job is configured. If the server uses ephemeral disk storage, move the dump to durable storage immediately.

To restore, run `npm run db:restore -- --file "backups/<backup-file>.dump"` and type the exact database name when prompted. Restore replaces matching database objects; confirm the target carefully and take a fresh backup first.

`npm run db:reset` clears application records and settings for every workspace, then logs out all accounts. It retains accounts, access keys, schema, migration history, and account-security events. The authenticated `/api/system/reset-database` endpoint clears only the signed-in account's workspace and leaves other accounts untouched. Both are disabled unless `ALLOW_DATABASE_RESET=true`; the endpoint also requires `confirmDatabaseName` to match the actual database, and the CLI asks for the same confirmation interactively.

## 🔐 Access-key accounts

Sign-in uses an access key only—there is no username or password. Newly generated keys use the same format in local, test, and production environments: one animal name followed by four random digits, such as `dog0122`. Existing five-part animal keys and supported legacy keys remain valid so current accounts can continue signing in. This short format is easy to share but offers limited protection; do not use it to protect sensitive or real student records on a public deployment. Key IDs are shown to the administrator for account management and are not entered at sign-in. The administrator and teachers use the same app features; the administrator's additional abilities are creating teacher accounts, enabling or disabling accounts, issuing or rotating keys, and permanently deleting teacher accounts and their workspaces. Every account's records and settings belong to its own private workspace. The administrator cannot open or inspect teacher workspaces. Sharing a key shares that account and its workspace. Sessions use random, server-side tracked tokens in HttpOnly cookies, expire after 12 hours, and failed login attempts are rate-limited per client IP.

### Local setup

1. Configure the PostgreSQL connection in `.env`, then run `npm run db:init`. On first initialization, the command prints a one-time administrator access key. Save it securely; the full key cannot be viewed again.
2. Keep `VITE_API_URL` empty for local development so the frontend uses Vite's `/api` proxy. The server applies database migrations automatically before accepting requests.
3. Sign in with the administrator key and set up sections. Create teacher accounts from **Teacher access**, then securely share each one-time key with its teacher. Only the key ID is shown in the account list. Disabling an account prevents sign-in but retains its workspace data; rotating a key invalidates the old key and existing sessions.
4. On administrator sign-in, set two different recovery questions and answers. Answers are normalized and stored as salted scrypt hashes; choose answers that cannot be guessed from public information. If the administrator key is forgotten, use **Forgot the administrator key?** on the sign-in page and answer both prompts to rotate the key. Recovery attempts are limited per IP and per administrator account; the old key and all admin sessions are invalidated, and the replacement key is shown once. If recovery was not configured or both answers are lost, back up the database and have an authorized database operator clear the administrator's `access_key_id` and `access_key_hash` together, then run `npm run db:init` to issue a new key.

### Hosted setup

For the Netlify frontend and Render backend, the app proxies `/api` through Netlify so the browser uses the Netlify origin for both the app and its session cookie. This avoids mobile browsers blocking the login cookie as third-party data. The proxy target is configured in `netlify.toml`.

In Netlify, set the build command to `npm run build` and the publish directory to `dist`. Do not set `VITE_API_URL`; the frontend calls `/api` on the same origin, and Netlify forwards those requests to Render. Redeploy the site after changing the build or redirect configuration.

Set these backend environment variables in Render:

- `CLIENT_URL=https://pagms.netlify.app`: the exact hosted frontend origin (no trailing slash or path).
- `NODE_ENV=production`: enables Secure session cookies.
- `TRUST_PROXY_HOPS=1`: configure this only when the API is behind one trusted reverse proxy, such as Render.
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`: use the database provider's connection values; no password fallback is provided.

The Render service must use the same Neon PostgreSQL database for every request. In Render, configure the database connection variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`) from the Neon connection details. Each account signs in with its own key and receives a separate 12-hour session.

If the Render service URL changes, update the `/api/*` redirect target in `netlify.toml` to the new HTTPS origin and redeploy Netlify.

The initial administrator key is issued by running `npm run db:init` against the production database and is printed once. Do not place access keys in source control or public logs.

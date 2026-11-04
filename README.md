# Attendance & Grading Multi-App Tool (PostgreSQL + React + Vite)

A modern, responsive multi-application tool built with **React**, **Vite**, **TailwindCSS**, backed by a robust **PostgreSQL** database and modular **Express** backend.

---

## 🚀 Features & Multi-App Workflow

1. **Section Selection**:
   - Choose a Year Level (e.g., 1st Year, 2nd Year, etc.).
   - Click on any configured Section.
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
│   ├── studentController.js     # Student roster management (CRUD & bulk import)
│   ├── attendanceController.js  # Attendance status tracking and toggle operations
│   ├── gradeController.js       # Grade scores, column specs & configurations
│   ├── holidayController.js     # Custom holiday management
│   └── systemController.js      # System health and complete database reset
├── db/
│   ├── schema.sql       # Relational DDL schema with constraints & indexes
│   ├── initDb.js        # Automatic schema initialization
│   └── resetDb.js       # Complete database wipe and clean re-initialization
├── middleware/
│   ├── errorHandler.js  # Centralized error handling
│   └── requestLogger.js # Colorized API request logging
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
- **`holidays`**: Custom school and local holidays.

---

## 🚀 Available Scripts

| Command | Description |
|---|---|
| **`start.bat`** or **`run.bat`** | **One-command launcher** on Windows (double-click in Explorer or run in terminal) |
| **`npm start`** or **`npm run dev`** | Concurrently runs both the **PostgreSQL API Server** and **Vite Frontend** |
| **`npm run server`** | Runs only the Express API Server (`http://localhost:5000`) |
| **`npm run client`** | Runs only the Vite dev server (`http://localhost:5173` or `5174`) |
| **`npm run build`** | Builds the optimized production bundle |
| **`npm run db:init`** | Initializes database tables |
| **`npm run db:reset`** | **Completely resets** the database, dropping all tables and recreating clean defaults |
| **`npm run auth:hash`** | Creates a salted scrypt hash for the app access password (input is hidden) |

## 🔐 App Access Password

The app requires one shared password before loading its data. The Express API also enforces authentication on every `/api` route, so hiding or changing a frontend URL cannot bypass the gate. Sessions use random, server-side tracked tokens in HttpOnly cookies, expire after 12 hours, and failed login attempts are rate-limited per client IP.

### Local setup

1. Generate a password hash with `npm run auth:hash` and enter the chosen password twice when prompted. Use a long, unique password; hashing does not make a weak password stronger.
2. Put the printed hash in the root `.env` as `AUTH_PASSWORD_HASH=<hash>`. Do not put the plaintext password in `.env`, source code, or a committed file.
3. Keep `VITE_API_URL` empty for local development so the frontend uses Vite's `/api` proxy. The server creates the authentication tables on startup through `server/db/schema.sql`.

### Hosted setup

For the Netlify frontend and Render backend, the app proxies `/api` through Netlify so the browser uses the Netlify origin for both the app and its session cookie. This avoids mobile browsers blocking the login cookie as third-party data. The proxy target is configured in `netlify.toml`.

In Netlify, set the build command to `npm run build` and the publish directory to `dist`. Do not set `VITE_API_URL`; the frontend calls `/api` on the same origin, and Netlify forwards those requests to Render. Redeploy the site after changing the build or redirect configuration.

Set these backend environment variables in Render:

- `AUTH_PASSWORD_HASH`: a scrypt hash generated with `npm run auth:hash` (the hash from local `.env` can also be reused).
- `CLIENT_URL=https://pagms.netlify.app`: the exact hosted frontend origin (no trailing slash or path).
- `NODE_ENV=production`: enables Secure session cookies.
- `TRUST_PROXY_HOPS=1`: configure this only when the API is behind one trusted reverse proxy, such as Render.

The Render service must use the same Neon PostgreSQL database for every request. In Render, configure the database connection variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`) from the Neon connection details. The access key is shared, but each browser signs in separately and receives its own 12-hour session.

If the Render service URL changes, update the `/api/*` redirect target in `netlify.toml` to the new HTTPS origin and redeploy Netlify.

The backend runs `CREATE TABLE IF NOT EXISTS` for the same authentication schema at startup. If applying database changes manually first, execute:

```sql
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
    ip_hash CHAR(64) PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_window_started_at
    ON auth_login_attempts (window_started_at);
```

Never deploy with the short password shared during setup; it is not strong enough for a public app. Choose a long, unique random password before exposing the app.

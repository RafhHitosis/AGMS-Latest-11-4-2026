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

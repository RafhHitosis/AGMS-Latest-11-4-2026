-- ============================================================
-- Attendance & Grading Multi-App - PostgreSQL Database Schema
-- ============================================================

-- Enable pgcrypto / uuid-ossp for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Password-authenticated browser sessions and login throttling
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

-- 1. App Configuration Table (Single-row configuration)
CREATE TABLE IF NOT EXISTS app_config (
    id INT PRIMARY KEY DEFAULT 1,
    app_title TEXT NOT NULL DEFAULT 'Attendance & Grading System',
    app_subtitle TEXT NOT NULL DEFAULT 'Choose a year level and section to manage attendance',
    term_dates JSONB NOT NULL DEFAULT '{}'::jsonb,
    sections JSONB NOT NULL DEFAULT '{}'::jsonb,
    schedules JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_config_row CHECK (id = 1)
);

-- Ensure initial default configuration exists
INSERT INTO app_config (id, app_title, app_subtitle, term_dates, sections, schedules)
VALUES (1, 'Attendance & Grading System', 'Choose a year level and section to manage attendance', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    section_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_section ON students (section_id);
CREATE INDEX IF NOT EXISTS idx_students_section_name ON students (section_id, name);

-- 3. Attendance Table
-- Presence of a record represents 'absent', matching existing workflow
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    section_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date VARCHAR(10) NOT NULL, -- Format: YYYY-MM-DD
    status VARCHAR(20) NOT NULL DEFAULT 'absent',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_section_student_date UNIQUE (section_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_section ON attendance (section_id);
CREATE INDEX IF NOT EXISTS idx_attendance_section_date ON attendance (section_id, date);

-- 4. Custom Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date VARCHAR(10) NOT NULL, -- Format: YYYY-MM-DD
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays (date);

-- 5. Grade Configuration Table (Per section & term specs like weights, transmutation ratings, and items)
CREATE TABLE IF NOT EXISTS grade_configs (
    id SERIAL PRIMARY KEY,
    section_id VARCHAR(50) NOT NULL,
    term VARCHAR(20) NOT NULL DEFAULT 'midterm',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_grade_config_section_term UNIQUE (section_id, term)
);

CREATE INDEX IF NOT EXISTS idx_grade_configs_section_term ON grade_configs (section_id, term);

-- 6. Student Grades / Scores Table
CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    section_id VARCHAR(50) NOT NULL,
    term VARCHAR(20) NOT NULL DEFAULT 'midterm',
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_grades_section_term_student UNIQUE (section_id, term, student_id)
);

CREATE INDEX IF NOT EXISTS idx_grades_section_term ON grades (section_id, term);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades (student_id);

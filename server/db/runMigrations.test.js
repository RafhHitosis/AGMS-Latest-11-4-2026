import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runMigrations } from "./runMigrations.js";

test("applies each numbered migration only once", async () => {
  const appliedVersions = new Set();
  let migrationExecutions = 0;
  let welcomeAcknowledgmentMigrationExecutions = 0;
  let adminRecoveryMigrationExecutions = 0;
  let adminRecoveryRateLimitMigrationExecutions = 0;
  let resumableAssessmentMigrationExecutions = 0;
  let assessmentAcademicTermsMigrationExecutions = 0;
  const client = {
    async query(sql, params = []) {
      if (sql.startsWith("SELECT 1 FROM schema_migrations")) {
        return { rowCount: appliedVersions.has(params[0]) ? 1 : 0 };
      }
      if (sql.startsWith("INSERT INTO schema_migrations")) {
        appliedVersions.add(params[0]);
      }
      if (sql.startsWith("ALTER TABLE app_config")) {
        migrationExecutions += 1;
      }
      if (sql.includes("ADD COLUMN IF NOT EXISTS welcome_acknowledged_at")) {
        welcomeAcknowledgmentMigrationExecutions += 1;
      }
      if (sql.includes("CREATE TABLE IF NOT EXISTS admin_recovery_questions")) {
        adminRecoveryMigrationExecutions += 1;
      }
      if (sql.includes("ADD COLUMN IF NOT EXISTS failed_attempts")) {
        adminRecoveryRateLimitMigrationExecutions += 1;
      }
      if (sql.includes("ADD COLUMN IF NOT EXISTS attempt_token_hash")) {
        resumableAssessmentMigrationExecutions += 1;
      }
      if (sql.includes("DROP CONSTRAINT IF EXISTS assessments_term_check")) {
        assessmentAcademicTermsMigrationExecutions += 1;
      }
      return { rowCount: 0 };
    },
    release() {},
  };
  const databasePool = { connect: async () => client };

  await runMigrations(databasePool);
  await runMigrations(databasePool);

  assert.equal(migrationExecutions, 2);
  assert.equal(welcomeAcknowledgmentMigrationExecutions, 1);
  assert.equal(adminRecoveryMigrationExecutions, 1);
  assert.equal(adminRecoveryRateLimitMigrationExecutions, 1);
  assert.equal(resumableAssessmentMigrationExecutions, 1);
  assert.equal(assessmentAcademicTermsMigrationExecutions, 1);
  assert.deepEqual(
    [...appliedVersions],
    [
      "001_app_config_branding.sql",
      "002_staff_access_and_audit.sql",
      "003_data_integrity.sql",
      "004_access_key_workspaces.sql",
      "005_unique_access_key_hashes.sql",
      "006_welcome_acknowledgment.sql",
      "007_admin_recovery_questions.sql",
      "008_admin_recovery_rate_limit.sql",
      "009_default_app_branding.sql",
      "010_assessment_maker.sql",
      "011_resumable_assessment_attempts.sql",
      "012_assessment_academic_terms.sql",
    ],
  );
});

test("adds the student workspace key before attendance and grade foreign keys", () => {
  const migration = fs.readFileSync(
    new URL("./migrations/004_access_key_workspaces.sql", import.meta.url),
    "utf8",
  );
  const studentKey = migration.indexOf(
    "ADD CONSTRAINT students_workspace_section_id_key UNIQUE",
  );
  const oldStudentKey = migration.indexOf(
    "ALTER TABLE students DROP CONSTRAINT IF EXISTS unique_students_section_id",
  );
  const oldAttendanceForeignKey = migration.indexOf(
    "ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_section_fkey",
  );
  const oldGradesForeignKey = migration.indexOf(
    "ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_student_section_fkey",
  );
  const attendanceForeignKey = migration.indexOf(
    "ADD CONSTRAINT attendance_workspace_section_student_fkey",
  );
  const gradesForeignKey = migration.indexOf(
    "ADD CONSTRAINT grades_workspace_section_student_fkey",
  );

  assert.notEqual(studentKey, -1);
  assert.notEqual(oldStudentKey, -1);
  assert.notEqual(oldAttendanceForeignKey, -1);
  assert.notEqual(oldGradesForeignKey, -1);
  assert.notEqual(attendanceForeignKey, -1);
  assert.notEqual(gradesForeignKey, -1);
  assert.ok(oldAttendanceForeignKey < oldStudentKey);
  assert.ok(oldGradesForeignKey < oldStudentKey);
  assert.ok(studentKey < attendanceForeignKey);
  assert.ok(studentKey < gradesForeignKey);
});

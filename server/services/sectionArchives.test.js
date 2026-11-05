import assert from "node:assert/strict";
import test from "node:test";
import { restoreSectionArchive } from "./sectionArchives.js";

class MockClient {
  constructor({ activeSections = {}, archive } = {}) {
    this.activeSections = activeSections;
    this.archive = archive || {
      id: "archive-id",
      section_id: "101",
      year_level: "1st Year",
      section_data: {
        students: [{ id: "student-id", name: "Student", created_at: "2026-01-01T00:00:00Z" }],
        attendance: [],
        grades: [],
        gradeConfigs: [],
        schedule: [1, 3],
      },
      expires_at: "2026-12-01T00:00:00Z",
    };
    this.calls = [];
    this.failOn = null;
  }

  async query(sql, params = []) {
    const normalizedSql = sql.replace(/\s+/g, " ").trim();
    this.calls.push({ sql: normalizedSql, params });
    if (normalizedSql.startsWith(this.failOn || "\0")) {
      throw new Error("Database failure");
    }

    if (normalizedSql.startsWith("SELECT id, section_id, year_level, section_data")) {
      return { rows: [this.archive] };
    }
    if (normalizedSql.startsWith("SELECT sections, schedules FROM app_config")) {
      return { rows: [{ sections: this.activeSections, schedules: {} }] };
    }
    if (normalizedSql.startsWith("SELECT id FROM students WHERE")) {
      return { rows: [] };
    }
    if (normalizedSql.startsWith("SELECT EXISTS (SELECT 1 FROM students")) {
      return {
        rows: [{ students: false, attendance: false, grades: false, grade_configs: false }],
      };
    }
    if (normalizedSql.startsWith("UPDATE app_config")) {
      return { rows: [] };
    }

    return { rows: [] };
  }
}

test("restores archived records and section configuration in one transaction", async () => {
  const client = new MockClient({
    activeSections: { "2nd Year": ["201"] },
  });

  const result = await restoreSectionArchive(client, "archive-id");

  assert.deepEqual(result, {
    sectionId: "101",
    yearLevel: "1st Year",
    expiresAt: "2026-12-01T00:00:00Z",
    sections: {
      "2nd Year": ["201"],
      "1st Year": ["101"],
    },
    schedules: { "101": [1, 3] },
  });
  const updateCall = client.calls.find(({ sql }) => sql.startsWith("UPDATE app_config"));
  assert.deepEqual(JSON.parse(updateCall.params[0]), {
    "2nd Year": ["201"],
    "1st Year": ["101"],
  });
  assert.deepEqual(JSON.parse(updateCall.params[1]), { "101": [1, 3] });
  for (const table of ["students", "attendance", "grades", "grade_configs"]) {
    assert.equal(
      client.calls.some(({ sql }) => sql.startsWith(`INSERT INTO ${table}`)),
      true,
    );
  }
  assert.equal(client.calls.some(({ sql }) => sql.startsWith("DELETE FROM section_archives")), true);
  assert.equal(client.calls.at(-1).sql, "COMMIT");
});

test("does not restore an archive into a section name that is already active", async () => {
  const client = new MockClient({
    activeSections: { "1st Year": ["101"] },
  });

  await assert.rejects(
    restoreSectionArchive(client, "archive-id"),
    { statusCode: 409 },
  );
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
  assert.equal(client.calls.some(({ sql }) => sql.startsWith("INSERT INTO students")), false);
});

test("rolls back restored records when a later insert fails", async () => {
  const client = new MockClient();
  client.failOn = "INSERT INTO grades";

  await assert.rejects(
    restoreSectionArchive(client, "archive-id"),
    /Database failure/,
  );
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
  assert.equal(client.calls.some(({ sql }) => sql === "COMMIT"), false);
});

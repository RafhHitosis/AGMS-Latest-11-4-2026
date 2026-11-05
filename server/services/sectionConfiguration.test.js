import assert from "node:assert/strict";
import test from "node:test";
import { saveSectionConfiguration } from "./sectionConfiguration.js";

class MockClient {
  constructor(sections, schedules = { A: [1] }) {
    this.sections = sections;
    this.schedules = schedules;
    this.calls = [];
    this.failOn = null;
    this.archivedSections = [];
    this.archiveRows = [];
  }

  async query(sql, params = []) {
    const normalizedSql = sql.replace(/\s+/g, " ").trim();
    this.calls.push({ sql: normalizedSql, params });

    if (normalizedSql.startsWith("SELECT sections, schedules FROM app_config")) {
      return { rows: [{ sections: this.sections, schedules: this.schedules }] };
    }
    if (normalizedSql.startsWith("SELECT id, section_id, year_level, section_data")) {
      return { rows: this.archiveRows.filter((archive) => archive.id === params[0]) };
    }
    if (normalizedSql.startsWith("SELECT id, section_id FROM section_archives")) {
      return {
        rows: this.archivedSections
          .filter((section) => params[0].includes(section))
          .map((section_id) => ({ id: `archive-${section_id}`, section_id })),
      };
    }
    if (normalizedSql.startsWith("SELECT id FROM students WHERE")) {
      return { rows: [] };
    }
    if (normalizedSql.startsWith("SELECT EXISTS (SELECT 1 FROM students")) {
      return {
        rows: [{ students: false, attendance: false, grades: false, grade_configs: false }],
      };
    }

    if (this.failOn && normalizedSql.startsWith(this.failOn)) {
      throw new Error("Database failure");
    }

    if (normalizedSql.startsWith("DELETE FROM section_archives")) {
      this.archiveRows = this.archiveRows.filter((archive) => archive.id !== params[0]);
    }
    if (normalizedSql.startsWith("UPDATE app_config")) {
      return {
        rows: [{ sections: JSON.parse(params[0]), schedules: JSON.parse(params[1]) }],
      };
    }

    return { rows: [] };
  }

  release() {}
}

test("deletes only removed section data and keeps schedules for active sections", async () => {
  const client = new MockClient({
    "Year 1": ["A", "B"],
    "Year 2": ["A"],
  });

  const result = await saveSectionConfiguration(
    client,
    { "Year 2": ["A"] },
    { A: [1, 3], B: [2], orphaned: [4] },
  );

  assert.deepEqual(result, {
    sections: { "Year 2": ["A"] },
    schedules: { A: [1, 3] },
    deletedSections: ["B"],
    restoredSections: [],
  });
  assert.deepEqual(
    client.calls
      .filter(({ sql }) => sql.startsWith("DELETE FROM"))
      .map(({ sql, params }) => [sql, params[0]]),
    [
      ["DELETE FROM attendance WHERE section_id = $1", "B"],
      ["DELETE FROM grades WHERE section_id = $1", "B"],
      ["DELETE FROM students WHERE section_id = $1", "B"],
      ["DELETE FROM grade_configs WHERE section_id = $1", "B"],
    ],
  );
  assert.equal(client.calls.at(-1).sql, "COMMIT");
  const archiveCall = client.calls.find(({ sql }) => sql.startsWith("INSERT INTO section_archives"));
  assert.equal(archiveCall.params[0], "B");
  assert.equal(archiveCall.params[1], "Year 1");
  assert.deepEqual(JSON.parse(archiveCall.params[2]).schedule, []);
  assert.match(archiveCall.sql, /INTERVAL '30 days'/);
});

test("rolls back section cleanup when a database operation fails", async () => {
  const client = new MockClient({ "Year 1": ["A"] });
  client.failOn = "DELETE FROM grades WHERE section_id = $1";

  await assert.rejects(
    saveSectionConfiguration(client, {}, {}),
    /Database failure/,
  );
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
  assert.equal(client.calls.some(({ sql }) => sql === "COMMIT"), false);
});

test("prevents reusing a section name while its archive is recoverable", async () => {
  const client = new MockClient({});
  client.archivedSections = ["101"];

  await assert.rejects(
    saveSectionConfiguration(client, { "1st Year": ["101"] }, {}),
    { statusCode: 409 },
  );
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
  assert.equal(client.calls.some(({ sql }) => sql.startsWith("INSERT INTO section_archives")), false);
});

test("restores staged archives only as part of saving section configuration", async () => {
  const client = new MockClient({});
  client.archivedSections = ["101"];
  client.archiveRows = [{
    id: "archive-101",
    section_id: "101",
    year_level: "1st Year",
    section_data: {
      students: [{ id: "student-101", name: "Student", created_at: "2026-01-01T00:00:00Z" }],
      attendance: [],
      grades: [],
      gradeConfigs: [],
      schedule: [1, 3],
    },
    expires_at: "2026-12-01T00:00:00Z",
  }];

  const result = await saveSectionConfiguration(
    client,
    { "1st Year": ["101"] },
    {},
    [],
    ["archive-101"],
  );

  assert.deepEqual(result.schedules, { "101": [1, 3] });
  assert.deepEqual(result.restoredSections.map(({ sectionId, yearLevel }) => ({
    sectionId,
    yearLevel,
  })), [{ sectionId: "101", yearLevel: "1st Year" }]);
  assert.equal(client.calls.at(-1).sql, "COMMIT");
  assert.equal(client.calls.some(({ sql }) => sql.startsWith("DELETE FROM section_archives")), true);
  assert.equal(client.calls.some(({ sql }) => sql.startsWith("UPDATE app_config")), true);
});

test("copies all section data when renaming a still-shared section", async () => {
  const client = new MockClient(
    { "1st Year": ["101"], "2nd Year": ["101"] },
    { "101": [1, 3] },
  );

  const result = await saveSectionConfiguration(
    client,
    { "1st Year": ["101"], "2nd Year": ["201"] },
    { "101": [1, 3] },
    [{ sourceSectionId: "101", targetSectionId: "201" }],
  );

  assert.deepEqual(result.schedules, { "101": [1, 3], "201": [1, 3] });
  for (const table of ["students", "attendance", "grades", "grade_configs"]) {
    assert.equal(
      client.calls.some(({ sql }) => sql.startsWith(`INSERT INTO ${table}`)),
      true,
    );
  }
  assert.equal(client.calls.some(({ sql }) => sql.startsWith("INSERT INTO section_archives")), false);
  assert.equal(client.calls.at(-1).sql, "COMMIT");
});

test("rolls back copied data when a dependent record insert fails", async () => {
  const client = new MockClient(
    { "1st Year": ["101"], "2nd Year": ["101"] },
    { "101": [1, 3] },
  );
  client.failOn = "INSERT INTO attendance";

  await assert.rejects(
    saveSectionConfiguration(
      client,
      { "1st Year": ["101"], "2nd Year": ["201"] },
      { "101": [1, 3] },
      [{ sourceSectionId: "101", targetSectionId: "201" }],
    ),
    /Database failure/,
  );
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
  assert.equal(client.calls.some(({ sql }) => sql === "COMMIT"), false);
});

test("rejects duplicate section copy targets", async () => {
  const client = new MockClient({});

  await assert.rejects(
    saveSectionConfiguration(client, {}, {}, [
      { sourceSectionId: "101", targetSectionId: "201" },
      { sourceSectionId: "102", targetSectionId: "201" },
    ]),
    { statusCode: 400 },
  );
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
});

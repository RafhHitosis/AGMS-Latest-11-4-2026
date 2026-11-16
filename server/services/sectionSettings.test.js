import test from "node:test";
import assert from "node:assert/strict";
import { saveSectionSettings } from "./sectionSettings.js";

const createClient = ({ failOn = "" } = {}) => {
  const statements = [];
  return {
    statements,
    async query(sql) {
      statements.push(sql);
      if (sql.startsWith("SELECT term_dates, schedules FROM app_config WHERE workspace_id")) {
        return { rows: [{ term_dates: {}, schedules: {} }] };
      }
      if (sql.startsWith("SELECT id FROM holidays WHERE workspace_id")) {
        return { rows: [{ id: "holiday-1" }] };
      }
      if (sql.startsWith("SELECT id, date, name")) {
        return { rows: [{ id: "holiday-1", date: "2026-01-15", name: "Updated" }] };
      }
      if (failOn && sql.startsWith(failOn)) {
        throw new Error("Simulated database failure.");
      }
      if (sql.includes("RETURNING term_dates")) {
        return { rows: [{ term_dates: { midtermStart: "2026-01-01" } }] };
      }
      if (sql.includes("RETURNING schedules ->")) {
        return { rows: [{ schedule: [1, 3, 5] }] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
};

test("saves all requested settings inside one database transaction", async () => {
  const client = createClient();
  const result = await saveSectionSettings(client, "1A", {
    termDates: { midtermStart: "2026-01-01" },
    schedule: [1, 3, 5],
    holidays: [{ id: "holiday-1", date: "2026-01-15", name: "Updated" }],
  }, "workspace-1");

  assert.equal(result.success, true);
  assert.deepEqual(result.schedule, [1, 3, 5]);
  assert.deepEqual(result.termDates, { midtermStart: "2026-01-01" });
  assert.equal(client.statements[0], "BEGIN");
  assert.equal(client.statements.at(-1), "COMMIT");
  assert.equal(client.statements.filter((statement) => statement === "BEGIN").length, 1);
});

test("rolls back every settings change if a later holiday write fails", async () => {
  const client = createClient({ failOn: "INSERT INTO holidays" });

  await assert.rejects(
    saveSectionSettings(client, "1A", {
      termDates: { midtermStart: "2026-01-01" },
      schedule: [1, 3, 5],
      holidays: [{ date: "2026-01-15", name: "New Holiday" }],
    }, "workspace-1"),
    /Simulated database failure/,
  );

  assert.equal(client.statements.at(-1), "ROLLBACK");
  assert.equal(client.statements.includes("COMMIT"), false);
});

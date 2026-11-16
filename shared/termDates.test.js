import test from "node:test";
import assert from "node:assert/strict";
import {
  countAbsencesByStudent,
  getTermDateRange,
  isValidDateRange,
} from "./termDates.js";

test("validates ISO dates and ordered ranges", () => {
  assert.equal(isValidDateRange("2026-02-28", "2026-03-01"), true);
  assert.equal(isValidDateRange("2026-02-29", "2026-03-01"), false);
  assert.equal(isValidDateRange("2026-03-02", "2026-03-01"), false);
});

test("gets a date range only for a configured term", () => {
  const dates = {
    midtermStart: "2026-01-01",
    midtermEnd: "2026-03-31",
    finalsStart: "2026-04-01",
    finalsEnd: "2026-06-30",
  };

  assert.deepEqual(getTermDateRange("midterm", dates), {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });
  assert.equal(getTermDateRange("semestral", dates), null);
  assert.equal(getTermDateRange("finals", {}), null);
});

test("counts only true absences within the requested term range", () => {
  const counts = countAbsencesByStudent(
    {
      "2026-01-31": { student1: true, student2: false },
      "2026-02-01": { student1: true, student2: true },
      "2026-03-01": { student1: true },
    },
    { startDate: "2026-02-01", endDate: "2026-02-28" },
  );

  assert.equal(counts.get("student1"), 1);
  assert.equal(counts.get("student2"), 1);
});

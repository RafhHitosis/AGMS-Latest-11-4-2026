import test from "node:test";
import assert from "node:assert/strict";
import { validateSectionSettingsUpdate } from "./settingsValidation.js";

test("validates settings changes for both workspace roles", () => {
  assert.equal(
    validateSectionSettingsUpdate({
      termDates: { midtermStart: "2026-01-01", midtermEnd: "2026-01-31" },
      schedule: [1, 3, 5],
      holidays: [{ id: "holiday-1", date: "2026-01-15", name: "Foundation Day" }],
    }),
    null,
  );
  assert.equal(
    validateSectionSettingsUpdate({
      termDates: { midtermStart: "2026-01-01" },
      holidays: [],
      schedule: [1, 2, 3],
    }),
    null,
  );
});

test("rejects malformed settings changes", () => {
  assert.match(
    validateSectionSettingsUpdate({ schedule: [1, 1] }),
    /unique weekday/,
  );
  assert.match(
    validateSectionSettingsUpdate({ termDates: { midtermStart: "2026-02-01", midtermEnd: "2026-01-01" } }),
    /start date/,
  );
  assert.match(
    validateSectionSettingsUpdate({ holidays: [{ date: "2026-02-30", name: "Holiday" }] }),
    /valid date/,
  );
});

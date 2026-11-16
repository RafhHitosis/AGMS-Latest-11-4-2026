import test from "node:test";
import assert from "node:assert/strict";
import { validateAppConfigResponse } from "./appConfigValidation.js";

test("accepts a valid empty first-run configuration", () => {
  assert.equal(
    validateAppConfigResponse({
      appTitle: "Attendance & Grading System",
      appSubtitle: "Choose a year level",
      appLogo: "",
      termDates: {},
      sections: {},
      schedules: {},
    }),
    null,
  );
});

test("rejects malformed configuration instead of treating it as an empty setup", () => {
  assert.match(
    validateAppConfigResponse({ sections: [], schedules: {}, termDates: {} }),
    /incomplete application configuration/,
  );
  assert.match(
    validateAppConfigResponse({
      sections: { "1st Year": ["1A"] },
      schedules: { "1A": [1, 1] },
      termDates: {},
    }),
    /invalid class schedules/,
  );
});

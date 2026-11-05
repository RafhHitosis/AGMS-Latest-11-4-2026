import assert from "node:assert/strict";
import test from "node:test";
import { getSectionNamingErrors } from "./sectionNaming.js";

test("accepts unique section-number prefixes for configured year levels", () => {
  assert.deepEqual(
    getSectionNamingErrors({
      "1st Year": ["101", "1A"],
      "2nd Year": ["201"],
      "3rd Year": ["301"],
      "4th Year": ["401"],
    }),
    [],
  );
});

test("rejects a section whose prefix conflicts with its year level", () => {
  assert.deepEqual(
    getSectionNamingErrors({
      "1st Year": ["101"],
      "2nd Year": ["101"],
    }),
    ['Section "101" must start with 2 for 2nd Year.'],
  );
});

test("requires a configured year-level prefix for non-empty levels", () => {
  assert.deepEqual(
    getSectionNamingErrors({ "New Year Level": ["101"] }),
    [
      "Add sections only under 1st Year, 2nd Year, 3rd Year, or 4th Year so each year level has a unique section prefix.",
    ],
  );
});

test("rejects assigning the same prefix to two differently-cased year levels", () => {
  assert.deepEqual(
    getSectionNamingErrors({
      "1st Year": ["101"],
      "1st year": ["102"],
    }),
    ["The section prefix 1 is assigned to both 1st Year and 1st year."],
  );
});

test("allows pre-existing naming conflicts while rejecting new ones", () => {
  const existing = {
    "1st Year": ["101"],
    "2nd Year": ["101"],
  };
  assert.deepEqual(getSectionNamingErrors(existing, existing), []);
  assert.deepEqual(
    getSectionNamingErrors(
      { ...existing, "3rd Year": ["301"] },
      existing,
    ),
    [],
  );
  assert.deepEqual(
    getSectionNamingErrors(
      { ...existing, "1st year": ["102"] },
      existing,
    ),
    ["The section prefix 1 is assigned to both 1st Year and 1st year."],
  );
  assert.deepEqual(
    getSectionNamingErrors(
      { ...existing, "1st Year": ["101", "102"] },
      existing,
    ),
    [],
  );
});

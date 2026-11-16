import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCsvFirstColumn,
  prepareStudentImportNames,
  splitPastedStudentNames,
} from "./studentImport.js";

test("splits pasted rows and spreadsheet columns into names", () => {
  assert.deepEqual(
    splitPastedStudentNames("DELA CRUZ, Juan\tSANTOS, Maria\r\nREYES, Ana"),
    ["DELA CRUZ, Juan", "SANTOS, Maria", "REYES, Ana"]
  );
});

test("parses quoted CSV names with commas and escaped quotes", () => {
  assert.deepEqual(
    parseCsvFirstColumn('"Student Name",Section\r\n"DELA CRUZ, Juan",A\r\n"LOPEZ ""JR"", Ana",B'),
    ["Student Name", "DELA CRUZ, Juan", 'LOPEZ "JR", Ana']
  );
});

test("filters blank, repeated, and existing names without changing display casing", () => {
  assert.deepEqual(
    prepareStudentImportNames(
      [" name ", "ALICE SANTOS", "Alice Santos", "", "BOB REYES"],
      ["bob reyes"]
    ),
    { names: ["ALICE SANTOS"], duplicateCount: 2 }
  );
});

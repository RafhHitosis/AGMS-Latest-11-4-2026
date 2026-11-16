import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSESSMENT_TERM_OPTIONS,
  getAssessmentExamGradeTarget,
  getAssessmentTermLabel,
  getAssessmentTermsForGradebookTerm,
  getGradebookTermForAssessmentTerm,
  isValidAssessmentTerm,
} from "./assessmentTerms.js";

test("assessment terms include the four requested academic periods", () => {
  assert.deepEqual(
    ASSESSMENT_TERM_OPTIONS.map(({ value }) => value),
    ["prelim", "midterm", "pre_final", "finals"],
  );
  assert.ok(ASSESSMENT_TERM_OPTIONS.every(({ value }) => isValidAssessmentTerm(value)));
});

test("legacy semestral assessments remain valid and display with a readable label", () => {
  assert.equal(isValidAssessmentTerm("semestral"), true);
  assert.equal(getAssessmentTermLabel("pre_final"), "Pre-Final");
  assert.equal(getAssessmentTermLabel("semestral"), "Semestral");
  assert.equal(isValidAssessmentTerm("fourth_quarter"), false);
});

test("assessment periods map to their gradebook term and exam column", () => {
  assert.deepEqual(getAssessmentExamGradeTarget("prelim"), {
    gradebookTerm: "midterm",
    scoreKey: "pe",
    maxKey: "pe_max",
    columnLabel: "PE (Preliminary Exam)",
  });
  assert.deepEqual(getAssessmentExamGradeTarget("midterm"), {
    gradebookTerm: "midterm",
    scoreKey: "me",
    maxKey: "me_max",
    columnLabel: "ME (Major Exam)",
  });
  assert.equal(getGradebookTermForAssessmentTerm("pre_final"), "finals");
  assert.equal(getGradebookTermForAssessmentTerm("finals"), "finals");
  assert.deepEqual(getAssessmentTermsForGradebookTerm("midterm"), ["prelim", "midterm"]);
  assert.deepEqual(getAssessmentTermsForGradebookTerm("finals"), ["pre_final", "finals"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { findMatchingQuizColumn } from "./assessmentGradeMapping.js";

test("matches a configured quiz column name inside the assessment title", () => {
  const quizItems = [
    { id: "quiz-1", name: "Quiz 1" },
    { id: "quiz-2", name: "Quiz 2" },
  ];

  assert.equal(
    findMatchingQuizColumn("Quiz 2 - Cell Biology", quizItems)?.id,
    "quiz-2",
  );
});

test("does not confuse quiz numbers that share a prefix", () => {
  const quizItems = [
    { id: "quiz-1", name: "Quiz 1" },
    { id: "quiz-10", name: "Quiz 10" },
  ];

  assert.equal(findMatchingQuizColumn("Quiz 10", quizItems)?.id, "quiz-10");
});

test("leaves ambiguous matching quiz columns for the teacher to choose", () => {
  const quizItems = [
    { id: "quiz-1-a", name: "Quiz 1" },
    { id: "quiz-1-b", name: "Quiz 1" },
  ];

  assert.equal(findMatchingQuizColumn("Quiz 1", quizItems), null);
});

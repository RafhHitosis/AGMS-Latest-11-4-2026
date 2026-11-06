import test from "node:test";
import assert from "node:assert/strict";
import { createScoreSaveQueue } from "./scoreSaveQueue.js";

test("serializes score saves per student and term", async () => {
  const savedScores = [];
  let releaseFirstSave;
  const firstSaveGate = new Promise((resolve) => {
    releaseFirstSave = resolve;
  });
  const queue = createScoreSaveQueue(async (studentId, scores) => {
    if (studentId === "student-1" && scores.me === "4") await firstSaveGate;
    savedScores.push({ studentId, scores });
  });

  const firstSave = queue.save("section-midterm-student-1", "student-1", { me: "4" });
  const secondSave = queue.save("section-midterm-student-1", "student-1", { me: "45" });
  const otherStudentSave = queue.save("section-midterm-student-2", "student-2", { me: "32" });
  await otherStudentSave;

  assert.deepEqual(savedScores, [{ studentId: "student-2", scores: { me: "32" } }]);

  releaseFirstSave();
  await Promise.all([firstSave, secondSave]);
  assert.deepEqual(savedScores, [
    { studentId: "student-2", scores: { me: "32" } },
    { studentId: "student-1", scores: { me: "4" } },
    { studentId: "student-1", scores: { me: "45" } },
  ]);
});

test("flush waits for all pending score saves", async () => {
  let releaseSave;
  const saveGate = new Promise((resolve) => {
    releaseSave = resolve;
  });
  const queue = createScoreSaveQueue(() => saveGate);

  queue.save("section-midterm-student-1", "student-1", { me: "45" });
  let flushed = false;
  const flush = queue.flush().then(() => {
    flushed = true;
  });

  await Promise.resolve();
  assert.equal(flushed, false);

  releaseSave();
  await flush;
  assert.equal(flushed, true);
});

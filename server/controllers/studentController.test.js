import test from "node:test";
import assert from "node:assert/strict";
import { addStudent, updateStudent } from "./studentController.js";

const invoke = async (handler, req) => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
  let nextCalled = false;
  await handler(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
};

test("student writes reject non-text, blank, and overlong names before querying", async () => {
  const invalidAdd = await invoke(addStudent, {
    params: { sectionId: "1A" },
    body: { name: 123 },
  });
  const invalidUpdate = await invoke(updateStudent, {
    params: { sectionId: "1A", id: "student-1" },
    body: { name: ` ${"a".repeat(256)} ` },
  });

  assert.equal(invalidAdd.res.statusCode, 400);
  assert.equal(invalidAdd.nextCalled, false);
  assert.equal(invalidUpdate.res.statusCode, 400);
  assert.equal(invalidUpdate.nextCalled, false);
});

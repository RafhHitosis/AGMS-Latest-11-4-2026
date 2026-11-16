import test from "node:test";
import assert from "node:assert/strict";
import { deleteUser } from "./adminController.js";

test("teacher deletion rejects invalid account IDs before database access", async () => {
  let statusCode = null;
  let responseBody = null;
  let nextCalled = false;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
    },
  };

  await deleteUser(
    { params: { userId: "not-a-uuid" }, user: { id: "admin-id" } },
    res,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(statusCode, 400);
  assert.deepEqual(responseBody, { error: "Teacher account ID is invalid." });
  assert.equal(nextCalled, false);
});

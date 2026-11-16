import test from "node:test";
import assert from "node:assert/strict";
import {
  requireRole,
  requireSectionAccess,
} from "./requireAuth.js";

const runMiddleware = (middleware, req) => {
  let nextCalled = false;
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
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { nextCalled, res };
};

test("role middleware rejects non-admin users", () => {
  const result = runMiddleware(requireRole("admin"), {
    user: { role: "teacher" },
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
});

test("section access is the same for all workspace users", () => {
  const teacher = runMiddleware(requireSectionAccess, {
    params: { sectionId: "1A" },
    method: "PUT",
    user: { role: "teacher" },
  });

  assert.equal(teacher.nextCalled, true);
});

test("administrators use the same section access as teachers", () => {
  const result = runMiddleware(requireSectionAccess, {
    params: { sectionId: "1A" },
    method: "DELETE",
    user: { role: "admin" },
  });

  assert.equal(result.nextCalled, true);
});

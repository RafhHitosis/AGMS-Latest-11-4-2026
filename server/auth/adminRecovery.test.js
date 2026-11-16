import assert from "node:assert/strict";
import test from "node:test";
import {
  hashRecoveryAnswer,
  isValidRecoveryAnswer,
  normalizeRecoveryAnswer,
  verifyRecoveryAnswer,
} from "./adminRecovery.js";

test("recovery answers normalize case and whitespace", async () => {
  const firstHash = await hashRecoveryAnswer("  A  private   answer ");
  const secondHash = await hashRecoveryAnswer("a private answer");

  assert.notEqual(firstHash.salt, secondHash.salt);
  assert.notEqual(firstHash.hash, secondHash.hash);
  assert.equal(
    await verifyRecoveryAnswer("A PRIVATE ANSWER", firstHash.salt, firstHash.hash),
    true,
  );
  assert.equal(
    await verifyRecoveryAnswer("different answer", firstHash.salt, firstHash.hash),
    false,
  );
});

test("recovery answers require a bounded non-empty value", () => {
  assert.equal(normalizeRecoveryAnswer("  A   answer  "), "a answer");
  assert.equal(isValidRecoveryAnswer("  "), false);
  assert.equal(isValidRecoveryAnswer("ok"), false);
  assert.equal(isValidRecoveryAnswer("valid answer"), true);
  assert.equal(isValidRecoveryAnswer("a".repeat(201)), false);
});

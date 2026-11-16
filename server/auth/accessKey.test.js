import test from "node:test";
import assert from "node:assert/strict";
import {
  generateAccessKey,
  hashAccessKey,
  parseAccessKey,
  verifyAccessKey,
} from "./accessKey.js";

const withNodeEnvironment = (value, callback) => {
  const previous = process.env.NODE_ENV;
  if (value === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = value;
  try {
    return callback();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
};

test("generates the same one-animal and four-digit key format in every environment", () => {
  for (const environment of ["development", "production", undefined]) {
    withNodeEnvironment(environment, () => {
      const first = generateAccessKey();

      assert.match(first.accessKey, /^[a-z]+\d{4}$/);
      assert.deepEqual(parseAccessKey(first.accessKey), {
        accessKey: first.accessKey,
      });
      assert.deepEqual(parseAccessKey(first.accessKey.toUpperCase()), {
        accessKey: first.accessKey,
      });
      assert.match(first.accessKeyHash, /^[a-f0-9]{64}$/);
      assert.equal(verifyAccessKey(first.accessKey, first.accessKeyHash), true);
      assert.equal(
        verifyAccessKey(`${first.accessKey}x`, first.accessKeyHash),
        false,
      );
      assert.equal(parseAccessKey("dog"), null);
      assert.equal(parseAccessKey("dog-0122"), null);
      assert.equal(parseAccessKey("not-an-animal0122"), null);
    });
  }
});

test("accepts animal and legacy passphrases and keeps legacy keys case-insensitive", () => {
  const animalPassphrase = "BluePanda-SilverOtter-GoldenEagle-ArcticFox-QuietLynx";
  assert.deepEqual(parseAccessKey(animalPassphrase), {
    accessKey: animalPassphrase,
  });

  const passphrase = "Bamo-Guta-Sapi-Fenu-7-!";
  assert.deepEqual(parseAccessKey(passphrase), { accessKey: passphrase });
  assert.equal(parseAccessKey(passphrase.toLowerCase()), null);

  const legacyKey = "AGMS-ABCDEFGH-23456789ABCDEFGH";
  const legacyHash = hashAccessKey(legacyKey);
  assert.equal(verifyAccessKey(legacyKey.toLowerCase(), legacyHash), true);
  assert.equal(parseAccessKey("qweR123$"), null);
});

test("rejects malformed or altered access keys", () => {
  assert.equal(parseAccessKey("not-a-key"), null);
  const { accessKey, accessKeyHash } = generateAccessKey();
  assert.equal(verifyAccessKey(`${accessKey}x`, accessKeyHash), false);
});

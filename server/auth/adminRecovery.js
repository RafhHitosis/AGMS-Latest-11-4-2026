import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const HASH_BYTES = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const normalizeRecoveryAnswer = (answer) =>
  typeof answer === "string"
    ? answer.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")
    : "";

export const isValidRecoveryAnswer = (answer) => {
  const normalized = normalizeRecoveryAnswer(answer);
  return normalized.length >= 3 && normalized.length <= 200;
};

export const hashRecoveryAnswer = async (answer) => {
  const normalized = normalizeRecoveryAnswer(answer);
  const salt = randomBytes(SALT_BYTES);
  const hash = await scrypt(normalized, salt, HASH_BYTES, SCRYPT_OPTIONS);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
};

export const verifyRecoveryAnswer = async (answer, saltHex, hashHex) => {
  const saltIsValid = typeof saltHex === "string" && /^[a-f0-9]{32}$/i.test(saltHex);
  const hashIsValid = typeof hashHex === "string" && /^[a-f0-9]{128}$/i.test(hashHex);
  const salt = saltIsValid ? Buffer.from(saltHex, "hex") : Buffer.alloc(SALT_BYTES);
  const expectedHash = hashIsValid ? Buffer.from(hashHex, "hex") : Buffer.alloc(HASH_BYTES);
  const normalizedAnswer = normalizeRecoveryAnswer(answer);
  const answerIsValid = normalizedAnswer.length >= 3 && normalizedAnswer.length <= 200;
  const actualHash = await scrypt(
    answerIsValid ? normalizedAnswer : "",
    salt,
    HASH_BYTES,
    SCRYPT_OPTIONS,
  );
  const matches = timingSafeEqual(actualHash, expectedHash);

  return answerIsValid && saltIsValid && hashIsValid && matches;
};

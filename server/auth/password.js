import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;
const HASH_PATTERN = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/;

export async function createPasswordHash(password) {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });

  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export function isValidPasswordHash(hash) {
  return typeof hash === "string" && HASH_PATTERN.test(hash);
}

export async function verifyPassword(password, hash) {
  const match = HASH_PATTERN.exec(hash || "");
  if (!match) {
    throw new Error("AUTH_PASSWORD_HASH must be a scrypt hash. Generate one with npm run auth:hash.");
  }

  const [, saltHex, expectedHex] = match;
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });

  return timingSafeEqual(actual, Buffer.from(expectedHex, "hex"));
}

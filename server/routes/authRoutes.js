import { randomBytes, createHmac } from "node:crypto";
import { Router } from "express";
import { pool } from "../config/db.js";
import { verifyPassword } from "../auth/password.js";
import {
  getSessionToken,
  hashSessionToken,
  hasValidSession,
  SESSION_COOKIE,
} from "../middleware/requireAuth.js";
import { requireAllowedOrigin } from "../middleware/allowedOrigin.js";

const router = Router();
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS = 5;

const cookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/api",
});

const getRateLimitKey = (req) =>
  createHmac("sha256", process.env.AUTH_PASSWORD_HASH)
    .update(req.ip || req.socket.remoteAddress || "unknown")
    .digest("hex");

async function checkLoginRateLimit(ipHash) {
  await pool.query(
    "DELETE FROM auth_login_attempts WHERE window_started_at < NOW() - INTERVAL '1 day'",
  );

  const { rows } = await pool.query(
    `INSERT INTO auth_login_attempts (ip_hash, attempts, window_started_at, locked_until)
     VALUES ($1, 1, NOW(), NULL)
     ON CONFLICT (ip_hash) DO UPDATE SET
       attempts = CASE
         WHEN auth_login_attempts.window_started_at <= NOW() - INTERVAL '${LOGIN_WINDOW_MINUTES} minutes' THEN 1
         ELSE auth_login_attempts.attempts + 1
       END,
       window_started_at = CASE
         WHEN auth_login_attempts.window_started_at <= NOW() - INTERVAL '${LOGIN_WINDOW_MINUTES} minutes' THEN NOW()
         ELSE auth_login_attempts.window_started_at
       END,
       locked_until = CASE
         WHEN auth_login_attempts.locked_until > NOW() THEN auth_login_attempts.locked_until
         WHEN auth_login_attempts.window_started_at <= NOW() - INTERVAL '${LOGIN_WINDOW_MINUTES} minutes' THEN NULL
         WHEN auth_login_attempts.attempts + 1 > ${MAX_LOGIN_ATTEMPTS} THEN NOW() + INTERVAL '${LOGIN_WINDOW_MINUTES} minutes'
         ELSE NULL
       END
     RETURNING attempts, locked_until, locked_until > NOW() AS locked`,
    [ipHash],
  );

  return rows[0];
}

router.get("/session", async (req, res, next) => {
  try {
    res.json({ authenticated: await hasValidSession(getSessionToken(req)) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", requireAllowedOrigin, async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > 256
    ) {
      res.status(400).json({ error: "Enter a valid password." });
      return;
    }

    const attempt = await checkLoginRateLimit(getRateLimitKey(req));
    if (attempt.locked) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(attempt.locked_until).getTime() - Date.now()) / 1000),
      );
      res.set("Retry-After", String(retryAfterSeconds));
      res
        .status(429)
        .json({ error: "Too many attempts. Try again in 15 minutes." });
      return;
    }

    if (!(await verifyPassword(password, process.env.AUTH_PASSWORD_HASH))) {
      res.status(401).json({ error: "Incorrect Access key." });
      return;
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await pool.query(
      "INSERT INTO auth_sessions (token_hash, expires_at) VALUES ($1, $2)",
      [hashSessionToken(token), expiresAt],
    );
    await pool.query("DELETE FROM auth_login_attempts WHERE ip_hash = $1", [
      getRateLimitKey(req),
    ]);
    await pool.query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");

    res.cookie(SESSION_COOKIE, token, {
      ...cookieBaseOptions(),
      maxAge: SESSION_DURATION_MS,
    });
    res.json({ authenticated: true });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", requireAllowedOrigin, async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    if (token) {
      await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [
        hashSessionToken(token),
      ]);
    }
    res.clearCookie(SESSION_COOKIE, cookieBaseOptions());
    res.json({ authenticated: false });
  } catch (error) {
    next(error);
  }
});

export default router;

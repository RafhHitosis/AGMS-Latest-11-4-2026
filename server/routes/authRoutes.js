import { randomBytes, createHash } from "node:crypto";
import { Router } from "express";
import { pool } from "../config/db.js";
import {
  hashAccessKey,
  parseAccessKey,
  verifyAccessKey,
} from "../auth/accessKey.js";
import {
  getSessionToken,
  getSessionUser,
  hashSessionToken,
  requireAuth,
  SESSION_COOKIE,
} from "../middleware/requireAuth.js";
import { requireAllowedOrigin } from "../middleware/allowedOrigin.js";
import {
  getPublicAdminRecoveryQuestions,
  recoverAdminAccessKey,
} from "../controllers/adminRecoveryController.js";

const router = Router();
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS = 5;
const DUMMY_ACCESS_KEY_HASH = createHash("sha256")
  .update("AGMS-invalid-access-key-dummy")
  .digest("hex");

const cookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api",
});

const getRateLimitKey = (req) =>
  createHash("sha256")
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
    const user = await getSessionUser(getSessionToken(req));
    res.json({ authenticated: Boolean(user), user });
  } catch (error) {
    next(error);
  }
});

router.get("/admin-recovery/questions", getPublicAdminRecoveryQuestions);

router.post("/admin-recovery", requireAllowedOrigin, async (req, res, next) => {
  try {
    const attempt = await checkLoginRateLimit(getRateLimitKey(req));
    if (attempt.locked) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(attempt.locked_until).getTime() - Date.now()) / 1000),
      );
      res.set("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
      return;
    }

    const recovery = await recoverAdminAccessKey(req.body?.answers);
    if (recovery.status === "locked") {
      res.set("Retry-After", String(recovery.retryAfterSeconds));
      res.status(429).json({ error: "Too many attempts. Try again after the recovery cooldown." });
      return;
    }
    if (recovery.status !== "success") {
      res.status(401).json({ error: "Unable to verify recovery answers." });
      return;
    }

    await pool.query("DELETE FROM auth_login_attempts WHERE ip_hash = $1", [
      getRateLimitKey(req),
    ]);
    res.set("Cache-Control", "no-store");
    res.json({
      accessKeyId: recovery.key.accessKeyId,
      accessKey: recovery.key.accessKey,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/welcome-acknowledgment", requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE app_users
       SET welcome_acknowledged_at = COALESCE(welcome_acknowledged_at, CURRENT_TIMESTAMP)
       WHERE id = $1`,
      [req.user.id],
    );
    res.json({ welcome_acknowledged: true });
  } catch (error) {
    next(error);
  }
});

router.post("/login", requireAllowedOrigin, async (req, res, next) => {
  try {
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

    const parsedKey = parseAccessKey(req.body?.accessKey);
    if (!parsedKey) {
      res.status(401).json({ error: "Incorrect access key." });
      return;
    }

    let user;
    let keyMatches;
    if (parsedKey.accessKeyId) {
      const { rows } = await pool.query(
        `SELECT id, display_name, role, is_active, access_key_hash
         FROM app_users WHERE access_key_id = $1`,
        [parsedKey.accessKeyId],
      );
      user = rows[0];
      keyMatches = verifyAccessKey(
        parsedKey.accessKey,
        user?.access_key_hash || DUMMY_ACCESS_KEY_HASH,
      );
    } else {
      const { rows } = await pool.query(
        `SELECT id, display_name, role, is_active
         FROM app_users
         WHERE access_key_hash = $1`,
        [hashAccessKey(parsedKey.accessKey)],
      );
      user = rows[0];
      keyMatches = Boolean(user);
    }
    if (!user || !user.is_active || !keyMatches) {
      res.status(401).json({ error: "Incorrect access key." });
      return;
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await pool.query(
      "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [hashSessionToken(token), user.id, expiresAt],
    );
    await pool.query("DELETE FROM auth_login_attempts WHERE ip_hash = $1", [
      getRateLimitKey(req),
    ]);
    await pool.query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");

    res.cookie(SESSION_COOKIE, token, {
      ...cookieBaseOptions(),
      maxAge: SESSION_DURATION_MS,
    });
    res.json({ authenticated: true, user: await getSessionUser(token) });
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

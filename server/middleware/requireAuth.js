import { createHash } from "node:crypto";
import { pool } from "../config/db.js";
import { isAllowedOrigin } from "./allowedOrigin.js";

export const SESSION_COOKIE = "agms_session";

export function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (!cookie) return null;
  const token = cookie.slice(SESSION_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getSessionUser(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name, u.access_key_id, u.role,
            u.welcome_acknowledged_at IS NOT NULL AS welcome_acknowledged,
            EXISTS (
              SELECT 1 FROM admin_recovery_questions AS recovery
              WHERE recovery.admin_user_id = u.id
            ) AS admin_recovery_configured
     FROM auth_sessions AS s
     JOIN app_users AS u ON u.id = s.user_id AND u.is_active
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
    `,
    [hashSessionToken(token)],
  );
  return rows[0] || null;
}

export async function hasValidSession(token) {
  return Boolean(await getSessionUser(token));
}

export async function requireAuth(req, res, next) {
  if (!isAllowedOrigin(req.get("origin"))) {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }

  try {
    const user = await getSessionUser(getSessionToken(req));
    if (!user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ error: "You do not have permission to perform this action." });
    return;
  }
  next();
};

export function requireSectionAccess(req, res, next) {
  if (!req.user || !["admin", "teacher"].includes(req.user.role)) {
    res.status(403).json({ error: "You do not have permission to access this workspace." });
    return;
  }
  next();
}

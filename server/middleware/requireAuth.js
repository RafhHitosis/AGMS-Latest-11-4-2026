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

export async function hasValidSession(token) {
  if (!token) return false;
  const { rowCount } = await pool.query(
    "SELECT 1 FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()",
    [hashSessionToken(token)],
  );
  return rowCount > 0;
}

export async function requireAuth(req, res, next) {
  if (!isAllowedOrigin(req.get("origin"))) {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }

  try {
    if (!(await hasValidSession(getSessionToken(req)))) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

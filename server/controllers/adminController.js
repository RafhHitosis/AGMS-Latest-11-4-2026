import { pool } from "../config/db.js";
import { generateAccessKey } from "../auth/accessKey.js";
import { getSessionToken, hashSessionToken } from "../middleware/requireAuth.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateDisplayName = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= 120;

const recordSecurityEvent = (client, actorId, targetId, action) =>
  client.query(
    `INSERT INTO account_security_events (actor_user_id, target_user_id, action)
     VALUES ($1, $2, $3)`,
    [actorId, targetId, action],
  );

const rollback = async (client) => {
  try {
    await client.query("ROLLBACK");
  } catch (error) {
    console.error("Failed to roll back account-management transaction:", error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, display_name, access_key_id, is_active, created_at
       FROM app_users
       WHERE role = 'teacher'
       ORDER BY display_name, created_at`,
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  const displayName = req.body?.displayName;
  if (!validateDisplayName(displayName)) {
    res.status(400).json({ error: "Teacher name must contain 1 to 120 characters." });
    return;
  }

  const generatedKey = generateAccessKey();
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO app_users (display_name, role, access_key_id, access_key_hash)
       VALUES ($1, 'teacher', $2, $3)
       RETURNING id, display_name, access_key_id, is_active, created_at`,
      [displayName.trim(), generatedKey.accessKeyId, generatedKey.accessKeyHash],
    );
    const account = rows[0];
    await client.query(
      `INSERT INTO app_config (workspace_id, id)
       VALUES ($1, 1)`,
      [account.id],
    );
    await recordSecurityEvent(client, req.user.id, account.id, "teacher_account_created");
    await client.query("COMMIT");
    res.status(201).json({ ...account, accessKey: generatedKey.accessKey });
  } catch (error) {
    if (client) await rollback(client);
    if (error.code === "23505") {
      res.status(409).json({ error: "A generated access key ID conflicted. Please try again." });
      return;
    }
    next(error);
  } finally {
    client?.release();
  }
};

export const updateUser = async (req, res, next) => {
  const userId = req.params.userId.toLowerCase();
  const update = req.body || {};
  const allowedFields = new Set(["displayName", "isActive"]);
  if (
    !UUID_PATTERN.test(userId) ||
    Object.keys(update).length === 0 ||
    Object.keys(update).some((key) => !allowedFields.has(key)) ||
    (update.displayName !== undefined && !validateDisplayName(update.displayName)) ||
    (update.isActive !== undefined && typeof update.isActive !== "boolean")
  ) {
    res.status(400).json({ error: "Provide a valid teacher name or active state." });
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE app_users
       SET display_name = COALESCE($2, display_name),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $1 AND role = 'teacher'
       RETURNING id, display_name, access_key_id, is_active, created_at`,
      [
        userId,
        update.displayName?.trim() ?? null,
        update.isActive ?? null,
      ],
    );
    const account = updated.rows[0];
    if (!account) {
      await rollback(client);
      res.status(404).json({ error: "Teacher account not found." });
      return;
    }
    if (update.isActive === false) {
      await client.query("DELETE FROM auth_sessions WHERE user_id = $1", [userId]);
    }
    if (update.isActive !== undefined) {
      await recordSecurityEvent(
        client,
        req.user.id,
        userId,
        update.isActive ? "teacher_account_enabled" : "teacher_account_disabled",
      );
    }
    await client.query("COMMIT");
    res.json(account);
  } catch (error) {
    if (client) await rollback(client);
    next(error);
  } finally {
    client?.release();
  }
};

export const deleteUser = async (req, res, next) => {
  const userId = req.params.userId.toLowerCase();
  if (!UUID_PATTERN.test(userId)) {
    res.status(400).json({ error: "Teacher account ID is invalid." });
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, display_name
       FROM app_users
       WHERE id = $1 AND role = 'teacher'
       FOR UPDATE`,
      [userId],
    );
    const teacher = rows[0];
    if (!teacher) {
      await rollback(client);
      res.status(404).json({ error: "Teacher account not found." });
      return;
    }

    await recordSecurityEvent(
      client,
      req.user.id,
      userId,
      "teacher_account_deleted",
    );
    await client.query(
      "DELETE FROM app_users WHERE id = $1 AND role = 'teacher'",
      [userId],
    );
    await client.query("COMMIT");
    res.json({ deleted: true });
  } catch (error) {
    if (client) await rollback(client);
    next(error);
  } finally {
    client?.release();
  }
};

export const rotateTeacherAccessKey = async (req, res, next) => {
  const userId = req.params.userId.toLowerCase();
  if (!UUID_PATTERN.test(userId)) {
    res.status(400).json({ error: "Teacher account ID is invalid." });
    return;
  }

  const generatedKey = generateAccessKey();
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE app_users
       SET access_key_id = $2, access_key_hash = $3, updated_at = NOW()
       WHERE id = $1 AND role = 'teacher'
       RETURNING id`,
      [userId, generatedKey.accessKeyId, generatedKey.accessKeyHash],
    );
    if (updated.rows.length === 0) {
      await rollback(client);
      res.status(404).json({ error: "Teacher account not found." });
      return;
    }
    await client.query("DELETE FROM auth_sessions WHERE user_id = $1", [userId]);
    await recordSecurityEvent(client, req.user.id, userId, "teacher_access_key_rotated");
    await client.query("COMMIT");
    res.json({
      accessKeyId: generatedKey.accessKeyId,
      accessKey: generatedKey.accessKey,
    });
  } catch (error) {
    if (client) await rollback(client);
    if (error.code === "23505") {
      res.status(409).json({ error: "A generated access key ID conflicted. Please try again." });
      return;
    }
    next(error);
  } finally {
    client?.release();
  }
};

export const rotateOwnAccessKey = async (req, res, next) => {
  const generatedKey = generateAccessKey();
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(
      `UPDATE app_users
       SET access_key_id = $2, access_key_hash = $3, updated_at = NOW()
       WHERE id = $1 AND role = 'admin'`,
      [req.user.id, generatedKey.accessKeyId, generatedKey.accessKeyHash],
    );
    await client.query(
      `DELETE FROM auth_sessions
       WHERE user_id = $1 AND token_hash <> $2`,
      [req.user.id, hashSessionToken(getSessionToken(req))],
    );
    await recordSecurityEvent(
      client,
      req.user.id,
      req.user.id,
      "admin_access_key_rotated",
    );
    await client.query("COMMIT");
    res.json({
      accessKeyId: generatedKey.accessKeyId,
      accessKey: generatedKey.accessKey,
    });
  } catch (error) {
    if (client) await rollback(client);
    if (error.code === "23505") {
      res.status(409).json({ error: "A generated access key ID conflicted. Please try again." });
      return;
    }
    next(error);
  } finally {
    client?.release();
  }
};

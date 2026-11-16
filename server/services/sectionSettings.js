const createSettingsError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

export const saveSectionSettings = async (client, sectionId, settings, workspaceId) => {
  await client.query("BEGIN");
  try {
    const configResult = await client.query(
      "SELECT term_dates, schedules FROM app_config WHERE workspace_id = $1 AND id = 1 FOR UPDATE",
      [workspaceId],
    );
    if (configResult.rows.length === 0) {
      throw new Error("App configuration row was not found.");
    }

    const result = { success: true };
    if (Object.hasOwn(settings, "termDates")) {
      const updated = await client.query(
        `UPDATE app_config
         SET term_dates = $1::jsonb, updated_at = NOW()
         WHERE workspace_id = $2 AND id = 1
         RETURNING term_dates`,
        [JSON.stringify(settings.termDates), workspaceId],
      );
      result.termDates = updated.rows[0].term_dates;
    }

    if (Object.hasOwn(settings, "schedule")) {
      const updated = await client.query(
        `UPDATE app_config
         SET schedules = jsonb_set(
               COALESCE(schedules, '{}'::jsonb),
               ARRAY[$1]::text[],
               $2::jsonb,
               TRUE
             ),
             updated_at = NOW()
         WHERE workspace_id = $3 AND id = 1
         RETURNING schedules -> $1 AS schedule`,
        [sectionId, JSON.stringify(settings.schedule), workspaceId],
      );
      result.schedule = updated.rows[0].schedule;
    }

    if (Object.hasOwn(settings, "holidays")) {
      await client.query("LOCK TABLE holidays IN SHARE ROW EXCLUSIVE MODE");
      const currentHolidays = await client.query(
        "SELECT id FROM holidays WHERE workspace_id = $1 FOR UPDATE",
        [workspaceId],
      );
      const currentIds = new Set(currentHolidays.rows.map(({ id }) => id));
      const requestedIds = settings.holidays
        .filter((holiday) => holiday.id !== undefined)
        .map((holiday) => holiday.id);
      if (requestedIds.some((id) => !currentIds.has(id))) {
        throw createSettingsError(
          "A custom holiday changed elsewhere. Reload the settings and try again.",
          409,
        );
      }

      await client.query(
        "DELETE FROM holidays WHERE workspace_id = $2 AND NOT (id = ANY($1::varchar[]))",
        [requestedIds, workspaceId],
      );
      const updates = settings.holidays.filter((holiday) => holiday.id !== undefined);
      if (updates.length > 0) {
        await client.query(
          `UPDATE holidays AS holiday
           SET date = requested.date, name = requested.name
           FROM jsonb_to_recordset($1::jsonb) AS requested(
             id VARCHAR(50), date DATE, name VARCHAR(255)
           )
           WHERE holiday.id = requested.id AND holiday.workspace_id = $2`,
          [JSON.stringify(updates), workspaceId],
        );
      }

      const inserts = settings.holidays.filter((holiday) => holiday.id === undefined);
      if (inserts.length > 0) {
        await client.query(
          `INSERT INTO holidays (workspace_id, date, name)
           SELECT $2, requested.date, requested.name
           FROM jsonb_to_recordset($1::jsonb) AS requested(
             date DATE, name VARCHAR(255)
           )`,
          [JSON.stringify(inserts), workspaceId],
        );
      }

      const savedHolidays = await client.query(
        `SELECT id, date, name, created_at FROM holidays
         WHERE workspace_id = $1 ORDER BY date ASC, id ASC`,
        [workspaceId],
      );
      result.holidays = savedHolidays.rows;
    }

    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to roll back settings transaction:", rollbackError);
    }
    throw error;
  }
};

import { pool, query } from "../config/db.js";
import { saveSectionConfiguration } from "../services/sectionConfiguration.js";
import { restoreSectionArchive } from "../services/sectionArchives.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const isValidSections = (sections) =>
  isObject(sections) &&
  Object.values(sections).every(
    (sectionList) =>
      Array.isArray(sectionList) &&
      sectionList.every((section) => typeof section === "string" && section.trim().length > 0),
  );

const isValidSectionCopies = (sectionCopies) =>
  sectionCopies === undefined ||
  (Array.isArray(sectionCopies) &&
    sectionCopies.every((sectionCopy) =>
      isObject(sectionCopy) &&
      typeof sectionCopy.sourceSectionId === "string" &&
      sectionCopy.sourceSectionId.trim().length > 0 &&
      typeof sectionCopy.targetSectionId === "string" &&
      sectionCopy.targetSectionId.trim().length > 0,
    ));

const isValidArchiveIds = (archiveIds) =>
  archiveIds === undefined ||
  (Array.isArray(archiveIds) &&
    archiveIds.every((archiveId) => typeof archiveId === "string" && archiveId.trim().length > 0));

export const getConfig = async (req, res, next) => {
  try {
    try {
      await query(
        "ALTER TABLE app_config ADD COLUMN IF NOT EXISTS app_subtitle TEXT DEFAULT 'Choose a year level and section to manage attendance'"
      );
    } catch (_) {}

    try {
      await query(
        "ALTER TABLE app_config ADD COLUMN IF NOT EXISTS app_logo TEXT DEFAULT ''"
      );
    } catch (_) {}

    const result = await query(
      "SELECT app_title, app_subtitle, app_logo, term_dates, sections, schedules FROM app_config WHERE id = 1"
    );

    if (result.rows.length === 0) {
      return res.json({
        appTitle: "Attendance System",
        appSubtitle: "Choose a year level and section to manage attendance",
        appLogo: "",
        termDates: {},
        sections: {},
        schedules: {},
      });
    }

    const row = result.rows[0];
    res.json({
      appTitle: row.app_title || "",
      appSubtitle: row.app_subtitle !== undefined && row.app_subtitle !== null ? row.app_subtitle : "Choose a year level and section to manage attendance",
      appLogo: row.app_logo || "",
      termDates: row.term_dates || {},
      sections: row.sections || {},
      schedules: row.schedules || {},
    });
  } catch (err) {
    next(err);
  }
};

export const updateAppTitle = async (req, res, next) => {
  try {
    const { title } = req.body;
    await query(
      "UPDATE app_config SET app_title = $1, updated_at = NOW() WHERE id = 1",
      [title || ""]
    );
    res.json({ success: true, appTitle: title });
  } catch (err) {
    next(err);
  }
};

export const updateAppSubtitle = async (req, res, next) => {
  try {
    const { subtitle } = req.body;
    try {
      await query(
        "ALTER TABLE app_config ADD COLUMN IF NOT EXISTS app_subtitle TEXT DEFAULT 'Choose a year level and section to manage attendance'"
      );
    } catch (_) {}
    await query(
      "UPDATE app_config SET app_subtitle = $1, updated_at = NOW() WHERE id = 1",
      [subtitle !== undefined ? subtitle : ""]
    );
    res.json({ success: true, appSubtitle: subtitle });
  } catch (err) {
    next(err);
  }
};

export const updateAppLogo = async (req, res, next) => {
  try {
    const { logo } = req.body;
    try {
      await query(
        "ALTER TABLE app_config ADD COLUMN IF NOT EXISTS app_logo TEXT DEFAULT ''"
      );
    } catch (_) {}
    await query(
      "UPDATE app_config SET app_logo = $1, updated_at = NOW() WHERE id = 1",
      [logo !== undefined ? logo : ""]
    );
    res.json({ success: true, appLogo: logo });
  } catch (err) {
    next(err);
  }
};

export const updateTermDates = async (req, res, next) => {
  try {
    const { termDates } = req.body;
    await query(
      "UPDATE app_config SET term_dates = $1::jsonb, updated_at = NOW() WHERE id = 1",
      [JSON.stringify(termDates || {})]
    );
    res.json({ success: true, termDates });
  } catch (err) {
    next(err);
  }
};

const persistSectionConfiguration = async (req, res, next, schedules, sectionCopies, archiveIds) => {
  const { sections } = req.body;
  if (
    !isValidSections(sections) ||
    (schedules !== undefined && !isObject(schedules)) ||
    !isValidSectionCopies(sectionCopies) ||
    !isValidArchiveIds(archiveIds)
  ) {
    return res.status(400).json({ error: "Valid sections and schedules are required" });
  }
  let client;
  try {
    client = await pool.connect();
    const result = await saveSectionConfiguration(
      client,
      sections,
      schedules,
      sectionCopies,
      archiveIds,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  } finally {
    client?.release();
  }
};

export const updateSections = (req, res, next) =>
  persistSectionConfiguration(req, res, next, undefined);

export const updateSectionConfiguration = (req, res, next) =>
  persistSectionConfiguration(
    req,
    res,
    next,
    req.body.schedules,
    req.body.sectionCopies,
    req.body.archiveIds,
  );

export const updateSchedules = async (req, res, next) => {
  try {
    const { schedules } = req.body;
    await query(
      "UPDATE app_config SET schedules = $1::jsonb, updated_at = NOW() WHERE id = 1",
      [JSON.stringify(schedules || {})]
    );
    res.json({ success: true, schedules });
  } catch (err) {
    next(err);
  }
};

export const getSectionArchives = async (req, res, next) => {
  try {
    await query("DELETE FROM section_archives WHERE expires_at <= NOW()");
    const result = await query(
      `SELECT id, section_id, year_level, archived_at, expires_at,
              jsonb_array_length(COALESCE(section_data->'students', '[]'::jsonb)) AS student_count,
              COALESCE(section_data->'schedule', '[]'::jsonb) AS schedule
       FROM section_archives
       WHERE expires_at > NOW()
       ORDER BY archived_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

export const restoreSectionArchiveController = async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const result = await restoreSectionArchive(client, req.params.archiveId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  } finally {
    client?.release();
  }
};

export const syncConfig = async (req, res, next) => {
  try {
    const { title, termDates, sections, schedules, sectionCopies, archiveIds } = req.body;
    if (sections !== undefined) {
      if (
        !isValidSections(sections) ||
        (schedules !== undefined && !isObject(schedules)) ||
        !isValidSectionCopies(sectionCopies) ||
        !isValidArchiveIds(archiveIds)
      ) {
        return res.status(400).json({ error: "Valid sections and schedules are required" });
      }
      let client;
      try {
        client = await pool.connect();
        await saveSectionConfiguration(client, sections, schedules, sectionCopies, archiveIds);
      } finally {
        client?.release();
      }
    }

    await query(
      `UPDATE app_config 
       SET app_title = COALESCE($1, app_title),
           term_dates = COALESCE($2::jsonb, term_dates),
           schedules = CASE WHEN $3::boolean THEN schedules ELSE COALESCE($4::jsonb, schedules) END,
           updated_at = NOW()
       WHERE id = 1`,
      [
        title !== undefined ? title : null,
        termDates !== undefined ? JSON.stringify(termDates) : null,
        sections !== undefined,
        schedules !== undefined ? JSON.stringify(schedules) : null,
      ]
    );
    res.json({ success: true, message: "Configuration synchronized successfully" });
  } catch (err) {
    next(err);
  }
};

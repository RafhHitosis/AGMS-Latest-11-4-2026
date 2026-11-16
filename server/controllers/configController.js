import { pool, query } from "../config/db.js";
import { saveSectionConfiguration } from "../services/sectionConfiguration.js";
import { restoreSectionArchive } from "../services/sectionArchives.js";
import { saveSectionSettings } from "../services/sectionSettings.js";
import { validateSectionSettingsUpdate } from "../../shared/settingsValidation.js";

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
    const result = await query(
      `SELECT app_title, app_subtitle, app_logo, term_dates, sections, schedules
       FROM app_config WHERE workspace_id = $1 AND id = 1`,
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.json({
        appTitle: "AGMS",
        appSubtitle: "Choose a year level and section to manage attendance and grades",
        appLogo: "",
        termDates: {},
        sections: {},
        schedules: {},
      });
    }

    const row = result.rows[0];
    res.json({
      appTitle: row.app_title || "AGMS",
      appSubtitle: row.app_subtitle || "Choose a year level and section to manage attendance and grades",
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
      "UPDATE app_config SET app_title = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = 1",
      [title || "", req.user.id]
    );
    res.json({ success: true, appTitle: title });
  } catch (err) {
    next(err);
  }
};

export const updateAppSubtitle = async (req, res, next) => {
  try {
    const { subtitle } = req.body;
    await query(
      "UPDATE app_config SET app_subtitle = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = 1",
      [subtitle !== undefined ? subtitle : "", req.user.id]
    );
    res.json({ success: true, appSubtitle: subtitle });
  } catch (err) {
    next(err);
  }
};

export const updateAppLogo = async (req, res, next) => {
  try {
    const { logo } = req.body;
    await query(
      "UPDATE app_config SET app_logo = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = 1",
      [logo !== undefined ? logo : "", req.user.id]
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
      "UPDATE app_config SET term_dates = $1::jsonb, updated_at = NOW() WHERE workspace_id = $2 AND id = 1",
      [JSON.stringify(termDates || {}), req.user.id]
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
      req.user.id,
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
      "UPDATE app_config SET schedules = $1::jsonb, updated_at = NOW() WHERE workspace_id = $2 AND id = 1",
      [JSON.stringify(schedules || {}), req.user.id]
    );
    res.json({ success: true, schedules });
  } catch (err) {
    next(err);
  }
};

export const updateSectionSchedule = async (req, res, next) => {
  const { sectionId } = req.params;
  const { schedule } = req.body || {};
  if (
    !Array.isArray(schedule) ||
    schedule.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    new Set(schedule).size !== schedule.length
  ) {
    res.status(400).json({ error: "Schedule must be a list of unique weekday values from 0 to 6." });
    return;
  }
  try {
    const result = await query(
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
      [sectionId, JSON.stringify(schedule), req.user.id],
    );
    if (result.rows.length === 0) {
      res.status(500).json({ error: "Application configuration is unavailable." });
      return;
    }
    res.json({ success: true, sectionId, schedule: result.rows[0].schedule });
  } catch (err) {
    next(err);
  }
};

export const updateSectionSettings = async (req, res, next) => {
  const { sectionId } = req.params;
  const settings = req.body || {};
  const validationError = validateSectionSettingsUpdate(settings);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  let client;
  try {
    client = await pool.connect();
    const result = await saveSectionSettings(client, sectionId, settings, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  } finally {
    client?.release();
  }
};

export const getSectionArchives = async (req, res, next) => {
  try {
    await query(
      "DELETE FROM section_archives WHERE workspace_id = $1 AND expires_at <= NOW()",
      [req.user.id],
    );
    const result = await query(
      `SELECT id, section_id, year_level, archived_at, expires_at,
              jsonb_array_length(COALESCE(section_data->'students', '[]'::jsonb)) AS student_count,
              COALESCE(section_data->'schedule', '[]'::jsonb) AS schedule
       FROM section_archives
       WHERE workspace_id = $1 AND expires_at > NOW()
       ORDER BY archived_at DESC`,
      [req.user.id],
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
    const result = await restoreSectionArchive(client, req.user.id, req.params.archiveId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  } finally {
    client?.release();
  }
};

import { query } from "../config/db.js";

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

export const updateSections = async (req, res, next) => {
  try {
    const { sections } = req.body;
    await query(
      "UPDATE app_config SET sections = $1::jsonb, updated_at = NOW() WHERE id = 1",
      [JSON.stringify(sections || {})]
    );
    res.json({ success: true, sections });
  } catch (err) {
    next(err);
  }
};

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

export const syncConfig = async (req, res, next) => {
  try {
    const { title, termDates, sections, schedules } = req.body;
    await query(
      `UPDATE app_config 
       SET app_title = COALESCE($1, app_title),
           term_dates = COALESCE($2::jsonb, term_dates),
           sections = COALESCE($3::jsonb, sections),
           schedules = COALESCE($4::jsonb, schedules),
           updated_at = NOW()
       WHERE id = 1`,
      [
        title !== undefined ? title : null,
        termDates !== undefined ? JSON.stringify(termDates) : null,
        sections !== undefined ? JSON.stringify(sections) : null,
        schedules !== undefined ? JSON.stringify(schedules) : null,
      ]
    );
    res.json({ success: true, message: "Configuration synchronized successfully" });
  } catch (err) {
    next(err);
  }
};

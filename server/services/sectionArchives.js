import { getSectionNamingErrors } from "../../shared/sectionNaming.js";

const createArchiveError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

export const restoreSectionArchiveRecords = async (
  client,
  archiveId,
  currentSections,
  requestedSections,
  requestedSchedules,
) => {
  const archiveResult = await client.query(
    `SELECT id, section_id, year_level, section_data, expires_at
     FROM section_archives
     WHERE id = $1 AND expires_at > NOW()
     FOR UPDATE`,
    [archiveId],
  );
  if (archiveResult.rows.length === 0) {
    throw createArchiveError("This section archive has expired or no longer exists.", 404);
  }

  const archive = archiveResult.rows[0];
  if (Object.values(currentSections).some((names) => names.includes(archive.section_id))) {
    throw createArchiveError(
      `Section "${archive.section_id}" is already configured. Remove or rename it before restoring this archive.`,
      409,
    );
  }
  if (!(requestedSections[archive.year_level] || []).includes(archive.section_id)) {
    throw createArchiveError(
      `Add section "${archive.section_id}" to ${archive.year_level} in the configuration before restoring it.`,
      400,
    );
  }
  const namingErrors = getSectionNamingErrors(requestedSections, currentSections);
  if (namingErrors.length > 0) {
    throw createArchiveError(namingErrors.join(" "), 409);
  }

  const sectionData = archive.section_data;
  const students = Array.isArray(sectionData.students) ? sectionData.students : [];
  const conflicts = await client.query(
    `SELECT
       EXISTS (SELECT 1 FROM students WHERE section_id = $1) AS students,
       EXISTS (SELECT 1 FROM attendance WHERE section_id = $1) AS attendance,
       EXISTS (SELECT 1 FROM grades WHERE section_id = $1) AS grades,
       EXISTS (SELECT 1 FROM grade_configs WHERE section_id = $1) AS grade_configs`,
    [archive.section_id],
  );
  if (Object.values(conflicts.rows[0]).some(Boolean)) {
    throw createArchiveError(
      `Section "${archive.section_id}" already has live records. Clear those records before restoring this archive.`,
      409,
    );
  }
  const studentConflicts = await client.query(
    "SELECT id FROM students WHERE id = ANY($1::varchar[])",
    [students.map((student) => student.id)],
  );
  if (studentConflicts.rows.length > 0) {
    throw createArchiveError(
      `Student records for section "${archive.section_id}" now conflict with existing records.`,
      409,
    );
  }

  await client.query(
    `INSERT INTO students (id, section_id, name, created_at)
     SELECT record.id, $2, record.name, record.created_at
     FROM jsonb_to_recordset($1::jsonb) AS record(
       id VARCHAR(50), name VARCHAR(255), created_at TIMESTAMPTZ
     )`,
    [JSON.stringify(students), archive.section_id],
  );
  await client.query(
    `INSERT INTO attendance (section_id, student_id, date, status, created_at)
     SELECT $2, record.student_id, record.date, record.status, record.created_at
     FROM jsonb_to_recordset($1::jsonb) AS record(
       student_id VARCHAR(50), date VARCHAR(10), status VARCHAR(20), created_at TIMESTAMPTZ
     )`,
    [JSON.stringify(sectionData.attendance || []), archive.section_id],
  );
  await client.query(
    `INSERT INTO grades (section_id, term, student_id, scores, updated_at)
     SELECT $2, record.term, record.student_id, record.scores, record.updated_at
     FROM jsonb_to_recordset($1::jsonb) AS record(
       term VARCHAR(20), student_id VARCHAR(50), scores JSONB, updated_at TIMESTAMPTZ
     )`,
    [JSON.stringify(sectionData.grades || []), archive.section_id],
  );
  await client.query(
    `INSERT INTO grade_configs (section_id, term, config, updated_at)
     SELECT $2, record.term, record.config, record.updated_at
     FROM jsonb_to_recordset($1::jsonb) AS record(
       term VARCHAR(20), config JSONB, updated_at TIMESTAMPTZ
     )`,
    [JSON.stringify(sectionData.gradeConfigs || []), archive.section_id],
  );
  await client.query("DELETE FROM section_archives WHERE id = $1", [archive.id]);

  return {
    sectionId: archive.section_id,
    yearLevel: archive.year_level,
    schedules: {
      ...requestedSchedules,
      [archive.section_id]: Array.isArray(sectionData.schedule) ? sectionData.schedule : [],
    },
  };
};

export const restoreSectionArchive = async (client, archiveId) => {
  await client.query("BEGIN");

  try {
    const archiveResult = await client.query(
      `SELECT id, section_id, year_level, section_data, expires_at
       FROM section_archives
       WHERE id = $1 AND expires_at > NOW()
       FOR UPDATE`,
      [archiveId],
    );
    if (archiveResult.rows.length === 0) {
      throw createArchiveError("This section archive has expired or no longer exists.", 404);
    }

    const archive = archiveResult.rows[0];
    const configResult = await client.query(
      "SELECT sections, schedules FROM app_config WHERE id = 1 FOR UPDATE",
    );
    if (configResult.rows.length === 0) {
      throw new Error("App configuration row was not found");
    }

    const currentSections = configResult.rows[0].sections || {};
    const isSectionActive = Object.values(currentSections)
      .some((sectionNames) => sectionNames.includes(archive.section_id));
    if (isSectionActive) {
      throw createArchiveError(
        `Section "${archive.section_id}" is already configured. Remove or rename it before restoring this archive.`,
        409,
      );
    }

    const sectionDataConflicts = await client.query(
      `SELECT
         EXISTS (SELECT 1 FROM students WHERE section_id = $1) AS students,
         EXISTS (SELECT 1 FROM attendance WHERE section_id = $1) AS attendance,
         EXISTS (SELECT 1 FROM grades WHERE section_id = $1) AS grades,
         EXISTS (SELECT 1 FROM grade_configs WHERE section_id = $1) AS grade_configs`,
      [archive.section_id],
    );
    if (Object.values(sectionDataConflicts.rows[0]).some(Boolean)) {
      throw createArchiveError(
        `Section "${archive.section_id}" already has live records. Clear those records before restoring this archive.`,
        409,
      );
    }

    const sectionData = archive.section_data;
    const students = Array.isArray(sectionData.students) ? sectionData.students : [];
    const studentIds = students.map((student) => student.id);
    const studentConflicts = await client.query(
      "SELECT id FROM students WHERE id = ANY($1::varchar[])",
      [studentIds],
    );
    if (studentConflicts.rows.length > 0) {
      throw createArchiveError(
        `Student records for section "${archive.section_id}" now conflict with existing records.`,
        409,
      );
    }

    const restoredSections = {
      ...currentSections,
      [archive.year_level]: [
        ...(currentSections[archive.year_level] || []),
        archive.section_id,
      ],
    };
    const namingErrors = getSectionNamingErrors(restoredSections, currentSections);
    if (namingErrors.length > 0) {
      throw createArchiveError(namingErrors.join(" "), 409);
    }

    await client.query(
      `INSERT INTO students (id, section_id, name, created_at)
       SELECT record.id, $2, record.name, record.created_at
       FROM jsonb_to_recordset($1::jsonb) AS record(
         id VARCHAR(50), name VARCHAR(255), created_at TIMESTAMPTZ
       )`,
      [JSON.stringify(students), archive.section_id],
    );
    await client.query(
      `INSERT INTO attendance (section_id, student_id, date, status, created_at)
       SELECT $2, record.student_id, record.date, record.status, record.created_at
       FROM jsonb_to_recordset($1::jsonb) AS record(
         student_id VARCHAR(50), date VARCHAR(10), status VARCHAR(20), created_at TIMESTAMPTZ
       )`,
      [JSON.stringify(sectionData.attendance || []), archive.section_id],
    );
    await client.query(
      `INSERT INTO grades (section_id, term, student_id, scores, updated_at)
       SELECT $2, record.term, record.student_id, record.scores, record.updated_at
       FROM jsonb_to_recordset($1::jsonb) AS record(
         term VARCHAR(20), student_id VARCHAR(50), scores JSONB, updated_at TIMESTAMPTZ
       )`,
      [JSON.stringify(sectionData.grades || []), archive.section_id],
    );
    await client.query(
      `INSERT INTO grade_configs (section_id, term, config, updated_at)
       SELECT $2, record.term, record.config, record.updated_at
       FROM jsonb_to_recordset($1::jsonb) AS record(
         term VARCHAR(20), config JSONB, updated_at TIMESTAMPTZ
       )`,
      [JSON.stringify(sectionData.gradeConfigs || []), archive.section_id],
    );

    const restoredSchedules = { ...(configResult.rows[0].schedules || {}) };
    restoredSchedules[archive.section_id] = Array.isArray(sectionData.schedule)
      ? sectionData.schedule
      : [];
    await client.query(
      `UPDATE app_config
       SET sections = $1::jsonb, schedules = $2::jsonb, updated_at = NOW()
       WHERE id = 1`,
      [JSON.stringify(restoredSections), JSON.stringify(restoredSchedules)],
    );
    await client.query("DELETE FROM section_archives WHERE id = $1", [archive.id]);
    await client.query("COMMIT");

    return {
      sectionId: archive.section_id,
      yearLevel: archive.year_level,
      expiresAt: archive.expires_at,
      sections: restoredSections,
      schedules: restoredSchedules,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to roll back section archive restoration:", rollbackError);
    }
    throw error;
  }
};

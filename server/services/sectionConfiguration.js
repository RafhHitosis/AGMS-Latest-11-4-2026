import { getSectionNamingErrors } from "../../shared/sectionNaming.js";
import { restoreSectionArchiveRecords } from "./sectionArchives.js";

const getSectionNames = (sections) =>
  [...new Set(Object.values(sections || {}).flat().filter((section) => typeof section === "string"))];

const createArchiveConflictError = (section) =>
  Object.assign(
    new Error(`Section "${section}" has recoverable data. Restore it or wait for its 30-day archive to expire before reusing the name.`),
    { statusCode: 409 },
  );

export const saveSectionConfiguration = async (
  client,
  sections,
  schedules,
  sectionCopies = [],
  archiveIds = [],
) => {
  await client.query("BEGIN");

  try {
    if (
      !Array.isArray(sectionCopies) ||
      !Array.isArray(archiveIds) ||
      archiveIds.some((id) => typeof id !== "string" || id.trim().length === 0) ||
      new Set(archiveIds).size !== archiveIds.length ||
      sectionCopies.some((copy) =>
        !copy ||
        typeof copy !== "object" ||
        Array.isArray(copy) ||
        typeof copy.sourceSectionId !== "string" ||
        copy.sourceSectionId.trim().length === 0 ||
        typeof copy.targetSectionId !== "string" ||
        copy.targetSectionId.trim().length === 0,
      )
    ) {
      throw Object.assign(new Error("Invalid section data copy request."), { statusCode: 400 });
    }
    const copyTargets = sectionCopies.map(({ targetSectionId }) => targetSectionId);
    if (new Set(copyTargets).size !== copyTargets.length) {
      throw Object.assign(new Error("Invalid section data copy request."), { statusCode: 400 });
    }

    const currentConfig = await client.query(
      "SELECT sections, schedules FROM app_config WHERE id = 1 FOR UPDATE",
    );
    if (currentConfig.rows.length === 0) {
      throw new Error("App configuration row was not found");
    }

    const currentSections = currentConfig.rows[0].sections || {};
    let requestedSchedules = schedules ?? currentConfig.rows[0].schedules ?? {};
    const namingErrors = getSectionNamingErrors(sections, currentSections);
    if (namingErrors.length > 0) {
      throw Object.assign(new Error(namingErrors.join(" ")), { statusCode: 400 });
    }

    const restoredSections = [];
    for (const archiveId of archiveIds) {
      const restored = await restoreSectionArchiveRecords(
        client,
        archiveId,
        currentSections,
        sections,
        requestedSchedules,
      );
      requestedSchedules = restored.schedules;
      restoredSections.push(restored);
    }

    const nextSchedules = requestedSchedules;
    const activeSectionNames = new Set(getSectionNames(sections));
    const removedSections = getSectionNames(currentSections).filter(
      (section) => !activeSectionNames.has(section),
    );
    const currentSectionNames = new Set(getSectionNames(currentSections));
    const addedSections = [...activeSectionNames].filter(
      (section) => !currentSectionNames.has(section),
    );
    const archivedSections = await client.query(
      `SELECT id, section_id
       FROM section_archives
       WHERE section_id = ANY($1::varchar[]) AND expires_at > NOW()`,
      [addedSections],
    );
    const conflictingArchive = archivedSections.rows.find(
      (archive) => !archiveIds.includes(archive.id),
    );
    if (conflictingArchive) {
      throw createArchiveConflictError(conflictingArchive.section_id);
    }

    const cleanedSchedules = Object.fromEntries(
      Object.entries(nextSchedules).filter(([section]) => activeSectionNames.has(section)),
    );
    let hasStudentCopyMap = false;

    for (const { sourceSectionId, targetSectionId } of sectionCopies) {
      if (
        sourceSectionId === targetSectionId ||
        !currentSectionNames.has(sourceSectionId) ||
        !activeSectionNames.has(sourceSectionId) ||
        currentSectionNames.has(targetSectionId) ||
        !activeSectionNames.has(targetSectionId)
      ) {
        throw Object.assign(new Error("Invalid section data copy request."), { statusCode: 400 });
      }

      const targetHasData = await client.query(
        `SELECT
           EXISTS (SELECT 1 FROM students WHERE section_id = $1) AS students,
           EXISTS (SELECT 1 FROM attendance WHERE section_id = $1) AS attendance,
           EXISTS (SELECT 1 FROM grades WHERE section_id = $1) AS grades,
           EXISTS (SELECT 1 FROM grade_configs WHERE section_id = $1) AS grade_configs`,
        [targetSectionId],
      );
      if (Object.values(targetHasData.rows[0]).some(Boolean)) {
        throw Object.assign(
          new Error(`Section "${targetSectionId}" already has records and cannot receive copied data.`),
          { statusCode: 409 },
        );
      }

      if (!hasStudentCopyMap) {
        await client.query(
          `CREATE TEMP TABLE section_student_copy_map (
             source_section_id VARCHAR(50) NOT NULL,
             target_section_id VARCHAR(50) NOT NULL,
             source_student_id VARCHAR(50) NOT NULL,
             target_student_id VARCHAR(50) NOT NULL
           ) ON COMMIT DROP`,
        );
        hasStudentCopyMap = true;
      }

      await client.query(
        `INSERT INTO section_student_copy_map
         SELECT $1, $2, id, gen_random_uuid()::text
         FROM students
         WHERE section_id = $1`,
        [sourceSectionId, targetSectionId],
      );
      await client.query(
        `INSERT INTO students (id, section_id, name, created_at)
         SELECT copy.target_student_id, $2, source.name, source.created_at
         FROM section_student_copy_map AS copy
         JOIN students AS source
           ON source.id = copy.source_student_id AND source.section_id = copy.source_section_id
         WHERE copy.source_section_id = $1 AND copy.target_section_id = $2`,
        [sourceSectionId, targetSectionId],
      );
      await client.query(
        `INSERT INTO attendance (section_id, student_id, date, status, created_at)
         SELECT $2, copy.target_student_id, source.date, source.status, source.created_at
         FROM attendance AS source
         JOIN section_student_copy_map AS copy
           ON copy.source_section_id = source.section_id AND copy.source_student_id = source.student_id
         WHERE copy.source_section_id = $1 AND copy.target_section_id = $2`,
        [sourceSectionId, targetSectionId],
      );
      await client.query(
        `INSERT INTO grades (section_id, term, student_id, scores, updated_at)
         SELECT $2, source.term, copy.target_student_id, source.scores, source.updated_at
         FROM grades AS source
         JOIN section_student_copy_map AS copy
           ON copy.source_section_id = source.section_id AND copy.source_student_id = source.student_id
         WHERE copy.source_section_id = $1 AND copy.target_section_id = $2`,
        [sourceSectionId, targetSectionId],
      );
      await client.query(
        `INSERT INTO grade_configs (section_id, term, config, updated_at)
         SELECT $2, term, config, updated_at
         FROM grade_configs
         WHERE section_id = $1`,
        [sourceSectionId, targetSectionId],
      );
      if (!Object.hasOwn(cleanedSchedules, targetSectionId)) {
        cleanedSchedules[targetSectionId] = currentConfig.rows[0].schedules?.[sourceSectionId] || [];
      }
    }

    for (const section of removedSections) {
      const yearLevel = Object.entries(currentSections).find(
        ([, sectionNames]) => sectionNames.includes(section),
      )?.[0];
      const students = await client.query(
        "SELECT id, section_id, name, created_at FROM students WHERE section_id = $1",
        [section],
      );
      const attendance = await client.query(
        "SELECT section_id, student_id, date, status, created_at FROM attendance WHERE section_id = $1",
        [section],
      );
      const grades = await client.query(
        "SELECT section_id, term, student_id, scores, updated_at FROM grades WHERE section_id = $1",
        [section],
      );
      const gradeConfigs = await client.query(
        "SELECT section_id, term, config, updated_at FROM grade_configs WHERE section_id = $1",
        [section],
      );
      const sectionData = {
        students: students.rows,
        attendance: attendance.rows,
        grades: grades.rows,
        gradeConfigs: gradeConfigs.rows,
        schedule: currentConfig.rows[0].schedules?.[section] || [],
      };

      await client.query(
        `INSERT INTO section_archives (section_id, year_level, section_data, expires_at)
         VALUES ($1, $2, $3::jsonb, NOW() + INTERVAL '30 days')`,
        [section, yearLevel || "", JSON.stringify(sectionData)],
      );
      await client.query("DELETE FROM attendance WHERE section_id = $1", [section]);
      await client.query("DELETE FROM grades WHERE section_id = $1", [section]);
      await client.query("DELETE FROM students WHERE section_id = $1", [section]);
      await client.query("DELETE FROM grade_configs WHERE section_id = $1", [section]);
    }

    const updatedConfig = await client.query(
      `UPDATE app_config
       SET sections = $1::jsonb, schedules = $2::jsonb, updated_at = NOW()
       WHERE id = 1
       RETURNING sections, schedules`,
      [JSON.stringify(sections), JSON.stringify(cleanedSchedules)],
    );
    if (updatedConfig.rows.length === 0) {
      throw new Error("App configuration row was not found");
    }

    await client.query("COMMIT");
    return {
      sections: updatedConfig.rows[0].sections,
      schedules: updatedConfig.rows[0].schedules,
      deletedSections: removedSections,
      restoredSections,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to roll back section configuration transaction:", rollbackError);
    }
    throw error;
  }
};

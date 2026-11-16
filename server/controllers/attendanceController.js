import { query } from "../config/db.js";
import { isValidDateRange } from "../../shared/termDates.js";

export const getAttendanceBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { startDate, endDate } = req.query;
    const hasDateRange = startDate !== undefined || endDate !== undefined;
    if (hasDateRange && !isValidDateRange(startDate, endDate)) {
      return res.status(400).json({ error: "Valid startDate and endDate are required." });
    }

    const result = hasDateRange
      ? await query(
        "SELECT student_id, date FROM attendance WHERE workspace_id = $1 AND section_id = $2 AND date BETWEEN $3 AND $4",
        [req.user.id, sectionId, startDate, endDate]
      )
      : await query(
        "SELECT student_id, date FROM attendance WHERE workspace_id = $1 AND section_id = $2",
        [req.user.id, sectionId]
      );

    // Group into the exact map format the frontend expects: { [dateKey]: { [studentId]: true } }
    const attendanceMap = {};
    for (const row of result.rows) {
      if (!attendanceMap[row.date]) {
        attendanceMap[row.date] = {};
      }
      attendanceMap[row.date][row.student_id] = true;
    }

    res.json(attendanceMap);
  } catch (err) {
    next(err);
  }
};

export const toggleAttendance = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { studentId, date } = req.body || {};

    if (
      typeof studentId !== "string" ||
      studentId.length === 0 ||
      studentId.length > 50 ||
      !isValidDateRange(date, date)
    ) {
      return res.status(400).json({ error: "A valid studentId and date are required." });
    }

    const existing = await query(
      `SELECT attendance.id
       FROM students
       LEFT JOIN attendance
         ON attendance.workspace_id = students.workspace_id
        AND attendance.section_id = students.section_id
        AND attendance.student_id = students.id
        AND attendance.date = $4
       WHERE students.workspace_id = $1 AND students.section_id = $2 AND students.id = $3`,
      [req.user.id, sectionId, studentId, date]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Student not found in this section." });
    }

    if (existing.rows[0].id !== null) {
      // Remove absence -> student is now present
      await query(
        "DELETE FROM attendance WHERE workspace_id = $1 AND section_id = $2 AND student_id = $3 AND date = $4",
        [req.user.id, sectionId, studentId, date]
      );
      return res.json({
        success: true,
        studentId,
        date,
        isAbsent: false,
      });
    } else {
      // Insert absence -> student is absent
      await query(
        "INSERT INTO attendance (workspace_id, section_id, student_id, date, status) VALUES ($1, $2, $3, $4, 'absent') ON CONFLICT DO NOTHING",
        [req.user.id, sectionId, studentId, date]
      );
      return res.json({
        success: true,
        studentId,
        date,
        isAbsent: true,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const setAttendance = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { studentId, date, isAbsent } = req.body || {};

    if (
      typeof studentId !== "string" ||
      studentId.length === 0 ||
      studentId.length > 50 ||
      !isValidDateRange(date, date) ||
      typeof isAbsent !== "boolean"
    ) {
      return res.status(400).json({ error: "studentId, a valid date, and isAbsent are required." });
    }

    if (isAbsent) {
      const result = await query(
        `INSERT INTO attendance (workspace_id, section_id, student_id, date, status)
         SELECT students.workspace_id, students.section_id, students.id, $4, 'absent'
         FROM students
         WHERE students.workspace_id = $1 AND students.section_id = $2 AND students.id = $3
         ON CONFLICT (workspace_id, section_id, student_id, date) DO NOTHING
         RETURNING id`,
        [req.user.id, sectionId, studentId, date]
      );
      if (result.rows.length === 0) {
        const student = await query(
          "SELECT 1 FROM students WHERE workspace_id = $1 AND section_id = $2 AND id = $3",
          [req.user.id, sectionId, studentId]
        );
        if (student.rows.length === 0) {
          return res.status(404).json({ error: "Student not found in this section." });
        }
      }
    } else {
      const result = await query(
        `DELETE FROM attendance AS a
         USING students AS s
         WHERE a.workspace_id = $1
           AND a.section_id = $2
           AND a.student_id = $3
           AND a.date = $4
           AND s.workspace_id = a.workspace_id
           AND s.section_id = a.section_id
           AND s.id = a.student_id
         RETURNING a.id`,
        [req.user.id, sectionId, studentId, date]
      );
      if (result.rows.length === 0) {
        const student = await query(
          "SELECT 1 FROM students WHERE workspace_id = $1 AND section_id = $2 AND id = $3",
          [req.user.id, sectionId, studentId]
        );
        if (student.rows.length === 0) {
          return res.status(404).json({ error: "Student not found in this section." });
        }
      }
    }

    res.json({ success: true, studentId, date, isAbsent });
  } catch (err) {
    next(err);
  }
};

export const resetAttendanceBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { startDate, endDate } = req.body || {};
    if (!isValidDateRange(startDate, endDate)) {
      return res.status(400).json({ error: "Valid startDate and endDate are required." });
    }

    const result = await query(
      "DELETE FROM attendance WHERE workspace_id = $1 AND section_id = $2 AND date BETWEEN $3 AND $4",
      [req.user.id, sectionId, startDate, endDate]
    );
    res.json({
      success: true,
      deletedCount: result.rowCount,
      message: `Attendance reset for section ${sectionId} between ${startDate} and ${endDate}`,
    });
  } catch (err) {
    next(err);
  }
};

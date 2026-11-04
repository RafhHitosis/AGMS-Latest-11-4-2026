import { query } from "../config/db.js";

export const getAttendanceBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const result = await query(
      "SELECT student_id, date FROM attendance WHERE section_id = $1",
      [sectionId]
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
    const { studentId, date } = req.body;

    if (!studentId || !date) {
      return res.status(400).json({ error: "studentId and date are required" });
    }

    // Check if attendance record (absent) already exists
    const existing = await query(
      "SELECT id FROM attendance WHERE section_id = $1 AND student_id = $2 AND date = $3",
      [sectionId, studentId, date]
    );

    if (existing.rows.length > 0) {
      // Remove absence -> student is now present
      await query(
        "DELETE FROM attendance WHERE section_id = $1 AND student_id = $2 AND date = $3",
        [sectionId, studentId, date]
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
        "INSERT INTO attendance (section_id, student_id, date, status) VALUES ($1, $2, $3, 'absent') ON CONFLICT DO NOTHING",
        [sectionId, studentId, date]
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

export const resetAttendanceBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    await query("DELETE FROM attendance WHERE section_id = $1", [sectionId]);
    res.json({
      success: true,
      message: `Attendance reset for section ${sectionId}`,
    });
  } catch (err) {
    next(err);
  }
};

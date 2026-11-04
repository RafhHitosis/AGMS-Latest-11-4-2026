import { Router } from "express";
import {
  getAttendanceBySection,
  toggleAttendance,
  resetAttendanceBySection,
} from "../controllers/attendanceController.js";

const router = Router();

router.get("/:sectionId/attendance", getAttendanceBySection);
router.post("/:sectionId/attendance/toggle", toggleAttendance);
router.delete("/:sectionId/attendance", resetAttendanceBySection);

export default router;

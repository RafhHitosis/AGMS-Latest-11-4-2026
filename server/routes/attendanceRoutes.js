import { Router } from "express";
import {
  getAttendanceBySection,
  setAttendance,
  toggleAttendance,
  resetAttendanceBySection,
} from "../controllers/attendanceController.js";
import { requireSectionAccess } from "../middleware/requireAuth.js";

const router = Router();

router.use("/:sectionId", requireSectionAccess);
router.get("/:sectionId/attendance", getAttendanceBySection);
router.post("/:sectionId/attendance/set", setAttendance);
router.post("/:sectionId/attendance/toggle", toggleAttendance);
router.delete("/:sectionId/attendance", resetAttendanceBySection);

export default router;

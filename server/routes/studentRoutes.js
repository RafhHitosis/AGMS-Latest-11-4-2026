import { Router } from "express";
import {
  getStudentsBySection,
  addStudent,
  batchAddStudents,
  updateStudent,
  deleteStudent,
  deleteAllStudentsBySection,
} from "../controllers/studentController.js";
import { requireSectionAccess } from "../middleware/requireAuth.js";

const router = Router();

router.use("/:sectionId", requireSectionAccess);
router.get("/:sectionId/students", getStudentsBySection);
router.post("/:sectionId/students", addStudent);
router.post("/:sectionId/students/batch", batchAddStudents);
router.put("/:sectionId/students/:id", updateStudent);
router.delete("/:sectionId/students/:id", deleteStudent);
router.delete("/:sectionId/students", deleteAllStudentsBySection);

export default router;

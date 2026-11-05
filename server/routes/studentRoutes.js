import { Router } from "express";
import {
  getStudentsBySection,
  addStudent,
  batchAddStudents,
  updateStudent,
  deleteStudent,
  deleteAllStudentsBySection,
} from "../controllers/studentController.js";

const router = Router();

router.get("/:sectionId/students", getStudentsBySection);
router.post("/:sectionId/students", addStudent);
router.post("/:sectionId/students/batch", batchAddStudents);
router.put("/:sectionId/students/:id", updateStudent);
router.delete("/:sectionId/students/:id", deleteStudent);
router.delete("/:sectionId/students", deleteAllStudentsBySection);

export default router;

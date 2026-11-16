import { Router } from "express";
import {
  getGradeData,
  saveGradeConfig,
  updateStudentScore,
  batchUpdateScores,
  resetGrades,
} from "../controllers/gradeController.js";
import { requireSectionAccess } from "../middleware/requireAuth.js";

const router = Router();

router.use("/:sectionId", requireSectionAccess);
router.get("/:sectionId/grades", getGradeData);
router.put("/:sectionId/grades/config", saveGradeConfig);
router.put("/:sectionId/grades/scores", updateStudentScore);
router.post("/:sectionId/grades/batch", batchUpdateScores);
router.delete("/:sectionId/grades", resetGrades);

export default router;

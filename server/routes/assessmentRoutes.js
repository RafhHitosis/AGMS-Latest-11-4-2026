import { Router } from "express";
import {
  getAssessmentsBySection,
  createAssessment,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  getAssessmentSubmissions,
  gradeSubmission,
  syncAssessmentToGrades,
  getRecitationLogs,
  recordRecitationScore,
} from "../controllers/assessmentController.js";
import { requireSectionAccess } from "../middleware/requireAuth.js";

const router = Router();

router.use("/:sectionId", requireSectionAccess);

router.get("/:sectionId/assessments", getAssessmentsBySection);
router.post("/:sectionId/assessments", createAssessment);
router.get("/:sectionId/assessments/:id", getAssessmentById);
router.put("/:sectionId/assessments/:id", updateAssessment);
router.delete("/:sectionId/assessments/:id", deleteAssessment);
router.get("/:sectionId/assessments/:id/submissions", getAssessmentSubmissions);
router.put("/:sectionId/assessments/:id/submissions/:submissionId/grade", gradeSubmission);
router.post("/:sectionId/assessments/:id/sync-grades", syncAssessmentToGrades);
router.get("/:sectionId/assessments/:id/recitations", getRecitationLogs);
router.post("/:sectionId/assessments/:id/recitations", recordRecitationScore);

export default router;

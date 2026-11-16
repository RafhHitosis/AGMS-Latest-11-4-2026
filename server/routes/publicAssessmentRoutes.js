import { Router } from "express";
import {
  getPublicAssessmentAvailability,
  getPublicAssessment,
  savePublicAssessmentAttempt,
  submitPublicAssessment,
  submitPublicAssessmentAttempt,
  startPublicAssessmentAttempt,
} from "../controllers/publicAssessmentController.js";

const router = Router();

router.get("/availability", getPublicAssessmentAvailability);
router.get("/:accessCode", getPublicAssessment);
router.post("/:accessCode/attempts", startPublicAssessmentAttempt);
router.put("/:accessCode/attempts/:attemptId", savePublicAssessmentAttempt);
router.post("/:accessCode/attempts/:attemptId/submit", submitPublicAssessmentAttempt);
router.post("/:accessCode/submit", submitPublicAssessment);

export default router;

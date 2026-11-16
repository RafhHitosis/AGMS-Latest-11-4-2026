import { Router } from "express";
import {
  getConfig,
  updateAppTitle,
  updateAppSubtitle,
  updateAppLogo,
  updateTermDates,
  updateSections,
  updateSectionConfiguration,
  updateSchedules,
  updateSectionSchedule,
  updateSectionSettings,
  getSectionArchives,
  restoreSectionArchiveController,
} from "../controllers/configController.js";
import { requireSectionAccess } from "../middleware/requireAuth.js";

const router = Router();

router.get("/", getConfig);
router.get("/section-archives", getSectionArchives);
router.post("/section-archives/:archiveId/restore", restoreSectionArchiveController);
router.put("/settings/:sectionId", requireSectionAccess, updateSectionSettings);
router.put("/schedules/:sectionId", requireSectionAccess, updateSectionSchedule);
router.put("/title", updateAppTitle);
router.put("/subtitle", updateAppSubtitle);
router.put("/logo", updateAppLogo);
router.put("/term-dates", updateTermDates);
router.put("/sections", updateSections);
router.put("/section-configuration", updateSectionConfiguration);
router.put("/schedules", updateSchedules);

export default router;

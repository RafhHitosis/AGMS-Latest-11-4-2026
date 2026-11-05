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
  getSectionArchives,
  restoreSectionArchiveController,
  syncConfig,
} from "../controllers/configController.js";

const router = Router();

router.get("/", getConfig);
router.put("/title", updateAppTitle);
router.put("/subtitle", updateAppSubtitle);
router.put("/logo", updateAppLogo);
router.put("/term-dates", updateTermDates);
router.put("/sections", updateSections);
router.put("/section-configuration", updateSectionConfiguration);
router.put("/schedules", updateSchedules);
router.get("/section-archives", getSectionArchives);
router.post("/section-archives/:archiveId/restore", restoreSectionArchiveController);
router.post("/sync", syncConfig);

export default router;

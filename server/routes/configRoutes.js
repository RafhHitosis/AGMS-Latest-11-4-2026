import { Router } from "express";
import {
  getConfig,
  updateAppTitle,
  updateAppSubtitle,
  updateAppLogo,
  updateTermDates,
  updateSections,
  updateSchedules,
  syncConfig,
} from "../controllers/configController.js";

const router = Router();

router.get("/", getConfig);
router.put("/title", updateAppTitle);
router.put("/subtitle", updateAppSubtitle);
router.put("/logo", updateAppLogo);
router.put("/term-dates", updateTermDates);
router.put("/sections", updateSections);
router.put("/schedules", updateSchedules);
router.post("/sync", syncConfig);

export default router;

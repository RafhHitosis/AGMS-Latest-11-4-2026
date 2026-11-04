import { Router } from "express";
import {
  getHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holidayController.js";

const router = Router();

router.get("/", getHolidays);
router.post("/", addHoliday);
router.put("/:id", updateHoliday);
router.delete("/:id", deleteHoliday);

export default router;

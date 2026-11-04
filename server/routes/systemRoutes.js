import { Router } from "express";
import { healthCheck, resetDatabase } from "../controllers/systemController.js";

const router = Router();

router.get("/health", healthCheck);
router.post("/reset-database", resetDatabase);

export default router;

import { Router } from "express";
import configRoutes from "./configRoutes.js";
import studentRoutes from "./studentRoutes.js";
import attendanceRoutes from "./attendanceRoutes.js";
import holidayRoutes from "./holidayRoutes.js";
import systemRoutes from "./systemRoutes.js";
import gradeRoutes from "./gradeRoutes.js";
import assessmentRoutes from "./assessmentRoutes.js";
import adminRoutes from "./adminRoutes.js";
import { healthCheck, resetDatabase } from "../controllers/systemController.js";

const router = Router();

// Root health check endpoint
router.get("/health", healthCheck);
router.post("/reset-database", resetDatabase);

// Sub-modules
router.use("/config", configRoutes);
router.use("/sections", studentRoutes);
router.use("/sections", attendanceRoutes);
router.use("/sections", gradeRoutes);
router.use("/sections", assessmentRoutes);
router.use("/holidays", holidayRoutes);
router.use("/system", systemRoutes);
router.use("/admin", adminRoutes);

export default router;

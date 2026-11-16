import { Router } from "express";
import {
  createUser,
  deleteUser,
  listUsers,
  rotateOwnAccessKey,
  rotateTeacherAccessKey,
  updateUser,
} from "../controllers/adminController.js";
import { setAdminRecoveryQuestions } from "../controllers/adminRecoveryController.js";
import { requireRole } from "../middleware/requireAuth.js";

const router = Router();

router.use(requireRole("admin"));
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:userId", updateUser);
router.delete("/users/:userId", deleteUser);
router.post("/users/:userId/access-key", rotateTeacherAccessKey);
router.post("/me/access-key", rotateOwnAccessKey);
router.put("/me/recovery-questions", setAdminRecoveryQuestions);

export default router;

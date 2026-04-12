import { Router } from "express";
import { AuthController } from "../modules/auth/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/require-role.middleware";

const router = Router();

// Auth
router.post("/auth/register-company", AuthController.registerCompany);
router.post("/auth/login", AuthController.login);

// Example protected route
// router.get(
//   "/api/admin-only",
//   authMiddleware,
//   requireRole(["super_admin", "admin"]),
//   (_req, res) => {
//     res.json({
//       success: true,
//       message: "Welcome admin",
//     });
//   },
// );

export default router;

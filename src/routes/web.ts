import { Router } from "express";
import { AuthController } from "../modules/auth/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/require-role.middleware";

const router = Router();

// Auth
router.post("/auth/register-company", AuthController.registerCompany);
router.post("/auth/login", AuthController.login);
router.post("/auth/refresh", AuthController.refreshToken);
router.post("/auth/logout", AuthController.logout);

// Profile
router.get("/profile", authMiddleware, AuthController.profile);

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

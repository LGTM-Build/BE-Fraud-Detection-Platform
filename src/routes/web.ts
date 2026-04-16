import { Router } from "express";
import { AuthController } from "../modules/auth/auth.controller";
import { UserController } from "../modules/users/user.controller";
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

// User
router.get(
  "/api/users",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  UserController.list,
);

router.get(
  "/api/users/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  UserController.detail,
);

router.post(
  "/api/users",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  UserController.create,
);

router.put(
  "/api/users/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  UserController.update,
);

router.patch(
  "/api/users/:id/toggle-active",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  UserController.toggleActive,
);

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

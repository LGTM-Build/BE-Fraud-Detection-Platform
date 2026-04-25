import { Router } from "express";
import { AuthController } from "../modules/auth/auth.controller";
import { UserController } from "../modules/users/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { internalApiKeyMiddleware } from "../middlewares/internal-api-key.middleware";
import { requireRole } from "../middlewares/require-role.middleware";
import { EmployeeController } from "../modules/employees/employee.controller";
import { VendorController } from "../modules/vendors/vendor.controller";
import { AuditLogController } from "../modules/audit-logs/audit-log.controller";
import { ProcurementController } from "../modules/procurement/procurement.controller";
import { FraudIntegrationController } from "../modules/integrations/fraud/fraud.controller";

const router = Router();

// Auth
router.post("/auth/register-company", AuthController.registerCompany);
router.post("/auth/login", AuthController.login);
router.post("/auth/refresh", AuthController.refreshToken);
router.post("/auth/logout", AuthController.logout);

// Profile
router.get(
  "/api/profile",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  AuthController.profile,
);

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

// Employees
router.get(
  "/api/employees",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  EmployeeController.list,
);

router.get(
  "/api/employees/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  EmployeeController.detail,
);

router.post(
  "/api/employees",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  EmployeeController.create,
);

router.put(
  "/api/employees/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  EmployeeController.update,
);

// Vendors
router.get(
  "/api/vendors",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  VendorController.list,
);

router.get(
  "/api/vendors/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  VendorController.detail,
);

router.post(
  "/api/vendors",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  VendorController.create,
);

router.put(
  "/api/vendors/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  VendorController.update,
);

router.patch(
  "/api/vendors/:id/status",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  VendorController.updateStatus,
);

// Audit Logs
router.get(
  "/api/audit-logs",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  AuditLogController.list,
);

// Procurement Transactions
router.get(
  "/api/procurement-transactions",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ProcurementController.list,
);

router.get(
  "/api/procurement-transactions/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ProcurementController.detail,
);

router.post(
  "/api/procurement-transactions",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  ProcurementController.create,
);

router.put(
  "/api/procurement-transactions/:id",
  authMiddleware,
  requireRole(["super_admin", "admin"]),
  ProcurementController.update,
);

router.patch(
  "/api/procurement-transactions/:id/status",
  authMiddleware,
  requireRole(["super_admin", "admin", "auditor"]),
  ProcurementController.updateStatus,
);

// Fraud Results From Py
router.post(
  "/api/internal/fraud-results",
  internalApiKeyMiddleware,
  FraudIntegrationController.insertSingle,
);

router.post(
  "/api/internal/fraud-results/batch",
  internalApiKeyMiddleware,
  FraudIntegrationController.insertBatch,
);

export default router;

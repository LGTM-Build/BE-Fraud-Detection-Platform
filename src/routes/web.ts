import { Router } from "express";

import { authMiddleware } from "../middlewares/auth.middleware";
import { internalApiKeyMiddleware } from "../middlewares/internal-api-key.middleware";
import { requireRole } from "../middlewares/require-role.middleware";
import { upload } from "../middlewares/upload.middleware";

import { AuthController } from "../modules/auth/auth.controller";
import { UserController } from "../modules/users/user.controller";
import { EmployeeController } from "../modules/employees/employee.controller";
import { VendorController } from "../modules/vendors/vendor.controller";
import { AuditLogController } from "../modules/audit-logs/audit-log.controller";
import { ProcurementController } from "../modules/procurement/procurement.controller";
import { FraudIntegrationController } from "../modules/integrations/fraud/fraud.controller";
import { ImportController } from "../modules/imports/import.controller";
import { ExpenseController } from "../modules/expenses/expense.controller";
import { DashboardController } from "../modules/dashboard/dashboard.controller";

const router = Router();

router.get("/health-check", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

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

// Dashboard
router.get(
  "/api/dashboard/summary",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  DashboardController.summary,
);

router.get(
  "/api/dashboard/high-alerts",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  DashboardController.highAlerts,
);

router.get(
  "/api/dashboard/latest-transactions",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  DashboardController.latestTransactions,
);

// Procurement monitor
router.get(
  "/api/procurement-monitor",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ProcurementController.listMonitor,
);

router.get(
  "/api/procurement-monitor/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ProcurementController.detailMonitor,
);

router.post(
  "/api/procurements",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  ProcurementController.create,
);

router.put(
  "/api/procurements/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  ProcurementController.update,
);

router.post(
  "/api/procurement-monitor/:id/review",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ProcurementController.review,
);

router.post(
  "/api/procurement-monitor/:id/dispatch-ml",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ProcurementController.dispatchMl,
);

// Expense monitor
router.get(
  "/api/expense-monitor",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ExpenseController.listMonitor,
);

router.get(
  "/api/expense-monitor/:id",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ExpenseController.detailMonitor,
);

router.post(
  "/api/expenses",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  ExpenseController.create,
);

router.post(
  "/api/expense-monitor/:id/review",
  authMiddleware,
  requireRole(["super_admin", "super_user", "auditor"]),
  ExpenseController.review,
);

// Import
router.post(
  "/api/imports/procurements",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  upload.single("file"),
  ImportController.importProcurements,
);

router.post(
  "/api/imports/expenses",
  authMiddleware,
  requireRole(["super_admin", "super_user"]),
  upload.single("file"),
  ImportController.importExpenses,
);

export default router;

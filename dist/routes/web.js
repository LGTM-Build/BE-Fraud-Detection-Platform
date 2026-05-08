"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const internal_api_key_middleware_1 = require("../middlewares/internal-api-key.middleware");
const require_role_middleware_1 = require("../middlewares/require-role.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const auth_controller_1 = require("../modules/auth/auth.controller");
const user_controller_1 = require("../modules/users/user.controller");
const employee_controller_1 = require("../modules/employees/employee.controller");
const vendor_controller_1 = require("../modules/vendors/vendor.controller");
const audit_log_controller_1 = require("../modules/audit-logs/audit-log.controller");
const procurement_controller_1 = require("../modules/procurement/procurement.controller");
const fraud_controller_1 = require("../modules/integrations/fraud/fraud.controller");
const import_controller_1 = require("../modules/imports/import.controller");
const expense_controller_1 = require("../modules/expenses/expense.controller");
const dashboard_controller_1 = require("../modules/dashboard/dashboard.controller");
const router = (0, express_1.Router)();
router.get("/health-check", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "API is running",
    });
});
// Auth
router.post("/auth/register-company", auth_controller_1.AuthController.registerCompany);
router.post("/auth/login", auth_controller_1.AuthController.login);
router.post("/auth/refresh", auth_controller_1.AuthController.refreshToken);
router.post("/auth/logout", auth_controller_1.AuthController.logout);
// Profile
router.get("/api/profile", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), auth_controller_1.AuthController.profile);
// User
router.get("/api/users", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), user_controller_1.UserController.list);
router.get("/api/users/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), user_controller_1.UserController.detail);
router.post("/api/users", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), user_controller_1.UserController.create);
router.put("/api/users/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), user_controller_1.UserController.update);
router.patch("/api/users/:id/toggle-active", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), user_controller_1.UserController.toggleActive);
// Employees
router.get("/api/employees", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), employee_controller_1.EmployeeController.list);
router.get("/api/employees/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), employee_controller_1.EmployeeController.detail);
router.post("/api/employees", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), employee_controller_1.EmployeeController.create);
router.put("/api/employees/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), employee_controller_1.EmployeeController.update);
// Vendors
router.get("/api/vendors", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), vendor_controller_1.VendorController.list);
router.get("/api/vendors/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), vendor_controller_1.VendorController.detail);
router.post("/api/vendors", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), vendor_controller_1.VendorController.create);
router.put("/api/vendors/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), vendor_controller_1.VendorController.update);
router.patch("/api/vendors/:id/status", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), vendor_controller_1.VendorController.updateStatus);
// Audit Logs
router.get("/api/audit-logs", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), audit_log_controller_1.AuditLogController.list);
// Dashboard
router.get("/api/dashboard/summary", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), dashboard_controller_1.DashboardController.summary);
router.get("/api/dashboard/high-alerts", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), dashboard_controller_1.DashboardController.highAlerts);
router.get("/api/dashboard/latest-transactions", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), dashboard_controller_1.DashboardController.latestTransactions);
router.get("/api/dashboard/fraud-trend", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), dashboard_controller_1.DashboardController.fraudTrend);
// Procurement monitor
router.get("/api/procurement-monitor", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), procurement_controller_1.ProcurementController.listTransactions);
router.get("/api/procurement-monitor/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), procurement_controller_1.ProcurementController.detailTransaction);
router.post("/api/procurements", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), procurement_controller_1.ProcurementController.createTransaction);
router.put("/api/procurements/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), procurement_controller_1.ProcurementController.updateTransaction);
router.patch("/api/procurements/:id/review", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), procurement_controller_1.ProcurementController.updateTransactionStatus);
router.post("/api/procurement-monitor/:id/dispatch-ml", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), procurement_controller_1.ProcurementController.dispatchMl);
// Expense monitor
router.get("/api/expense-monitor", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), expense_controller_1.ExpenseController.listMonitor);
router.get("/api/expense-monitor/:id", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), expense_controller_1.ExpenseController.detailMonitor);
router.post("/api/expenses", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), expense_controller_1.ExpenseController.create);
router.post("/api/expense-monitor/:id/review", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user", "auditor"]), expense_controller_1.ExpenseController.review);
// Import
router.post("/api/imports/procurements", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), upload_middleware_1.upload.single("file"), import_controller_1.ImportController.importProcurements);
router.post("/api/imports/expenses", auth_middleware_1.authMiddleware, (0, require_role_middleware_1.requireRole)(["super_admin", "super_user"]), upload_middleware_1.upload.single("file"), import_controller_1.ImportController.importExpenses);
// Callback Fraud from Python Service
router.post("/api/internal/fraud-results", internal_api_key_middleware_1.internalApiKeyMiddleware, fraud_controller_1.FraudIntegrationController.insertSingle);
router.post("/api/internal/fraud-results/batch", internal_api_key_middleware_1.internalApiKeyMiddleware, fraud_controller_1.FraudIntegrationController.insertBatch);
exports.default = router;

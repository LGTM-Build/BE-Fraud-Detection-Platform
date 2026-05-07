"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudDispatchService = void 0;
const env_1 = require("../../../config/env");
const prisma_1 = require("../../../lib/prisma");
const app_error_1 = require("../../../core/errors/app-error");
const fraud_client_1 = require("./fraud.client");
function formatDateOnly(date) {
    return date.toISOString().split("T")[0];
}
class FraudDispatchService {
    static async dispatchProcurements(actor, procurementIds, source = "manual") {
        const procurements = await prisma_1.prisma.procurementTransaction.findMany({
            where: {
                companyId: actor.companyId,
                id: {
                    in: procurementIds,
                },
            },
            include: {
                employee: {
                    select: {
                        externalRef: true,
                    },
                },
            },
        });
        if (!procurements.length) {
            throw new app_error_1.AppError("No procurement transactions found", 404, "PROCUREMENTS_NOT_FOUND");
        }
        const payload = {
            module: "procurement",
            callbackUrl: `${env_1.env.BACKEND_BASE_URL}/api/internal/fraud-results/batch`,
            callbackHeaders: {
                "x-internal-api-key": env_1.env.INTERNAL_API_KEY,
            },
            records: procurements.map((item) => ({
                id: item.id,
                purchaseId: item.purchaseId,
                purchaseDate: formatDateOnly(item.purchaseDate),
                vendorName: item.vendorName,
                itemDescription: item.itemDescription,
                department: item.department,
                amountTotal: Number(item.amountTotal),
                procurementMethod: item.procurementMethod,
                employeeExternalRef: item.employee?.externalRef ?? null,
            })),
            metadata: {
                source,
                companyId: actor.companyId,
                requestedBy: actor.userId,
            },
        };
        const pythonResponse = await fraud_client_1.FraudClient.submitBatch(payload);
        await prisma_1.prisma.auditLog.create({
            data: {
                companyId: actor.companyId,
                userId: actor.userId,
                action: "dispatch_procurements_to_fraud_service",
                targetType: "procurement_transaction",
                targetId: null,
                note: "Procurement transactions dispatched to Python fraud service",
                metadata: {
                    source,
                    procurementIds,
                    pythonResponse,
                },
            },
        });
        return {
            module: "procurement",
            totalDispatched: procurements.length,
            callbackUrl: payload.callbackUrl,
            pythonResponse,
        };
    }
    static async dispatchExpenses(actor, expenseIds, source = "manual") {
        const expenses = await prisma_1.prisma.expense.findMany({
            where: {
                companyId: actor.companyId,
                id: {
                    in: expenseIds,
                },
            },
            include: {
                employee: {
                    select: {
                        externalRef: true,
                    },
                },
            },
        });
        if (!expenses.length) {
            throw new app_error_1.AppError("No expenses found", 404, "EXPENSES_NOT_FOUND");
        }
        const payload = {
            module: "expense",
            callbackUrl: `${env_1.env.BACKEND_BASE_URL}/api/internal/fraud-results/batch`,
            callbackHeaders: {
                "x-internal-api-key": env_1.env.INTERNAL_API_KEY,
            },
            records: expenses.map((item) => ({
                id: item.id,
                expenseId: item.expenseId,
                expenseDate: formatDateOnly(item.expenseDate),
                department: item.department,
                description: item.description,
                employeeExternalRef: item.employee.externalRef ?? null,
                amountTotal: Number(item.amountTotal),
                category: item.category,
                merchant: item.merchant,
            })),
            metadata: {
                source,
                companyId: actor.companyId,
                requestedBy: actor.userId,
            },
        };
        const pythonResponse = await fraud_client_1.FraudClient.submitBatch(payload);
        await prisma_1.prisma.auditLog.create({
            data: {
                companyId: actor.companyId,
                userId: actor.userId,
                action: "dispatch_expenses_to_fraud_service",
                targetType: "expense",
                targetId: null,
                note: "Expenses dispatched to Python fraud service",
                metadata: {
                    source,
                    expenseIds,
                    pythonResponse,
                },
            },
        });
        return {
            module: "expense",
            totalDispatched: expenses.length,
            callbackUrl: payload.callbackUrl,
            pythonResponse,
        };
    }
    static async dispatchProcurementForCompany(companyId, procurementId, actorUserId) {
        return this.dispatchProcurements({
            companyId,
            userId: actorUserId,
        }, [procurementId], "manual");
    }
}
exports.FraudDispatchService = FraudDispatchService;

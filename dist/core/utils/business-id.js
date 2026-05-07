"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExpenseId = generateExpenseId;
exports.generatePurchaseId = generatePurchaseId;
const prisma_1 = require("../../lib/prisma");
function padNumber(value, length = 4) {
    return String(value).padStart(length, "0");
}
function getNextNumberFromCode(code, prefix) {
    if (!code)
        return 1;
    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    const match = code.match(regex);
    if (!match)
        return 1;
    return Number(match[1]) + 1;
}
async function generateExpenseId(companyId) {
    const latest = await prisma_1.prisma.expense.findFirst({
        where: {
            companyId,
            expenseId: {
                startsWith: "EXP-",
            },
        },
        orderBy: {
            expenseId: "desc",
        },
        select: {
            expenseId: true,
        },
    });
    const nextNumber = getNextNumberFromCode(latest?.expenseId, "EXP");
    return `EXP-${padNumber(nextNumber)}`;
}
async function generatePurchaseId(companyId) {
    const latest = await prisma_1.prisma.procurementTransaction.findFirst({
        where: {
            companyId,
            purchaseId: {
                startsWith: "PRC-",
            },
        },
        orderBy: {
            purchaseId: "desc",
        },
        select: {
            purchaseId: true,
        },
    });
    const nextNumber = getNextNumberFromCode(latest?.purchaseId, "PRC");
    return `PRC-${padNumber(nextNumber)}`;
}

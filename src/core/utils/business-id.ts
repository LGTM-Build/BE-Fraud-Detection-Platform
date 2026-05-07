import { prisma } from "../../lib/prisma";

function padNumber(value: number, length = 4) {
  return String(value).padStart(length, "0");
}

function getNextNumberFromCode(
  code: string | null | undefined,
  prefix: string,
) {
  if (!code) return 1;

  const regex = new RegExp(`^${prefix}-(\\d+)$`);
  const match = code.match(regex);

  if (!match) return 1;

  return Number(match[1]) + 1;
}

export async function generateExpenseId(companyId: string) {
  const latest = await prisma.expense.findFirst({
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

export async function generatePurchaseId(companyId: string) {
  const latest = await prisma.procurementTransaction.findFirst({
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

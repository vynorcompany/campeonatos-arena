import type { Prisma } from "@prisma/client";

export function recurringBoletoEntryWhere(arenaId: string, dueBefore?: Date): Prisma.FinancialEntryWhereInput {
  return {
    arenaId,
    type: "REVENUE",
    status: "PENDING",
    recurrenceId: { not: null },
    recurrence: { active: true, onlinePaymentMethod: "BOLETO" },
    playerId: { not: null },
    onlinePaymentId: "",
    onlinePaymentUrl: "",
    onlinePaymentClaimMethod: { in: ["", "BOLETO"] },
    ...(dueBefore ? { dueDate: { lte: dueBefore } } : {}),
  };
}

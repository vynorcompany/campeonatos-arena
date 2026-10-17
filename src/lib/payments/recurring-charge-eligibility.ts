import type { Prisma } from "@prisma/client";

/** Include the complete fifteenth calendar day, regardless of job execution time. */
export function recurringBoletoIssueDeadline(now: Date) {
  const deadline = new Date(now);
  deadline.setUTCDate(deadline.getUTCDate() + 15);
  deadline.setUTCHours(23, 59, 59, 999);
  return deadline;
}

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

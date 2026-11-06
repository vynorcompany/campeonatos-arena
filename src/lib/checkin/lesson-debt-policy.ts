import type { Prisma } from "@prisma/client";
import { arenaToday } from "../calendar/arena-wall-clock";
import { getOutstandingCents } from "../finance/settlements";

/** Apply only the student's lesson charges, including charges billed to a guardian. */
export async function assertLessonCheckinDebtPolicy(tx: Prisma.TransactionClient, arenaId: string, studentId: string, playerId: string, now = new Date()) {
  const settings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId }, select: { lessonCheckinBlockOverdue: true } });
  if (!settings?.lessonCheckinBlockOverdue) return;
  const entries = await tx.financialEntry.findMany({
    where: {
      arenaId, type: { in: ["REVENUE", "INCOME"] }, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }, dueDate: { lt: arenaToday(now) },
      OR: [
        { recurrence: { arenaId, studentId } },
        { playerId, OR: [
          { category: { in: ["Plano de Aulas", "Planos de aulas", "Aulas avulsas", "Aulas"], mode: "insensitive" } },
          { plan: { arenaId, subscriptions: { some: { arenaId, studentId } } } },
        ] },
      ],
    },
    select: { amountCents: true, settlements: { select: { amountCents: true, interestCents: true, discountCents: true } } },
  });
  const overdue = entries.map(entry => getOutstandingCents(entry.amountCents, entry.settlements)).filter(amount => amount > 0);
  if (!overdue.length) return;
  const total = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(overdue.reduce((sum, amount) => sum + amount, 0) / 100);
  throw new Error(`Você tem ${overdue.length} cobrança(s) de aulas vencida(s) em aberto, no total de ${total}. Acerte no caixa antes de fazer o check-in.`);
}

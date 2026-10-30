import type { ArenaTransaction } from "@/lib/rls";
import { planRecurrenceOwnerWhere } from "./plan-recurrence-owner";
const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function schedulePlanPriceChange(tx: ArenaTransaction, input: { arenaId: string; teacherId: string; planId: string; amountCents: number; effectiveDate: Date; userId: string }, today: Date) {
  if (input.effectiveDate <= today || !Number.isSafeInteger(input.amountCents) || input.amountCents < 0) throw new Error("Informe um valor válido e uma data futura.");
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`teacher-prices:${input.arenaId}:${input.teacherId}`}, 0))::text`;
  const assignment = await tx.teacherPlan.findFirst({ where: { arenaId: input.arenaId, teacherId: input.teacherId, planId: input.planId, active: true }, include: { plan: true } });
  if (!assignment) throw new Error("Plano não encontrado para este professor.");
  const change = await tx.planPriceChange.create({ data: { arenaId: input.arenaId, teacherPlanId: assignment.id, amountCents: input.amountCents, effectiveDate: input.effectiveDate, createdByUserId: input.userId } });
  const message = `${assignment.plan.name}: de ${money(assignment.monthlyPriceCents)} para ${money(input.amountCents)} a partir de ${input.effectiveDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}.`;
  const subscriptions = await tx.studentSubscription.findMany({ where: { arenaId: input.arenaId, planId: input.planId, status: "ACTIVE", student: { teacherAssignments: { some: { teacherId: input.teacherId, active: true } } } }, include: { student: { select: { playerId: true } } } });
  const players = [...new Set(subscriptions.map(s => s.student.playerId).filter((id): id is string => Boolean(id)))];
  if (players.length) await tx.playerNotification.createMany({ data: players.map(playerId => ({ playerId, type: "PLAN_PRICE_CHANGE", title: "Reajuste programado do plano", message, href: "/home?section=lessons" })) });
  await tx.arenaNotification.create({ data: { arenaId: input.arenaId, type: "PLAN_PRICE_CHANGE", title: "Reajuste de plano programado", message, href: `/professores/${input.teacherId}?tab=plans` } });
  return change;
}

/** One transaction per arena; advisory lock + status protect against concurrent workers and retries. */
export async function applyDuePlanPriceChanges(tx: ArenaTransaction, arenaId: string, today: Date) {
  const due = await tx.planPriceChange.findMany({ where: { arenaId, status: "SCHEDULED", effectiveDate: { lte: today } }, include: { teacherPlan: { include: { plan: true } } }, orderBy: [{ effectiveDate: "asc" }, { id: "asc" }] });
  let applied = 0;
  for (const candidate of due) {
    let assignment = candidate.teacherPlan;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`teacher-prices:${arenaId}:${assignment.teacherId}`}, 0))::text`;
    const change = await tx.planPriceChange.findFirst({ where: { id: candidate.id, arenaId, status: "SCHEDULED" } });
    if (!change) continue;
    assignment = await tx.teacherPlan.findUniqueOrThrow({ where: { id: assignment.id }, include: { plan: true } });
    if (!assignment.active) { await tx.planPriceChange.update({ where: { id: change.id }, data: { status: "CANCELLED" } }); continue; }
    const subscriptions = await tx.studentSubscription.findMany({ where: { arenaId, planId: assignment.planId, status: "ACTIVE", student: { teacherAssignments: { some: { teacherId: assignment.teacherId, active: true } } } }, include: { student: true } });
    // Already-created installments are priced by their due dates, including successive scheduled changes.
    const nextChange = await tx.planPriceChange.findFirst({ where: { arenaId, teacherPlanId: assignment.id, status: "SCHEDULED", effectiveDate: { gt: change.effectiveDate } }, orderBy: { effectiveDate: "asc" } });
    for (const sub of subscriptions) {
      const recurrences = await tx.financialRecurrence.findMany({ where: { AND: [planRecurrenceOwnerWhere({ arenaId, planId: assignment.planId, studentId: sub.studentId, studentName: sub.student.name, playerId: sub.student.playerId }), { OR: [{ teacherId: assignment.teacherId }, { teacherId: null }] }] }, select: { id: true } });
      if (!recurrences.length && await tx.financialRecurrence.count({ where: { arenaId, planId: assignment.planId, studentId: sub.studentId, active: true, teacherId: { not: assignment.teacherId } } })) continue;
      for (const recurrence of recurrences) {
        await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE "arenaId" = ${arenaId} AND "recurrenceId" = ${recurrence.id} FOR UPDATE`;
        const entries = await tx.financialEntry.findMany({ where: { arenaId, recurrenceId: recurrence.id, status: { not: "VOIDED" }, dueDate: { gte: change.effectiveDate, ...(nextChange ? { lt: nextChange.effectiveDate } : {}) } }, include: { settlements: true } });
        for (const entry of entries) {
          if (entry.status === "PAID" || entry.settlements.length || entry.status === "PARTIAL") continue;
          const delta = change.amountCents - entry.amountCents;
          if (!delta) continue;
          const note = `Reajuste ${change.id} a partir de ${change.effectiveDate.toISOString().slice(0, 10)}.`;
          const charged = Boolean(entry.onlinePaymentId || entry.onlinePaymentPublishedAt || entry.onlineChargeAmountCents !== null);
          if (!charged) await tx.financialEntry.update({ where: { id: entry.id }, data: { amountCents: change.amountCents, notes: `${entry.notes}\n${note}` } });
          else {
            // The provider's issued boleto remains untouched; the difference has its own receivable/credit.
            const reference = `plan-price:${change.id}:${entry.id}`;
            if (delta > 0) await tx.financialEntry.create({ data: { arenaId, type: "REVENUE", category: "Planos de aulas", source: "PLAN_PRICE_CHANGE", externalReference: reference, description: `Diferença de reajuste · ${sub.student.name}`, counterpartyName: sub.student.name, playerId: sub.student.playerId, planId: assignment.planId, teacherId: assignment.teacherId, amountCents: delta, dueDate: entry.dueDate, bankAccountId: entry.bankAccountId, notes: note } });
            else if (sub.student.playerId) await tx.clientBalanceMovement.create({ data: { arenaId, playerId: sub.student.playerId, kind: "MONEY", amountCents: -delta, reason: `${reference}: ${note}` } });
            else throw new Error("Aluno sem cliente vinculado para receber crédito de reajuste.");
          }
        }
        await tx.financialRecurrence.update({ where: { id: recurrence.id }, data: { amountCents: change.amountCents } });
      }
      await tx.studentSubscription.update({ where: { id: sub.id }, data: { monthlyPriceCents: change.amountCents } });
    }
    await tx.teacherPlan.update({ where: { id: assignment.id }, data: { monthlyPriceCents: change.amountCents } });
    if (await tx.teacherPlan.count({ where: { arenaId, planId: assignment.planId, active: true } }) === 1) await tx.plan.update({ where: { id: assignment.planId }, data: { monthlyPriceCents: change.amountCents } });
    await tx.planPriceChange.update({ where: { id: change.id }, data: { status: "APPLIED", appliedAt: new Date() } });
    await tx.arenaNotification.create({ data: { arenaId, type: "PLAN_PRICE_CHANGE", title: "Reajuste aplicado", message: `${assignment.plan.name}: mensalidade atualizada para ${money(change.amountCents)}. Valores pagos foram preservados; cobranças emitidas receberam ajuste separado.`, href: `/professores/${assignment.teacherId}?tab=plans` } });
    applied++;
  }
  return applied;
}

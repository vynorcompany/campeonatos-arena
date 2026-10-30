import { createHash } from "node:crypto";
import type { ArenaTransaction } from "@/lib/rls";
import { dateOnly, transferCycle, calculatePlanTransfer, cycleDate } from "./plan-transfer-calculation";
import { planRecurrenceOwnerWhere } from "./plan-recurrence-owner";

export type TransferInput = { teacherId: string; subscriptionId: string; targetPlanId: string; newDueDate: string };
export async function planTransferQuote(tx: ArenaTransaction, arenaId: string, input: TransferInput, today: Date) {
  const subscription = await tx.studentSubscription.findFirst({ where: { id: input.subscriptionId, arenaId, status: "ACTIVE", student: { teacherAssignments: { some: { teacherId: input.teacherId, active: true } } } }, include: { student: true, plan: true } });
  const target = await tx.teacherPlan.findFirst({ where: { arenaId, teacherId: input.teacherId, planId: input.targetPlanId, active: true, teacher: { active: true }, plan: { active: true } }, include: { plan: true } });
  if (!subscription || !target) throw new Error("Aluno ou plano não encontrado para este professor.");
  if (dateOnly(subscription.startedAt) > today) throw new Error("A assinatura ainda não iniciou. Ajuste a inscrição antes de transferir.");
  if (subscription.planId === target.planId) throw new Error("Selecione um plano diferente do atual.");
  const duplicate = await tx.studentSubscription.findFirst({ where: { arenaId, studentId: subscription.studentId, planId: target.planId, status: "ACTIVE" } });
  if (duplicate) throw new Error("O aluno já possui uma assinatura ativa no plano de destino.");
  const recurrences = await tx.financialRecurrence.findMany({ where: { AND: [planRecurrenceOwnerWhere({ arenaId, planId: subscription.planId, studentId: subscription.studentId, studentName: subscription.student.name, playerId: subscription.student.playerId }), { OR: [{ teacherId: input.teacherId }, { teacherId: null }] }] } });
  if (recurrences.length !== 1) throw new Error("Revise a recorrência do aluno antes de transferir: é necessária uma única cobrança recorrente ativa.");
  const recurrence = recurrences[0];
  const entries = await tx.financialEntry.findMany({ where: { arenaId, recurrenceId: recurrence.id }, include: { settlements: true }, orderBy: [{ dueDate: "asc" }, { id: "asc" }] });
  const upcoming = entries.filter(e => e.status !== "VOIDED" && e.dueDate && dateOnly(e.dueDate) > today);
  if (upcoming.some(e => e.settlements.length || e.status === "PAID" || e.status === "PARTIAL")) throw new Error("Há mensalidades futuras pagas ou parciais. Concilie essas cobranças antes de transferir o plano.");
  if (upcoming.some(e => e.onlinePaymentClaimedAt && !e.onlinePaymentId)) throw new Error("Há uma cobrança em emissão. Aguarde a conclusão antes de transferir.");
  const cycle = transferCycle(today, subscription.dueDay);
  const newDueDate = dateOnly(input.newDueDate);
  const calculation = calculatePlanTransfer({ today, cycleStart: cycle.start, currentDueDate: cycle.end, newDueDate, oldPriceCents: subscription.monthlyPriceCents, newPriceCents: target.monthlyPriceCents });
  if (calculation.differenceCents < 0 && !subscription.student.playerId) throw new Error("Vincule o aluno a um cliente antes de gerar crédito.");
  const groups = await tx.classGroupEnrollment.findMany({ where: { arenaId, studentId: subscription.studentId, status: "ACTIVE", classGroup: { teacherId: input.teacherId } }, include: { classGroup: { include: { plans: true } } } });
  const groupsToRemove = groups.filter(g => !g.classGroup.plans.some(p => p.planId === target.planId));
  const token = createHash("sha256").update(JSON.stringify({ input, day: today.toISOString(), subscription, target, recurrence, entries, groups })).digest("hex");
  const quote = { token, studentName: subscription.student.name, oldPlanName: subscription.plan.name, newPlanName: target.plan.name, oldPriceCents: subscription.monthlyPriceCents, newPriceCents: target.monthlyPriceCents, currentDueDate: cycle.end.toISOString().slice(0, 10), newDueDate: input.newDueDate, ...calculation, affectedInstallments: upcoming.length, issuedCharges: upcoming.filter(e => Boolean(e.onlinePaymentId || e.onlinePaymentUrl)).length, removedGroups: groupsToRemove.map(g => g.classGroup.name) };
  return { quote, subscription, target, recurrence, upcoming, groupsToRemove, newDueDate };
}
export async function transferStudentPlan(tx: ArenaTransaction, arenaId: string, input: TransferInput, expectedToken: string, today: Date, releaseCharge?: (entry: { onlineProvider: string; onlinePaymentId: string }) => Promise<void>) {
  // Same teacher lock is used by scheduled price changes and plan edits.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`teacher-prices:${arenaId}:${input.teacherId}`}, 0))::text`;
  await tx.$queryRaw`SELECT id FROM "StudentSubscription" WHERE id = ${input.subscriptionId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  const initial = await planTransferQuote(tx, arenaId, input, today);
  await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE "arenaId" = ${arenaId} AND "recurrenceId" = ${initial.recurrence.id} FOR UPDATE`;
  const state = await planTransferQuote(tx, arenaId, input, today);
  const { quote, subscription, target, recurrence, upcoming, groupsToRemove, newDueDate } = state;
  if (quote.token !== expectedToken) throw new Error("Os dados mudaram. Confira novamente os valores antes de confirmar.");
  const note = `Transferência: ${quote.oldPlanName} (${quote.oldPriceCents}) > ${quote.newPlanName} (${quote.newPriceCents}); diferença ${quote.differenceCents} centavos; vencimento ${quote.currentDueDate} > ${quote.newDueDate}.`;
  const future = upcoming;
  for (const entry of future) {
    if (entry.onlinePaymentId || entry.onlinePaymentUrl || entry.onlineChargeAmountCents !== null) {
      if (!releaseCharge || !entry.onlinePaymentId) throw new Error("A cobrança emitida precisa ser conciliada antes da transferência.");
      await releaseCharge(entry);
    }
  }
  for (let i = 0; i < future.length; i++) {
    const entry = future[i];
    const dueDate = cycleDate(newDueDate.getUTCFullYear(), newDueDate.getUTCMonth() + i, newDueDate.getUTCDate());
    const data = { planId: target.planId, amountCents: target.monthlyPriceCents, dueDate, description: `${target.plan.name} · ${subscription.student.name}`, notes: `${entry.notes}\n${note}` };
    if (entry.onlinePaymentId || entry.onlinePaymentUrl || entry.onlineChargeAmountCents !== null) {
      await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: "Cobrança cancelada no provedor para transferência de plano." } });
      await tx.financialEntry.create({ data: { ...data, arenaId, type: "REVENUE", category: entry.category, counterpartyName: entry.counterpartyName, playerId: entry.playerId, teacherId: input.teacherId, recurrenceId: recurrence.id, bankAccountId: entry.bankAccountId, paymentMethod: entry.paymentMethod, source: "PLAN_TRANSFER_REPLACEMENT", externalReference: `plan-transfer-replaces:${entry.id}` } });
    } else await tx.financialEntry.update({ where: { id: entry.id }, data });
  }
  if (!future.length) {
    for (let i = 0; i < 12; i++) {
      const dueDate = cycleDate(newDueDate.getUTCFullYear(), newDueDate.getUTCMonth() + i, newDueDate.getUTCDate());
      await tx.financialEntry.create({ data: { arenaId, type: "REVENUE", category: "Planos de aulas", description: `${target.plan.name} · ${subscription.student.name}`, counterpartyName: subscription.student.name, amountCents: target.monthlyPriceCents, dueDate, playerId: subscription.student.playerId, teacherId: input.teacherId, planId: target.planId, recurrenceId: recurrence.id, bankAccountId: recurrence.bankAccountId, notes: note } });
    }
  }
  const count = future.length || 12;
  const lastDate = cycleDate(newDueDate.getUTCFullYear(), newDueDate.getUTCMonth() + count - 1, newDueDate.getUTCDate());
  await tx.financialRecurrence.update({ where: { id: recurrence.id }, data: { planId: target.planId, amountCents: target.monthlyPriceCents, teacherId: input.teacherId, studentId: subscription.studentId, startsAt: newDueDate, nextDueDate: cycleDate(newDueDate.getUTCFullYear(), newDueDate.getUTCMonth() + count, newDueDate.getUTCDate()), endsAt: lastDate, description: `${target.plan.name} · ${subscription.student.name}`, notes: `${recurrence.notes}\n${note}` } });
  await tx.studentSubscription.update({ where: { id: subscription.id }, data: { planId: target.planId, monthlyPriceCents: target.monthlyPriceCents, classesPerMonth: target.plan.classesPerMonth, dueDay: newDueDate.getUTCDate(), notes: `${subscription.notes}\n${note}` } });
  if (groupsToRemove.length) await tx.classGroupEnrollment.updateMany({ where: { id: { in: groupsToRemove.map(g => g.id) }, arenaId }, data: { status: "TRANSFERRED", endedAt: today } });
  if (quote.differenceCents > 0) await tx.financialEntry.create({ data: { arenaId, type: "REVENUE", category: "Planos de aulas", source: "PLAN_TRANSFER", description: `Diferença de plano · ${subscription.student.name}`, counterpartyName: subscription.student.name, amountCents: quote.differenceCents, dueDate: today, playerId: subscription.student.playerId, teacherId: input.teacherId, planId: target.planId, bankAccountId: recurrence.bankAccountId, notes: note, externalReference: `plan-transfer:${subscription.id}:${expectedToken}` } });
  if (quote.differenceCents < 0) await tx.clientBalanceMovement.create({ data: { arenaId, playerId: subscription.student.playerId!, kind: "MONEY", amountCents: -quote.differenceCents, reason: note } });
  return quote;
}

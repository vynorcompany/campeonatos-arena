import type { ArenaTransaction } from "@/lib/rls";
import { calculateEmployeePayroll, employeePayrollAmounts, type EmployeePayrollInput } from "./employee-payroll";
import { getFinancialEntryBalance } from "./ledger";

export async function saveEmployeePayroll(tx: ArenaTransaction, arenaId: string, input: EmployeePayrollInput) {
  const values = employeePayrollAmounts(input);
  const totals = calculateEmployeePayroll(values);
  if (!Number.isSafeInteger(totals.totalCents) || totals.totalCents <= 0 || totals.totalCents > 2_000_000_000 || totals.overtimeCents > 2_000_000_000) throw new Error("O total líquido deve ser positivo e os valores devem estar dentro do limite.");
  const member = await tx.arenaMember.findFirst({ where: { arenaId, userId: input.userId }, select: { user: { select: { id: true, name: true } } } });
  if (!member) throw new Error("Funcionário não encontrado nesta arena.");
  const key = `${arenaId}:${input.userId}:${input.referenceMonth}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  const existing = await tx.employeePayrollEntry.findUnique({
    where: { arenaId_userId_referenceMonth: { arenaId, userId: input.userId, referenceMonth: input.referenceMonth } },
    include: { financialEntry: { include: { settlements: true } } },
  });
  const linked = existing?.financialEntry;
  if (linked && (linked.arenaId !== arenaId || linked.type !== "EXPENSE" || linked.source !== "EMPLOYEE_PAYROLL")) throw new Error("Lançamento da folha inválido.");
  // Lock the financial row too: payments in Contas a Pagar must not race a payroll update.
  if (linked) await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id = ${linked.id} AND "arenaId" = ${arenaId} FOR UPDATE`;
  const entry = linked ? await tx.financialEntry.findUnique({ where: { id: linked.id }, include: { settlements: true } }) : null;
  if (entry?.status === "VOIDED") throw new Error("Esta folha tem um lançamento cancelado. Revise-o em Contas a Pagar.");
  if (entry && (entry.settlements.length || entry.status === "PAID") && entry.amountCents !== totals.totalCents) throw new Error("Uma folha com pagamentos registrados não pode ter o total alterado.");
  if (entry?.status === "PAID" && input.status !== "PAID") throw new Error("Esta folha já foi paga. Revise o pagamento em Contas a Pagar.");
  if (entry?.status === "PAID" && entry.paidAt?.toISOString().slice(0, 10) !== input.paidAt) throw new Error("A data de um pagamento registrado deve ser revisada em Contas a Pagar.");
  const paidAt = input.status === "PAID" ? new Date(input.paidAt + "T12:00:00Z") : null;
  const notes = input.notes;
  const data = {
    amountCents: totals.totalCents, status: input.status,
    dueDate: new Date(input.dueDate + "T12:00:00Z"),
    paidAt: entry?.status === "PAID" ? entry.paidAt : paidAt,
    description: `Folha ${member.user.name} - ${input.referenceMonth}`,
    counterpartyName: member.user.name, notes,
  };
  const financialEntry = entry
    ? await tx.financialEntry.update({ where: { id: entry.id }, data })
    : await tx.financialEntry.create({ data: { ...data, arenaId, type: "EXPENSE", category: "Folha de pagamento", source: "EMPLOYEE_PAYROLL", externalReference: key } });
  if (input.status === "PAID" && entry?.status !== "PAID") {
    const remaining = getFinancialEntryBalance(totals.totalCents, entry?.settlements ?? [], "PENDING").outstandingCents;
    if (remaining > 0) await tx.financialSettlement.create({ data: { arenaId, financialEntryId: financialEntry.id, amountCents: remaining, paidAt: paidAt!, paymentMethod: "", notes: "Pagamento registrado na folha de funcionários." } });
  }
  const payrollData = { ...values, overtimeCents: totals.overtimeCents, employeeName: member.user.name, notes, financialEntryId: financialEntry.id };
  return tx.employeePayrollEntry.upsert({
    where: { arenaId_userId_referenceMonth: { arenaId, userId: input.userId, referenceMonth: input.referenceMonth } },
    create: { ...payrollData, arenaId, userId: input.userId, referenceMonth: input.referenceMonth }, update: payrollData,
  });
}

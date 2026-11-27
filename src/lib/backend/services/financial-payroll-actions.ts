import { FinanceOperationError } from "@/lib/finance/action-error";
import "server-only";
import { StaleRecordError, staleRecordMessage } from "@/lib/record-version";

import { requireArenaAccess } from "@/lib/auth/session";
import { canPerformPermission } from "@/lib/permissions";
import { parseDate } from "@/lib/finance/inputs";
import { employeePayrollSchema } from "@/lib/finance/employee-payroll";
import { saveEmployeePayroll } from "@/lib/finance/employee-payroll-service";
import { withArenaTransaction } from "@/lib/rls";

import { teacherMonthlyPayableSchema } from "@/lib/finance/action-schemas";
import { assertFinancialEntryPermission } from "@/lib/actions/finance/shared";

export async function createTeacherMonthlyPayableAction(formData: FormData) {
  const auth = await requireArenaAccess();
  if (!canPerformPermission("teachers:payable", auth.arenaRole, auth.systemRole, auth.editPermissions)
    && !canPerformPermission("finance:payable:create", auth.arenaRole, auth.systemRole, auth.editPermissions)) {
    throw new FinanceOperationError("Sem permissão para gerar repasse de professor.");
  }
  const parsed = teacherMonthlyPayableSchema.safeParse({
    teacherId: formData.get("teacherId"),
    entryIds: formData.getAll("entryIds"),
    percentage: formData.get("percentage"),
    referenceStart: formData.get("referenceStart"),
    referenceEnd: formData.get("referenceEnd"),
    dueDate: formData.get("dueDate")
  });
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const referenceStart = parseDate(parsed.data.referenceStart);
  const referenceEnd = parseDate(parsed.data.referenceEnd);
  const dueDate = parseDate(parsed.data.dueDate);
  if (!referenceStart || !referenceEnd || !dueDate || referenceStart > referenceEnd) {
    throw new FinanceOperationError("Informe um período e vencimento válidos.");
  }
  referenceEnd.setHours(23, 59, 59, 999);
  const entryIds = [...new Set(parsed.data.entryIds)];
  const percentageBasisPoints = Math.round(parsed.data.percentage * 100);
  const externalReference = `teacher-monthly-payable:${parsed.data.teacherId}:${parsed.data.referenceStart}:${parsed.data.referenceEnd}:${percentageBasisPoints}:${[...entryIds].sort().join(",")}`;

  const entryId = await withArenaTransaction(auth.arenaId, async (tx) => {
    const teacher = await tx.teacher.findFirst({
      where: { id: parsed.data.teacherId, arenaId: auth.arenaId },
      select: { id: true, name: true }
    });
    if (!teacher) throw new FinanceOperationError("Professor não encontrado.");

    const existing = await tx.financialEntry.findFirst({
      where: { arenaId: auth.arenaId, externalReference, type: "EXPENSE", status: { not: "VOIDED" } },
      select: { id: true }
    });
    if (existing) return existing.id;

    const receivables = await tx.financialEntry.findMany({
      where: {
        arenaId: auth.arenaId,
        id: { in: entryIds },
        type: "REVENUE",
        status: "PAID",
        paidAt: { gte: referenceStart, lte: referenceEnd },
        plan: { teacherAssignments: { some: { teacherId: teacher.id, active: true } } }
      },
      select: { id: true, amountCents: true }
    });
    if (receivables.length !== entryIds.length) {
      throw new FinanceOperationError("Um ou mais recebimentos não pertencem a este relatório ou não estão quitados.");
    }

    const receivedCents = receivables.reduce((total, entry) => total + entry.amountCents, 0);
    const amountCents = Math.round(receivedCents * (percentageBasisPoints / 10000));
    if (amountCents <= 0) throw new FinanceOperationError("O valor a pagar deve ser maior que zero.");

    const supplier = await tx.supplier.upsert({
      where: { arenaId_name: { arenaId: auth.arenaId, name: teacher.name } },
      update: {},
      create: { arenaId: auth.arenaId, name: teacher.name }
    });
    const created = await tx.financialEntry.create({
      data: {
        arenaId: auth.arenaId,
        source: "TEACHER_MONTHLY_REPORT",
        externalReference,
        type: "EXPENSE",
        category: "Repasse de professor",
        description: `Repasse ${teacher.name} · ${parsed.data.referenceStart} a ${parsed.data.referenceEnd}`,
        counterpartyName: teacher.name,
        supplierId: supplier.id,
        amountCents,
        status: "PENDING",
        dueDate,
        notes: `Gerado pelo relatório mensal do professor. ${receivables.length} recebimento(s) incluído(s), percentual de ${parsed.data.percentage}%.`
      }
    });
    return created.id;
  });



  return { entryId };
}

export async function upsertPayrollEntryAction(formData: FormData) {
  const auth = await requireArenaAccess();
  const parsed = employeePayrollSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new FinanceOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const expectedVersion = formData.get("expectedVersion");
  if (typeof expectedVersion !== "string") return { error: staleRecordMessage };
  try { await withArenaTransaction(auth.arenaId, tx => saveEmployeePayroll(tx, auth.arenaId, parsed.data, (state) => {
    assertFinancialEntryPermission(auth, "EXPENSE", state.exists ? "edit" : "create");
    if (state.exists && !state.hasFinancialEntry) assertFinancialEntryPermission(auth, "EXPENSE", "create");
    if (parsed.data.status === "PAID" && !state.paid) assertFinancialEntryPermission(auth, "EXPENSE", "settle");
  }, expectedVersion)); } catch (error) { if (error instanceof StaleRecordError) return { error: error.message }; throw error; }

}

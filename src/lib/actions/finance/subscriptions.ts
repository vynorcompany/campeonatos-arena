"use server";
import { readExpiryPolicy } from "@/lib/academy/credit-expiry-policy";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { arenaDatabase } from "@/lib/arena-database";
import { requirePermission } from "@/lib/auth/guards";
import { getReferenceMonthRange, parseDate, parseMoneyToCents } from "@/lib/finance/inputs";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { getNextFinancialRecurrenceDate } from "@/lib/finance/recurrences";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { issueRecurringOnlineChargeForEntry } from "@/lib/payments/recurring-online-charges";
import { lockStudentPlanSubscription } from "@/lib/academy/subscription-lock";
import { planRecurrenceOwnerWhere } from "@/lib/academy/plan-recurrence-owner";
import { issueManualFiscalDocument, type FiscalDocumentType } from "@/lib/fiscal/manual-issuance";
import { refreshFinanceRoutes } from "@/lib/finance/revalidation";
import { paymentSchema, planSchema, subscriptionSchema } from "@/lib/finance/action-schemas";
import { hasUnresolvedOnlinePayment } from "@/lib/actions/finance/shared";

export async function createPlanAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const parsed = planSchema.safeParse({
    name: formData.get("name"),
    monthlyPrice: formData.get("monthlyPrice"),
    classesPerMonth: formData.get("classesPerMonth"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await withArenaTransaction(auth.arenaId, (tx) => tx.plan.create({
    data: {
      ...readExpiryPolicy(formData), creditPolicyConfiguredAt: new Date(),
      arenaId: auth.arenaId,
      createdByUserId: auth.userId,
      updatedByUserId: auth.userId,
      name: parsed.data.name,
      monthlyPriceCents: parseMoneyToCents(parsed.data.monthlyPrice),
      classesPerMonth: parsed.data.classesPerMonth,
      notes: parsed.data.notes
    }
  }));

  refreshFinanceRoutes();
}

export async function createSubscriptionAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:create");
  const prisma = arenaDatabase(auth.arenaId);
  const parsed = subscriptionSchema.safeParse({
    studentId: formData.get("studentId"),
    planId: formData.get("planId"),
    dueDay: formData.get("dueDay"),
    startedAt: formData.get("startedAt"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const plan = await prisma.plan.findFirst({
    where: {
      id: parsed.data.planId,
      arenaId: auth.arenaId,
      active: true
    }
  });

  if (!plan) {
    throw new Error("Plano não encontrado.");
  }

  const student = await prisma.student.findFirst({
    where: {
      id: parsed.data.studentId,
      arenaId: auth.arenaId
    }
  });

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  const requestedStart = parsed.data.startedAt ? new Date(`${parsed.data.startedAt}T12:00:00`) : null;
  if (requestedStart && Number.isNaN(requestedStart.getTime())) throw new Error("Data de início inválida.");
  let firstEntryId = "";
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await lockStudentPlanSubscription(tx, auth.arenaId, student.playerId ?? student.id, plan.id);
    const dueDay = parsed.data.dueDay;
    const current = await tx.studentSubscription.findFirst({
      where: { arenaId: auth.arenaId, studentId: student.id, planId: plan.id, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });
    const renewalDate = current
      ? new Date(current.startedAt.getFullYear() + 1, current.startedAt.getMonth(), current.startedAt.getDate(), 12)
      : null;
    const today = new Date();
    if (renewalDate && today < renewalDate) {
      throw new Error("Este plano ainda está no ciclo atual. A renovação só pode ser confirmada a partir do aniversário de 12 meses.");
    }
    const startedAt = requestedStart ?? today;
    if (renewalDate && startedAt < renewalDate) {
      throw new Error("O novo ciclo não pode começar antes do fim do ciclo anterior.");
    }
    if (current) {
      await tx.studentSubscription.update({ where: { id: current.id }, data: { status: "RENEWED", endedAt: startedAt } });
      await tx.financialRecurrence.updateMany({
        where: planRecurrenceOwnerWhere({ arenaId: auth.arenaId, planId: plan.id, studentId: student.id, studentName: student.name, playerId: student.playerId, startedAt: current.startedAt }),
        data: { active: false },
      });
    }

    await tx.studentSubscription.create({
      data: {
        arenaId: auth.arenaId,
        studentId: student.id,
        planId: plan.id,
        monthlyPriceCents: plan.monthlyPriceCents,
        classesPerMonth: plan.classesPerMonth,
        dueDay,
        startedAt,
        notes: parsed.data.notes
      }
    });
    const assignments = await tx.teacherStudent.findMany({
      where: { arenaId: auth.arenaId, studentId: student.id, active: true, teacher: { planAssignments: { some: { planId: plan.id, active: true } } } },
      select: { teacherId: true }, take: 2,
    });
    const teacherId = assignments.length === 1 ? assignments[0].teacherId : null;
    let dueDate = new Date(startedAt.getFullYear(), startedAt.getMonth(), dueDay, 12);
    if (dueDate < startedAt) dueDate = new Date(startedAt.getFullYear(), startedAt.getMonth() + 1, dueDay, 12);
    const recurrence = await tx.financialRecurrence.create({ data: {
      arenaId: auth.arenaId, type: "REVENUE", counterpartyName: student.name, category: "Planos de aulas",
      description: `${plan.name} · ${student.name}`, amountCents: plan.monthlyPriceCents, frequency: "MONTHLY",
      startsAt: startedAt, nextDueDate: dueDate, onlinePaymentMethod: "BOLETO", planId: plan.id,
      teacherId, playerId: student.playerId, studentId: student.id, notes: current ? "Renovação anual do plano de aulas." : "Ativação do plano de aulas.",
    } });
    let lastDueDate = dueDate;
    for (let month = 0; month < 12; month += 1) {
      const entry = await tx.financialEntry.create({ data: {
        arenaId: auth.arenaId, type: "REVENUE", category: "Planos de aulas", description: `${plan.name} · ${student.name}`,
        counterpartyName: student.name, amountCents: plan.monthlyPriceCents, dueDate, planId: plan.id,
        teacherId, recurrenceId: recurrence.id, playerId: student.playerId, paymentMethod: "Boleto",
        notes: current ? "Mensalidade do novo ciclo anual." : "Mensalidade do primeiro ciclo anual.",
      } });
      if (month === 0) firstEntryId = entry.id;
      lastDueDate = dueDate;
      dueDate = getNextFinancialRecurrenceDate(dueDate, "MONTHLY");
    }
    await tx.financialRecurrence.update({ where: { id: recurrence.id }, data: { endsAt: lastDueDate, nextDueDate: dueDate } });
  });

  if (firstEntryId) {
    try { await issueRecurringOnlineChargeForEntry(auth.arenaId, firstEntryId); }
    catch (error) { console.error("Could not issue the initial plan boleto", error); }
  }
  refreshFinanceRoutes();
}

export async function recordPlanPaymentAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:settle");
  const parsed = paymentSchema.safeParse({
    bankAccountId: formData.get("bankAccountId"),
    subscriptionId: formData.get("subscriptionId"),
    referenceMonth: formData.get("referenceMonth"),
    paidAt: formData.get("paidAt"),
    paymentMethod: formData.get("paymentMethod"),
    amount: formData.get("amount")
    , fiscalDocumentType: formData.get("fiscalDocumentType")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const subscription = await withArenaTransaction(auth.arenaId, (tx) => tx.studentSubscription.findFirst({
    where: {
      id: parsed.data.subscriptionId,
      arenaId: auth.arenaId,
      status: "ACTIVE"
    },
    include: {
      student: true,
      plan: true
    }
  }));

  if (!subscription) {
    throw new Error("Assinatura não encontrada.");
  }

  const paidAt = parseDate(parsed.data.paidAt) ?? new Date();
  const referenceMonth = getReferenceMonthRange(parsed.data.referenceMonth);

  await withArenaTransaction(auth.arenaId, async (tx) => {
    const recurrences = await tx.financialRecurrence.findMany({
      where: planRecurrenceOwnerWhere({
        arenaId: auth.arenaId,
        planId: subscription.planId,
        studentId: subscription.studentId,
        studentName: subscription.student.name,
        playerId: subscription.student.playerId,
        startedAt: subscription.startedAt,
      }),
      select: { id: true },
    });
    if (!recurrences.length) throw new Error("Não há mensalidades deste ciclo para quitar. Confira a assinatura selecionada.");
    const where = {
      arenaId: auth.arenaId,
      type: "REVENUE",
      recurrenceId: { in: recurrences.map(({ id }) => id) },
      dueDate: { gte: referenceMonth.start, lt: referenceMonth.end },
    } as const;
    const entryIds = await tx.financialEntry.findMany({ where, select: { id: true } });
    if (entryIds.length !== 1) throw new Error("Não foi encontrada uma mensalidade única para este mês neste ciclo. Confira em Contas a Receber.");
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id = ${entryIds[0].id} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const entry = await tx.financialEntry.findFirst({
      where: { ...where, id: entryIds[0].id, status: "PENDING" },
      include: {
        settlements: { select: { amountCents: true, interestCents: true, discountCents: true } },
        fiscalDocument: { select: { id: true } },
        onlinePaymentItems: { select: { checkout: { select: { status: true, mercadoPagoPaymentId: true, checkoutUrl: true } } } },
      },
    });
    if (!entry) throw new Error("Esta mensalidade já foi quitada ou não está disponível para baixa.");
    if (hasUnresolvedOnlinePayment(entry)) {
      throw new Error("Esta mensalidade já possui cobrança online emitida ou em emissão. Confira e concilie o pagamento em Contas a Receber.");
    }
    const before = getFinancialEntryBalance(entry.amountCents, entry.settlements);
    const amountCents = parsed.data.amount ? parseMoneyToCents(parsed.data.amount) : before.outstandingCents;
    if (amountCents <= 0 || amountCents > before.outstandingCents) throw new Error("Informe um valor maior que zero e até o saldo pendente da mensalidade.");
    if (parsed.data.fiscalDocumentType && (before.paidCents > 0 || amountCents !== before.outstandingCents || entry.fiscalDocument)) {
      throw new Error("Para emitir documento fiscal por este formulário, quite o valor integral da mensalidade ainda sem baixas. Confira as baixas parciais em Contas a Receber.");
    }
    const bankAccountId = await requireReceivingBankAccount(tx, auth.arenaId, parsed.data.bankAccountId);
    const after = getFinancialEntryBalance(entry.amountCents, [...entry.settlements, { amountCents, interestCents: 0 }]);
    await tx.financialSettlement.create({ data: {
      arenaId: auth.arenaId,
      financialEntryId: entry.id,
      bankAccountId,
      amountCents,
      interestCents: 0,
      paymentMethod: parsed.data.paymentMethod || "Não informado",
      paidAt,
      notes: `Pagamento da mensalidade de ${parsed.data.referenceMonth}.`,
    } });
    await tx.financialEntry.update({ where: { id: entry.id }, data: {
      bankAccountId,
      status: after.settled ? "PAID" : "PENDING",
      paidAt: after.settled ? paidAt : null,
      paymentMethod: parsed.data.paymentMethod || "Não informado",
    } });
    if (parsed.data.fiscalDocumentType) await issueManualFiscalDocument(tx, {
      arenaId: auth.arenaId,
      documentType: parsed.data.fiscalDocumentType as FiscalDocumentType,
      totalCents: amountCents,
      customerName: subscription.student.name,
      financialEntryId: entry.id,
    });
  });

  refreshFinanceRoutes();
}

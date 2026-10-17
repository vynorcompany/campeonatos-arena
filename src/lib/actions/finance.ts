"use server";

import { revalidatePath } from "next/cache";
import { requireFinancialEntryDelete, requireModuleEdit, requirePermission } from "@/lib/auth/guards";
import {
  getReferenceMonthRange,
  parseDate,
  parseMoneyToCents
} from "@/lib/finance/inputs";
import { employeePayrollSchema } from "@/lib/finance/employee-payroll";
import { saveEmployeePayroll } from "@/lib/finance/employee-payroll-service";
import { Prisma } from "@prisma/client";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { assertFinancialEntryRelationsBelongToArena } from "@/lib/finance/entry-relations";
import { getDiscountedAmountCents } from "@/lib/finance/discounts";
import { getCouponValues } from "@/lib/finance/coupons";
import { getFinancialRecurrenceDates, getNextFinancialRecurrenceDate } from "@/lib/finance/recurrences";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { encryptConnectionSecrets } from "@/lib/payments/connection-secrets";
import { createBoletoPayment, createPixPayment, getMissingBoletoPayerFields } from "@/lib/payments/mercado-pago";
import { hasExistingOnlineCharge } from "@/lib/payments/existing-online-charge";
import { claimFinancialOnlineCharge } from "@/lib/payments/financial-online-charge-claim";
import { issueRecurringOnlineChargeForEntry } from "@/lib/payments/recurring-online-charges";
import { lockStudentPlanSubscription } from "@/lib/academy/subscription-lock";
import { planRecurrenceOwnerWhere } from "@/lib/academy/plan-recurrence-owner";
import { issueManualFiscalDocument, type FiscalDocumentType } from "@/lib/fiscal/manual-issuance";
import { refreshFinanceRoutes, refreshFinancialSettings } from "@/lib/finance/revalidation";
import {
  bankBalanceSchema,
  bulkDeleteEntrySchema,
  bulkEntrySchema,
  couponSchema,
  couponToggleSchema,
  deleteCouponSchema,
  deleteSupplierSchema,
  entrySchema,
  financialCategoryDeleteSchema,
  financialCategoryUpdateSchema,
  financialSettingSchema,
  fiscalSettingsSchema,
  onlineChargeSchema,
  onlinePaymentSettingsSchema,
  paymentConnectionSchema,
  paymentSchema,
  planSchema,
  productCategorySchema,
  recurrenceSchema,
  settlementSchema,
  subscriptionSchema,
  supplierUpdateSchema,
  teacherMonthlyPayableSchema,
  updateCouponSchema,
  updateEntrySchema,
  voidEntrySchema,
} from "@/lib/finance/action-schemas";


export async function createPlanAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = planSchema.safeParse({
    name: formData.get("name"),
    monthlyPrice: formData.get("monthlyPrice"),
    classesPerMonth: formData.get("classesPerMonth"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.plan.create({
    data: {
      arenaId: auth.arenaId,
      createdByUserId: auth.userId,
      updatedByUserId: auth.userId,
      name: parsed.data.name,
      monthlyPriceCents: parseMoneyToCents(parsed.data.monthlyPrice),
      classesPerMonth: parsed.data.classesPerMonth,
      notes: parsed.data.notes
    }
  });

  refreshFinanceRoutes();
}

export async function createSubscriptionAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
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
    for (let month = 0; month < 12; month += 1) {
      const entry = await tx.financialEntry.create({ data: {
        arenaId: auth.arenaId, type: "REVENUE", category: "Planos de aulas", description: `${plan.name} · ${student.name}`,
        counterpartyName: student.name, amountCents: plan.monthlyPriceCents, dueDate, planId: plan.id,
        teacherId, recurrenceId: recurrence.id, playerId: student.playerId, paymentMethod: "Boleto",
        notes: current ? "Mensalidade do novo ciclo anual." : "Mensalidade do primeiro ciclo anual.",
      } });
      if (month === 0) firstEntryId = entry.id;
      dueDate = getNextFinancialRecurrenceDate(dueDate, "MONTHLY");
    }
    await tx.financialRecurrence.update({ where: { id: recurrence.id }, data: { nextDueDate: dueDate } });
  });

  if (firstEntryId) {
    try { await issueRecurringOnlineChargeForEntry(auth.arenaId, firstEntryId); }
    catch (error) { console.error("Could not issue the initial plan boleto", error); }
  }
  refreshFinanceRoutes();
}

export async function recordPlanPaymentAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = paymentSchema.safeParse({
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
        settlements: { select: { amountCents: true, interestCents: true } },
        fiscalDocument: { select: { id: true } },
        onlinePaymentItems: { select: { checkout: { select: { status: true, mercadoPagoPaymentId: true, checkoutUrl: true } } } },
      },
    });
    if (!entry) throw new Error("Esta mensalidade já foi quitada ou não está disponível para baixa.");
    const groupedPaymentInProgress = entry.onlinePaymentItems.some(({ checkout }) =>
      checkout.status === "REVIEW" || (checkout.status === "PENDING" && Boolean(checkout.mercadoPagoPaymentId || checkout.checkoutUrl))
    );
    if (entry.onlinePaymentId || entry.onlinePaymentUrl || entry.onlinePaymentClaimedAt || groupedPaymentInProgress) {
      throw new Error("Esta mensalidade já possui cobrança online emitida ou em emissão. Confira e concilie o pagamento em Contas a Receber.");
    }
    const before = getFinancialEntryBalance(entry.amountCents, entry.settlements);
    const amountCents = parsed.data.amount ? parseMoneyToCents(parsed.data.amount) : before.outstandingCents;
    if (amountCents <= 0 || amountCents > before.outstandingCents) throw new Error("Informe um valor maior que zero e até o saldo pendente da mensalidade.");
    if (parsed.data.fiscalDocumentType && (before.paidCents > 0 || amountCents !== before.outstandingCents || entry.fiscalDocument)) {
      throw new Error("Para emitir documento fiscal por este formulário, quite o valor integral da mensalidade ainda sem baixas. Confira as baixas parciais em Contas a Receber.");
    }
    const after = getFinancialEntryBalance(entry.amountCents, [...entry.settlements, { amountCents, interestCents: 0 }]);
    await tx.financialSettlement.create({ data: {
      arenaId: auth.arenaId,
      financialEntryId: entry.id,
      amountCents,
      interestCents: 0,
      paymentMethod: parsed.data.paymentMethod || "Não informado",
      paidAt,
      notes: `Pagamento da mensalidade de ${parsed.data.referenceMonth}.`,
    } });
    await tx.financialEntry.update({ where: { id: entry.id }, data: {
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

export async function createFinancialEntryAction(formData: FormData) {
  const auth = await requirePermission("finance:settings:manage");
  const clientId = String(formData.get("clientId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const parsed = entrySchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description"),
    counterpartyName: formData.get("counterpartyName"),
    supplierId: formData.get("supplierId") ?? "",
    bankAccountId: formData.get("bankAccountId"),
    planId: formData.get("planId"),
    productId: formData.get("productId"),
    amount: formData.get("amount"),
    discount: formData.get("discount"),
    discountMode: formData.get("discountMode"),
    paymentMethod: formData.get("paymentMethod"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    paidAt: formData.get("paidAt") ?? "",
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const discount = parsed.data.discountMode === "PERCENTAGE" ? Number(parsed.data.discount.replace(",", ".")) : parseMoneyToCents(parsed.data.discount);
  if (!Number.isFinite(discount)) throw new Error("Informe um desconto válido.");
  const amountCents = getDiscountedAmountCents(parseMoneyToCents(parsed.data.amount), discount, parsed.data.discountMode);
  const dueDate = parseDate(parsed.data.dueDate);
  const paidAt = parsed.data.status === "PAID" ? parseDate(parsed.data.paidAt) ?? new Date() : parseDate(parsed.data.paidAt);
  let enrollmentNotice = "";
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await assertFinancialEntryRelationsBelongToArena(tx, auth.arenaId, {
      supplierId: parsed.data.supplierId,
      bankAccountId: parsed.data.bankAccountId,
      planId: parsed.data.planId,
      productId: parsed.data.productId,
      playerId: parsed.data.type === "REVENUE" ? clientId : null,
    });
    const teacherPlan = parsed.data.type === "REVENUE" && parsed.data.planId && teacherId
      ? await tx.teacherPlan.findFirst({ where: { arenaId: auth.arenaId, teacherId, planId: parsed.data.planId, active: true }, include: { plan: { select: { classesPerMonth: true } }, teacher: { select: { name: true } } } })
      : null;
    if (parsed.data.type === "REVENUE" && parsed.data.planId && teacherId && !teacherPlan) {
      throw new Error("O plano selecionado não pertence a este professor nesta arena.");
    }
    let supplierId = parsed.data.supplierId || null;
    if (parsed.data.type === "EXPENSE" && parsed.data.counterpartyName && !supplierId) {
      const supplier = await tx.supplier.upsert({
        where: { arenaId_name: { arenaId: auth.arenaId, name: parsed.data.counterpartyName } },
        update: {}, create: { arenaId: auth.arenaId, name: parsed.data.counterpartyName }
      });
      supplierId = supplier.id;
    }
    const entry = await tx.financialEntry.create({
      data: {
        arenaId: auth.arenaId,
        source: "MANUAL",
        type: parsed.data.type,
        category: parsed.data.category,
        description: parsed.data.description,
        counterpartyName: parsed.data.counterpartyName,
        supplierId,
        bankAccountId: parsed.data.bankAccountId || null,
        planId: parsed.data.planId || null,
        teacherId: teacherPlan?.teacherId ?? null,
        productId: parsed.data.productId || null,
        playerId: parsed.data.type === "REVENUE" && clientId ? clientId : null,
        amountCents,
        paymentMethod: parsed.data.paymentMethod,
        status: parsed.data.status,
        dueDate,
        paidAt,
        notes: parsed.data.notes
      }
    });
    if (parsed.data.status === "PAID") {
      await tx.financialSettlement.create({ data: {
        arenaId: auth.arenaId,
        financialEntryId: entry.id,
        amountCents,
        interestCents: 0,
        paymentMethod: parsed.data.paymentMethod || "Não informado",
        paidAt: paidAt ?? new Date(),
        notes: "Baixa registrada na criação do lançamento."
      } });
    }
    if (parsed.data.type === "REVENUE" && parsed.data.planId && clientId && teacherPlan) {
      await lockStudentPlanSubscription(tx, auth.arenaId, clientId, parsed.data.planId);
      const client = await tx.player.findFirst({ where: { id: clientId, arenaId: auth.arenaId, active: true }, select: { id: true, name: true, phone: true } });
      if (client) {
        const student = await tx.student.upsert({
          where: { playerId: client.id },
          update: { active: true, name: client.name, phone: client.phone },
          create: { arenaId: auth.arenaId, playerId: client.id, name: client.name, phone: client.phone },
        });
        await tx.teacherStudent.upsert({
          where: { teacherId_studentId: { teacherId, studentId: student.id } },
          update: { active: true },
          create: { arenaId: auth.arenaId, teacherId, studentId: student.id },
        });
        const subscription = await tx.studentSubscription.findFirst({ where: { arenaId: auth.arenaId, studentId: student.id, planId: parsed.data.planId, status: "ACTIVE" }, select: { id: true } });
        if (!subscription) await tx.studentSubscription.create({ data: { arenaId: auth.arenaId, studentId: student.id, planId: parsed.data.planId, monthlyPriceCents: teacherPlan.monthlyPriceCents, classesPerMonth: teacherPlan.plan.classesPerMonth } });
        const enrollment = await tx.classGroupEnrollment.findFirst({ where: { arenaId: auth.arenaId, studentId: student.id, status: "ACTIVE", classGroup: { teacherId, active: true, plans: { some: { planId: parsed.data.planId } } } }, select: { id: true } });
        if (!enrollment) enrollmentNotice = `${client.name} foi incluído no plano de ${teacherPlan.teacher.name}. Agora atribua-o a uma turma em Alunos ativos.`;
      }
    }
  });

  refreshFinanceRoutes();
  return enrollmentNotice ? { notice: enrollmentNotice } : undefined;
}

export async function updateFinancialEntryAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = updateEntrySchema.safeParse({
    entryId: formData.get("entryId"),
    category: formData.get("category"),
    description: formData.get("description"),
    counterpartyName: formData.get("counterpartyName"),
    bankAccountId: formData.get("bankAccountId"),
    planId: formData.get("planId"),
    productId: formData.get("productId"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const amountCents = parseMoneyToCents(parsed.data.amount);
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const entry = await tx.financialEntry.findFirst({
      where: { id: parsed.data.entryId, arenaId: auth.arenaId, status: { not: "VOIDED" } },
      include: { settlements: { select: { amountCents: true } } },
    });
    if (!entry) throw new Error("Lançamento não encontrado ou estornado.");
    if (entry.source === "AGENCY_SUBSCRIPTION") throw new Error("Esta fatura é gerenciada pela agência e não pode ser alterada aqui.");
    await assertFinancialEntryRelationsBelongToArena(tx, auth.arenaId, {
      bankAccountId: parsed.data.bankAccountId,
      planId: parsed.data.planId,
      productId: parsed.data.productId,
    });

    const paidCents = entry.settlements.reduce((total, settlement) => total + settlement.amountCents, 0);
    if (amountCents < paidCents) throw new Error("O valor não pode ser menor que o total já baixado.");
    const nextPlanId = parsed.data.planId || null;
    const keepsTeacher = entry.teacherId && nextPlanId && (entry.planId === nextPlanId || await tx.teacherPlan.findFirst({ where: { arenaId: auth.arenaId, teacherId: entry.teacherId, planId: nextPlanId, active: true }, select: { id: true } }));

    await tx.financialEntry.update({
      where: { id: entry.id },
      data: {
        counterpartyName: parsed.data.counterpartyName,
        category: parsed.data.category,
        description: parsed.data.description,
        amountCents,
        dueDate: parseDate(parsed.data.dueDate),
        notes: parsed.data.notes,
        bankAccountId: parsed.data.bankAccountId || null,
        planId: nextPlanId,
        teacherId: keepsTeacher ? entry.teacherId : null,
        productId: parsed.data.productId || null,
      },
    });
  });
  refreshFinanceRoutes();
}

export async function createFinancialRecurrenceAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:create");
  const clientId = String(formData.get("clientId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const parsed = recurrenceSchema.safeParse({
    type: formData.get("type"),
    counterpartyName: formData.get("counterpartyName"), category: formData.get("category"), description: formData.get("description"),
    amount: formData.get("amount"), discount: formData.get("discount"), discountMode: formData.get("discountMode"), frequency: formData.get("frequency"), startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"), bankAccountId: formData.get("bankAccountId"), planId: formData.get("planId"), onlinePaymentMethod: formData.get("onlinePaymentMethod"), notes: formData.get("notes")
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const startsAt = parseDate(parsed.data.startsAt);
  const endsAt = parseDate(parsed.data.endsAt);
  if (!startsAt) return { error: "Data inicial inválida." };
  if (endsAt && endsAt < startsAt) return { error: "A data final deve ser posterior à inicial." };
  const discount = parsed.data.discountMode === "PERCENTAGE" ? Number(parsed.data.discount.replace(",", ".")) : parseMoneyToCents(parsed.data.discount);
  if (!Number.isFinite(discount)) return { error: "Informe um desconto válido." };
  const amountCents = getDiscountedAmountCents(parseMoneyToCents(parsed.data.amount), discount, parsed.data.discountMode);
  if (parsed.data.onlinePaymentMethod === "BOLETO") {
    if (amountCents < 500) return { error: "Boleto recorrente exige valor mínimo de R$ 5,00. Ajuste o valor antes de continuar." };
    if (parsed.data.type !== "REVENUE" || !clientId) return { error: "Dados incompletos do cliente: selecione um cliente cadastrado para gerar o boleto recorrente." };
    const player = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findFirst({ where: { id: clientId, arenaId: auth.arenaId, active: true }, select: { email: true, cpf: true, addressZipCode: true, addressStreet: true, addressNumber: true, addressNeighborhood: true, addressCity: true, addressState: true } }));
    const missing = getMissingBoletoPayerFields(player ?? {});
    if (missing.length) return { error: `Dados incompletos do cliente: informe ${missing.join(" e ")} no cadastro de ${parsed.data.counterpartyName} antes de gerar o boleto recorrente.` };
  }

  let firstEntryId = "";
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await assertFinancialEntryRelationsBelongToArena(tx, auth.arenaId, {
      bankAccountId: parsed.data.bankAccountId,
      planId: parsed.data.planId,
      playerId: parsed.data.type === "REVENUE" ? clientId : null,
    });
    const teacherPlan = parsed.data.type === "REVENUE" && parsed.data.planId && teacherId
      ? await tx.teacherPlan.findFirst({ where: { arenaId: auth.arenaId, teacherId, planId: parsed.data.planId, active: true }, select: { teacherId: true } })
      : null;
    if (parsed.data.type === "REVENUE" && parsed.data.planId && teacherId && !teacherPlan) {
      throw new Error("O plano selecionado não pertence a este professor nesta arena.");
    }
    const recurrence = await tx.financialRecurrence.create({ data: {
      arenaId: auth.arenaId, type: parsed.data.type, counterpartyName: parsed.data.counterpartyName, category: parsed.data.category,
      description: parsed.data.description, amountCents, frequency: parsed.data.frequency,
      startsAt, endsAt, nextDueDate: startsAt, bankAccountId: parsed.data.bankAccountId || null, planId: parsed.data.planId || null, teacherId: teacherPlan?.teacherId ?? null,
      playerId: parsed.data.type === "REVENUE" && clientId ? clientId : null, onlinePaymentMethod: parsed.data.onlinePaymentMethod, notes: parsed.data.notes
    } });
    const dates = getFinancialRecurrenceDates(startsAt, parsed.data.frequency, endsAt);
    for (const dueDate of dates) {
      const entry = await tx.financialEntry.create({ data: {
        arenaId: auth.arenaId, type: recurrence.type, counterpartyName: recurrence.counterpartyName, category: recurrence.category,
        description: recurrence.description, amountCents: recurrence.amountCents, dueDate, notes: recurrence.notes,
        recurrenceId: recurrence.id, bankAccountId: recurrence.bankAccountId, planId: recurrence.planId, teacherId: recurrence.teacherId, playerId: recurrence.playerId,
        paymentMethod: recurrence.onlinePaymentMethod === "BOLETO" ? "Boleto" : ""
      } });
      if (!firstEntryId) firstEntryId = entry.id;
    }
    const nextDueDate = getNextFinancialRecurrenceDate(dates.at(-1) ?? startsAt, parsed.data.frequency);
    await tx.financialRecurrence.update({ where: { id: recurrence.id }, data: { nextDueDate } });
  });
  if (parsed.data.onlinePaymentMethod === "BOLETO" && firstEntryId) {
    try {
      const result = await issueRecurringOnlineChargeForEntry(auth.arenaId, firstEntryId);
      refreshFinanceRoutes();
      return result.created
        ? { notice: "Recorrência criada e primeiro boleto emitido. A cobrança já está disponível no Portal do Atleta." }
        : { notice: "Recorrência criada, mas o primeiro boleto ficou pendente de emissão. Verifique os dados do cliente." };
    }
    catch (error) {
      console.error("Could not issue the initial recurring boleto", error);
      refreshFinanceRoutes();
      return { notice: "Recorrência criada, mas o primeiro boleto não pôde ser emitido agora. Verifique a conexão Mercado Pago e tente emitir o lançamento." };
    }
  }
  refreshFinanceRoutes();
}

export async function generateFinancialEntryOnlineChargeAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:settle");
  const parsed = onlineChargeSchema.safeParse({ entryId: formData.get("entryId"), method: formData.get("method") });
  if (!parsed.success) return { error: "Dados da cobrança inválidos." };
  const entry = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.findFirst({ where: { id: parsed.data.entryId, arenaId: auth.arenaId, type: "REVENUE", status: "PENDING" }, include: { settlements: { select: { amountCents: true, interestCents: true } } } }));
  if (!entry) return { error: "Lançamento a receber não encontrado ou já quitado." };
  if (hasExistingOnlineCharge(entry)) return { error: "Este lançamento já possui uma cobrança online. Use ‘Ver cobrança’ no lançamento para consultá-la antes de emitir outra." };
  const playerId = entry.playerId;
  if (!playerId) return { error: "Associe este lançamento a um cliente cadastrado antes de gerar a cobrança online." };
  const player = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findFirst({ where: { id: playerId, arenaId: auth.arenaId, active: true }, select: { name: true, email: true, cpf: true, addressZipCode: true, addressStreet: true, addressNumber: true, addressNeighborhood: true, addressCity: true, addressState: true } }));
  if (!player?.email) return { error: "Informe o e-mail do atleta antes de gerar a cobrança." };
  if (parsed.data.method === "BOLETO") { const missing = getMissingBoletoPayerFields(player); if (missing.length) return { error: `Dados incompletos do cliente: informe ${missing.join(", ")} no cadastro de ${player.name} antes de emitir o boleto.` }; }
  const amountCents = getFinancialEntryBalance(entry.amountCents, entry.settlements).outstandingCents;
  if (!amountCents) return { error: "Este lançamento não possui saldo para cobrar." };
  if (parsed.data.method === "BOLETO" && amountCents < 500) return { error: "Boleto exige valor mínimo de R$ 5,00. Ajuste o lançamento antes de emitir." };
  const claim = await withArenaTransaction(auth.arenaId, (tx) => claimFinancialOnlineCharge(tx, {
    arenaId: auth.arenaId, entryId: entry.id, method: parsed.data.method, expectedAmountCents: amountCents,
  }));
  if (!claim.ok) return { error: claim.error };
  const input = { arenaId: auth.arenaId, amountCents, description: entry.description, payerEmail: player.email, externalReference: entry.id };
  let charge;
  try {
    charge = parsed.data.method === "BOLETO" ? await createBoletoPayment({ ...input, payerCpf: player.cpf, payerName: player.name, payerAddress: player, expiresAt: entry.dueDate ?? undefined }) : await createPixPayment(input);
    if (!charge.paymentId || (!charge.checkoutUrl && !charge.qrCode)) throw new Error("O provedor não retornou um meio de pagamento utilizável.");
  } catch (error) {
    console.error("Could not create online financial charge", error);
    await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.updateMany({
      where: { id: entry.id, arenaId: auth.arenaId, status: "PENDING", onlinePaymentId: "", onlinePaymentUrl: "", onlinePaymentClaimMethod: parsed.data.method, onlinePaymentClaimedAt: claim.claimedAt },
      data: { onlinePaymentClaimedAt: null },
    })).catch((releaseError) => console.error("Could not release failed online charge claim", releaseError));
    return { error: parsed.data.method === "BOLETO" ? "Não foi possível emitir o boleto agora. Verifique a conexão do Mercado Pago e tente novamente." : "Não foi possível gerar o PIX agora. Verifique a conexão do Mercado Pago e tente novamente." };
  }
  const saved = await withArenaTransaction(auth.arenaId, async (tx) => {
    const updated = await tx.financialEntry.updateMany({
      where: { id: entry.id, arenaId: auth.arenaId, status: "PENDING", onlinePaymentId: { in: ["", charge.paymentId] }, onlinePaymentUrl: "", onlinePaymentClaimMethod: parsed.data.method, onlinePaymentClaimedAt: claim.claimedAt },
      data: { onlineProvider: "MERCADO_PAGO", onlinePaymentId: charge.paymentId, onlinePaymentUrl: charge.checkoutUrl, onlinePaymentQrCode: charge.qrCode, onlinePaymentExpiresAt: charge.expiresAt, onlinePaymentPublishedAt: new Date(), onlinePaymentClaimedAt: null },
    });
    if (updated.count) return "saved" as const;
    const current = await tx.financialEntry.findFirst({ where: { id: entry.id, arenaId: auth.arenaId }, select: { status: true, onlinePaymentId: true } });
    if (current?.status === "PAID" && current.onlinePaymentId === charge.paymentId) return "paid" as const;
    await tx.arenaNotification.create({ data: { arenaId: auth.arenaId, type: "ONLINE_CHARGE_PAYMENT_REVIEW", title: "Cobrança online requer conferência", message: "O Mercado Pago criou uma cobrança, mas o lançamento mudou antes de registrá-la. Confira o pagamento e evite emitir outra cobrança até conciliar.", href: "/financeiro/contas-a-receber" } });
    return "review" as const;
  });
  if (saved === "paid") return { error: "O pagamento já foi confirmado. Atualize a página para consultar o lançamento." };
  if (saved === "review") return { error: "A cobrança foi criada, mas o lançamento mudou antes de registrá-la. Confira no Mercado Pago e concilie com a arena antes de tentar novamente." };
  refreshFinanceRoutes();
  return { url: charge.checkoutUrl, code: charge.qrCode, method: parsed.data.method };
}

export async function settleFinancialEntryAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = settlementSchema.safeParse({
    entryId: formData.get("entryId"),
    amount: formData.get("amount"),
    interest: formData.get("interest"),
    paymentMethod: formData.get("paymentMethod"),
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const amountCents = parseMoneyToCents(parsed.data.amount);
  const interestCents = parseMoneyToCents(parsed.data.interest);
  if (amountCents <= 0) throw new Error("Informe um valor recebido maior que zero.");
  const paidAt = parseDate(parsed.data.paidAt) ?? new Date();

  await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id = ${parsed.data.entryId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const entry = await tx.financialEntry.findFirst({
      where: { id: parsed.data.entryId, arenaId: auth.arenaId, status: { in: ["PENDING", "OVERDUE"] } },
      include: { settlements: { select: { amountCents: true, interestCents: true } } }
    });
    if (!entry) throw new Error("Esta conta não está disponível para baixa.");
    if (entry.source === "AGENCY_SUBSCRIPTION") throw new Error("Pague esta fatura pelo link do Mercado Pago. A baixa será automática.");

    const before = getFinancialEntryBalance(entry.amountCents, entry.settlements);
    const allowedCents = before.outstandingCents + interestCents;
    if (amountCents > allowedCents) throw new Error("O valor informado supera o saldo desta conta com os juros.");

    const after = getFinancialEntryBalance(entry.amountCents, [...entry.settlements, { amountCents, interestCents }]);
    await tx.financialSettlement.create({
      data: {
        arenaId: auth.arenaId,
        financialEntryId: entry.id,
        amountCents,
        interestCents,
        paymentMethod: parsed.data.paymentMethod,
        paidAt,
        notes: parsed.data.notes || `Baixa ${entry.type === "REVENUE" ? "recebida" : "paga"} manualmente.`
      }
    });
    await tx.financialEntry.update({
      where: { id: entry.id },
      data: {
        status: after.settled ? "PAID" : entry.status,
        paidAt: after.settled ? paidAt : null,
        paymentMethod: parsed.data.paymentMethod
      }
    });
  });

  refreshFinanceRoutes();
}

export async function settleFinancialEntriesBulkAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = bulkEntrySchema.safeParse({
    entryIds: formData.getAll("entryIds"),
    paymentMethod: formData.get("paymentMethod"),
    paidAt: formData.get("paidAt")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const paidAt = parseDate(parsed.data.paidAt) ?? new Date();
  const settledCount = await withArenaTransaction(auth.arenaId, async (tx) => {
    const entryIds = [...new Set(parsed.data.entryIds)];
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE "arenaId" = ${auth.arenaId} AND id IN (${Prisma.join(entryIds)}) ORDER BY id FOR UPDATE`;
    const entries = await tx.financialEntry.findMany({
      where: { arenaId: auth.arenaId, id: { in: entryIds }, status: { in: ["PENDING", "OVERDUE"] }, source: { not: "AGENCY_SUBSCRIPTION" } },
      include: { settlements: { select: { amountCents: true, interestCents: true } } }
    });
    if (entries.length !== entryIds.length) throw new Error("Uma ou mais contas não estão disponíveis para quitação. Atualize a lista antes de tentar novamente.");
    let count = 0;
    for (const entry of entries) {
      const balance = getFinancialEntryBalance(entry.amountCents, entry.settlements);
      if (balance.outstandingCents <= 0) throw new Error("Uma ou mais contas já estão quitadas. Atualize a lista antes de tentar novamente.");
      await tx.financialSettlement.create({ data: {
        arenaId: auth.arenaId,
        financialEntryId: entry.id,
        amountCents: balance.outstandingCents,
        interestCents: 0,
        paymentMethod: parsed.data.paymentMethod,
        paidAt,
        notes: "Baixa em massa registrada manualmente."
      } });
      await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "PAID", paidAt, paymentMethod: parsed.data.paymentMethod } });
      count += 1;
    }
    return count;
  });
  if (!settledCount) throw new Error("Nenhum lançamento pendente estava disponível para quitação.");
  refreshFinanceRoutes();
}

export async function createTeacherMonthlyPayableAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:settle");
  const parsed = teacherMonthlyPayableSchema.safeParse({
    teacherId: formData.get("teacherId"),
    entryIds: formData.getAll("entryIds"),
    percentage: formData.get("percentage"),
    referenceStart: formData.get("referenceStart"),
    referenceEnd: formData.get("referenceEnd"),
    dueDate: formData.get("dueDate")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const referenceStart = parseDate(parsed.data.referenceStart);
  const referenceEnd = parseDate(parsed.data.referenceEnd);
  const dueDate = parseDate(parsed.data.dueDate);
  if (!referenceStart || !referenceEnd || !dueDate || referenceStart > referenceEnd) {
    throw new Error("Informe um período e vencimento válidos.");
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
    if (!teacher) throw new Error("Professor não encontrado.");

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
      throw new Error("Um ou mais recebimentos não pertencem a este relatório ou não estão quitados.");
    }

    const receivedCents = receivables.reduce((total, entry) => total + entry.amountCents, 0);
    const amountCents = Math.round(receivedCents * (percentageBasisPoints / 10000));
    if (amountCents <= 0) throw new Error("O valor a pagar deve ser maior que zero.");

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

  refreshFinanceRoutes();
  revalidatePath(`/professores/${parsed.data.teacherId}`);
  return { entryId };
}

export async function voidFinancialEntryAction(formData: FormData) {
  const auth = await requirePermission(String(formData.get("type")) === "PAYABLE" ? "finance:payable:create" : "finance:receivable:create");
  const parsed = voidEntrySchema.safeParse({ entryId: formData.get("entryId"), reason: formData.get("reason") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.updateMany({
    where: { id: parsed.data.entryId, arenaId: auth.arenaId, status: { not: "VOIDED" }, source: { not: "AGENCY_SUBSCRIPTION" } },
    data: { status: "VOIDED", voidedAt: new Date(), voidReason: parsed.data.reason }
  }));
  if (!updated.count) throw new Error("Esta conta já foi estornada ou não está disponível.");
  refreshFinanceRoutes();
}

export async function deleteFinancialEntryAction(formData: FormData) {
  const auth = await requireFinancialEntryDelete();
  const parsed = voidEntrySchema.safeParse({ entryId: formData.get("entryId"), reason: "Exclusão autorizada" });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.updateMany({
    where: { id: parsed.data.entryId, arenaId: auth.arenaId, status: { not: "VOIDED" }, source: { not: "AGENCY_SUBSCRIPTION" } },
    data: { status: "VOIDED", voidedAt: new Date(), voidReason: `Excluído por ${auth.userName} em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}.` }
  }));
  if (!updated.count) throw new Error("Este lançamento já foi excluído ou não está disponível.");
  refreshFinanceRoutes();
}

export async function deleteFinancialEntriesBulkAction(formData: FormData) {
  const auth = await requireFinancialEntryDelete();
  const parsed = bulkDeleteEntrySchema.safeParse({ entryIds: formData.getAll("entryIds") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.updateMany({
    where: { id: { in: [...new Set(parsed.data.entryIds)] }, arenaId: auth.arenaId, status: { not: "VOIDED" }, source: { not: "AGENCY_SUBSCRIPTION" } },
    data: { status: "VOIDED", voidedAt: new Date(), voidReason: `Excluído em massa por ${auth.userName} em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}.` }
  }));
  if (!updated.count) throw new Error("Nenhum lançamento estava disponível para exclusão.");
  refreshFinanceRoutes();
}

export async function createFinancialSettingAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = financialSettingSchema.safeParse({
    area: formData.get("area"), name: formData.get("name"), type: formData.get("type"), bankName: formData.get("bankName"), openingBalance: formData.get("openingBalance"), document: formData.get("document"), phone: formData.get("phone"), email: formData.get("email"), notes: formData.get("notes")
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  let openingBalanceCents = 0;
  if (parsed.data.area === "contas-bancarias") {
    try {
      openingBalanceCents = parseMoneyToCents(parsed.data.openingBalance || "0");
    } catch {
      return { error: "Informe um saldo inicial válido, por exemplo 0,00." };
    }
  }
  try {
    await withArenaTransaction(auth.arenaId, async (tx) => {
      if (parsed.data.area === "categorias-financeiras") await tx.financialCategory.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, type: parsed.data.type } });
      if (parsed.data.area === "formas-pagamento") await tx.paymentMethodSetting.create({ data: { arenaId: auth.arenaId, name: parsed.data.name } });
      if (parsed.data.area === "contas-bancarias") await tx.bankAccount.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, bankName: parsed.data.bankName, openingBalanceCents } });
      if (parsed.data.area === "fornecedores") await tx.supplier.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, document: parsed.data.document, phone: parsed.data.phone, email: parsed.data.email, notes: parsed.data.notes } });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return { error: "Já existe uma conta, fornecedor ou categoria com este nome." };
    console.error("Falha ao criar configuração financeira", error);
    return { error: "Não foi possível criar este cadastro agora. Confirme os campos e tente novamente; se persistir, informe o nome da conta ao suporte." };
  }

  refreshFinancialSettings();
}

export async function reconcileBankAccountBalanceAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = bankBalanceSchema.safeParse({ bankAccountId: formData.get("bankAccountId"), balance: formData.get("balance") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const expectedBalanceCents = parseMoneyToCents(parsed.data.balance);

  await withArenaTransaction(auth.arenaId, async (tx) => {
    const account = await tx.bankAccount.findFirst({ where: { id: parsed.data.bankAccountId, arenaId: auth.arenaId }, select: { id: true, name: true, openingBalanceCents: true } });
    if (!account) throw new Error("Conta bancária não encontrada.");
    const [income, expense] = await Promise.all([
      tx.financialEntry.aggregate({ where: { arenaId: auth.arenaId, bankAccountId: account.id, status: "PAID", type: "INCOME" }, _sum: { amountCents: true } }),
      tx.financialEntry.aggregate({ where: { arenaId: auth.arenaId, bankAccountId: account.id, status: "PAID", type: "EXPENSE" }, _sum: { amountCents: true } })
    ]);
    const calculatedBalanceCents = account.openingBalanceCents + (income._sum.amountCents ?? 0) - (expense._sum.amountCents ?? 0);
    const differenceCents = expectedBalanceCents - calculatedBalanceCents;
    if (!differenceCents) throw new Error("O saldo informado já confere com o saldo calculado.");
    await tx.financialEntry.create({ data: {
      arenaId: auth.arenaId,
      bankAccountId: account.id,
      type: differenceCents > 0 ? "INCOME" : "EXPENSE",
      category: "AJUSTE DE SALDO BANCÁRIO",
      description: `Balanço de saldo · ${account.name}`,
      amountCents: Math.abs(differenceCents),
      paymentMethod: "Ajuste de saldo",
      status: "PAID",
      paidAt: new Date(),
      notes: `Saldo conferido: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(expectedBalanceCents / 100)}.`
    } });
  });

  refreshFinanceRoutes();
  refreshFinancialSettings();
}

export async function createProductCategoryAction(formData: FormData) {
  const auth = await requirePermission(String(formData.get("type")) === "PAYABLE" ? "finance:payable:create" : "finance:receivable:create");
  const parsed = productCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  try {
    await withArenaTransaction(auth.arenaId, async (tx) => {
      await tx.productCategory.create({ data: { arenaId: auth.arenaId, name: parsed.data.name } });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) throw new Error("Já existe uma categoria com este nome.");
    throw error;
  }

  refreshFinancialSettings();
}

export async function createCouponAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:settle");
  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    minimumAmount: formData.get("minimumAmount"),
    maxUses: formData.get("maxUses"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  if (parsed.data.discountType === "PERCENTAGE" && parsed.data.discountValue > 100) throw new Error("O desconto percentual não pode passar de 100%.");

  const startsAt = parsed.data.startsAt ? parseDate(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? parseDate(parsed.data.endsAt) : null;
  if ((parsed.data.startsAt && !startsAt) || (parsed.data.endsAt && !endsAt)) throw new Error("Informe datas válidas para o cupom.");
  if (startsAt && endsAt && endsAt < startsAt) throw new Error("A validade final deve ser posterior à inicial.");
  const maxUses = parsed.data.maxUses ? Number(parsed.data.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new Error("Informe um limite de uso válido.");

  try {
    await withArenaTransaction(auth.arenaId, async (tx) => {
      await tx.coupon.create({
        data: {
          arenaId: auth.arenaId,
          code: parsed.data.code.toUpperCase().replace(/\s+/g, ""),
          discountType: parsed.data.discountType,
          discountValue: parsed.data.discountValue,
          minimumAmountCents: parseMoneyToCents(parsed.data.minimumAmount),
          maxUses,
          startsAt,
          endsAt
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) throw new Error("Já existe um cupom com este código.");
    throw error;
  }

  refreshFinancialSettings();
}

export async function updateCouponAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:settle");
  const parsed = updateCouponSchema.safeParse({ couponId: formData.get("couponId"), code: formData.get("code"), discountType: formData.get("discountType"), discountValue: formData.get("discountValue"), minimumAmount: formData.get("minimumAmount"), maxUses: formData.get("maxUses"), startsAt: formData.get("startsAt"), endsAt: formData.get("endsAt"), active: formData.get("active") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const values = getCouponValues(parsed.data);
  try { await withArenaTransaction(auth.arenaId, (tx) => tx.coupon.updateMany({ where: { id: parsed.data.couponId, arenaId: auth.arenaId }, data: { ...values, active: parsed.data.active } })); } catch (error) { if (error instanceof Error && error.message.includes("Unique constraint")) throw new Error("Já existe um cupom com este código."); throw error; }
  refreshFinancialSettings();
}

export async function deleteCouponAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:settle"); const parsed = deleteCouponSchema.safeParse({ couponId: formData.get("couponId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  await withArenaTransaction(auth.arenaId, (tx) => tx.coupon.deleteMany({ where: { id: parsed.data.couponId, arenaId: auth.arenaId } })); refreshFinancialSettings();
}

export async function toggleCouponActiveAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:settle");
  const parsed = couponToggleSchema.safeParse({ couponId: formData.get("couponId"), active: formData.get("active") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.coupon.updateMany({ where: { id: parsed.data.couponId, arenaId: auth.arenaId }, data: { active: parsed.data.active } }));
  if (!updated.count) throw new Error("Cupom não encontrado.");
  refreshFinancialSettings();
}

export async function updateFinancialCategoryAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = financialCategoryUpdateSchema.safeParse({ categoryId: formData.get("categoryId"), name: formData.get("name"), type: formData.get("type") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  try {
    const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.financialCategory.updateMany({ where: { id: parsed.data.categoryId, arenaId: auth.arenaId }, data: { name: parsed.data.name, type: parsed.data.type } }));
    if (!updated.count) throw new Error("Categoria não encontrada.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) throw new Error("Já existe uma categoria com este nome.");
    throw error;
  }
  refreshFinancialSettings();
}

export async function deleteFinancialCategoryAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = financialCategoryDeleteSchema.safeParse({ categoryId: formData.get("categoryId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const deleted = await withArenaTransaction(auth.arenaId, (tx) => tx.financialCategory.deleteMany({ where: { id: parsed.data.categoryId, arenaId: auth.arenaId } }));
  if (!deleted.count) throw new Error("Categoria não encontrada.");
  refreshFinancialSettings();
}

export async function updateSupplierAction(formData: FormData) {
  const auth = await requireModuleEdit("finance"); const parsed = supplierUpdateSchema.safeParse({ supplierId: formData.get("supplierId"), name: formData.get("name"), document: formData.get("document"), phone: formData.get("phone"), email: formData.get("email"), notes: formData.get("notes"), active: formData.get("active") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  try { const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.supplier.updateMany({ where: { id: parsed.data.supplierId, arenaId: auth.arenaId }, data: { name: parsed.data.name, document: parsed.data.document, phone: parsed.data.phone, email: parsed.data.email, notes: parsed.data.notes, active: parsed.data.active } })); if (!updated.count) throw new Error("Fornecedor não encontrado."); } catch (error) { if (error instanceof Error && error.message.includes("Unique constraint")) throw new Error("Já existe um fornecedor com este nome."); throw error; }
  refreshFinancialSettings();
}

export async function deleteSupplierAction(formData: FormData) {
  const auth = await requireModuleEdit("finance"); const parsed = deleteSupplierSchema.safeParse({ supplierId: formData.get("supplierId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  try { await withArenaTransaction(auth.arenaId, (tx) => tx.supplier.deleteMany({ where: { id: parsed.data.supplierId, arenaId: auth.arenaId } })); } catch { throw new Error("Este fornecedor possui lançamentos vinculados. Inative-o em vez de excluir."); }
  refreshFinancialSettings();
}

export async function updateFiscalSettingsAction(formData: FormData) {
  const auth = await requirePermission("finance:receivable:settle");
  const parsed = fiscalSettingsSchema.safeParse({
    provider: formData.get("provider"),
    environment: formData.get("environment"),
    series: formData.get("series"),
    nextNumber: formData.get("nextNumber"),
    notes: formData.get("notes")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const enabled = parsed.data.provider !== "NONE";

  await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.fiscalSettings.upsert({
      where: { arenaId: auth.arenaId },
      create: { arenaId: auth.arenaId, ...parsed.data, enabled },
      update: { ...parsed.data, enabled }
    });
  });
  refreshFinancialSettings();
}

export async function updateOnlinePaymentSettingsAction(formData: FormData) {
  const auth = await requirePermission("finance:payable:create");
  const parsed = onlinePaymentSettingsSchema.safeParse({
    provider: formData.get("provider"),
    webhookUrl: formData.get("webhookUrl"),
    instructions: formData.get("instructions")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const enabled = parsed.data.provider !== "NONE";

  await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.onlinePaymentSettings.upsert({
      where: { arenaId: auth.arenaId },
      create: {
        arenaId: auth.arenaId,
        ...parsed.data,
        enabled,
        pixEnabled: formData.get("pixEnabled") === "on",
        cardEnabled: formData.get("cardEnabled") === "on"
      },
      update: {
        ...parsed.data,
        enabled,
        pixEnabled: formData.get("pixEnabled") === "on",
        cardEnabled: formData.get("cardEnabled") === "on"
      }
    });
  });
  refreshFinancialSettings();
}

export async function connectPaymentProviderAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = paymentConnectionSchema.safeParse({
    provider: formData.get("provider"), environment: formData.get("environment"), accessToken: formData.get("accessToken"),
    clientId: formData.get("clientId"), clientSecret: formData.get("clientSecret"), pixKey: formData.get("pixKey"),
    certificate: formData.get("certificate"), privateKey: formData.get("privateKey"), certificatePassword: formData.get("certificatePassword")
  });
  if (!parsed.success) throw new Error("Dados da conexão inválidos.");

  const data = parsed.data;
  if (data.provider === "ASAAS") {
    if (!data.accessToken) throw new Error("Informe a chave de API do Asaas.");
    const baseUrl = data.environment === "SANDBOX" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
    const response = await fetch(`${baseUrl}/myAccount`, { headers: { access_token: data.accessToken, "User-Agent": "ArenaPadelManager/1.0" }, cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível validar a chave do Asaas. Confira o ambiente e a chave informada.");
    const account = await response.json() as { name?: string; email?: string; id?: string };
    await withArenaTransaction(auth.arenaId, (tx) => tx.paymentConnection.upsert({ where: { arenaId_provider: { arenaId: auth.arenaId, provider: "ASAAS" } }, create: { arenaId: auth.arenaId, provider: "ASAAS", environment: data.environment, status: "CONNECTED", displayName: account.name || "Asaas", accountReference: account.id || account.email || "", encryptedSecrets: encryptConnectionSecrets({ accessToken: data.accessToken }), lastValidatedAt: new Date() }, update: { environment: data.environment, status: "CONNECTED", displayName: account.name || "Asaas", accountReference: account.id || account.email || "", encryptedSecrets: encryptConnectionSecrets({ accessToken: data.accessToken }), lastValidatedAt: new Date(), lastError: "" } }));
  } else {
    if (!data.clientId || !data.clientSecret || !data.pixKey || !data.certificate || !data.privateKey) throw new Error("Informe Client ID, Client Secret, chave PIX, certificado e chave privada do Sicoob.");
    await withArenaTransaction(auth.arenaId, (tx) => tx.paymentConnection.upsert({ where: { arenaId_provider: { arenaId: auth.arenaId, provider: "SICOOB" } }, create: { arenaId: auth.arenaId, provider: "SICOOB", environment: data.environment, status: "CONFIGURED", displayName: "Sicoob", accountReference: data.pixKey, encryptedSecrets: encryptConnectionSecrets({ clientId: data.clientId, clientSecret: data.clientSecret, pixKey: data.pixKey, certificate: data.certificate, privateKey: data.privateKey, certificatePassword: data.certificatePassword }) }, update: { environment: data.environment, status: "CONFIGURED", accountReference: data.pixKey, encryptedSecrets: encryptConnectionSecrets({ clientId: data.clientId, clientSecret: data.clientSecret, pixKey: data.pixKey, certificate: data.certificate, privateKey: data.privateKey, certificatePassword: data.certificatePassword }), lastError: "" } }));
  }
  revalidatePath("/financeiro/configuracoes/pagamentos-online");
}

export async function upsertPayrollEntryAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = employeePayrollSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  await withArenaTransaction(auth.arenaId, tx => saveEmployeePayroll(tx, auth.arenaId, parsed.data));
  refreshFinanceRoutes();
}

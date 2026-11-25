"use server";
import { lockTournamentRegistrationEntriesForReceipt, syncTournamentRegistrationAfterReceipt } from "@/lib/tournaments/registration-receivable";
import { boletoPayerDocument } from "@/lib/payments/boleto-payer";
import { creationComposition, revisedLedgerOriginal } from "@/lib/finance/ledger-composition";
import { entryAdjustedAmount, entryAdjustmentNotes } from "@/lib/finance/entry-adjustments";
import { splitCardEntry } from "@/lib/finance/split-card-entry";
import { readCardInstallmentCount, readCardInstallmentRows } from "@/lib/finance/card-installments";
import { createCardInstallmentEntries } from "@/lib/finance/card-installment-service";
import { resolvePayablePayee } from "@/lib/finance/payable-payee";
import { StaleRecordError, staleRecordMessage, expectedRecordDate, assertRecordVersion, recordVersion } from "@/lib/record-version";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { requireFinancialEntryDelete, requirePermission } from "@/lib/auth/guards";
import { requireArenaAccess } from "@/lib/auth/session";
import { parseDate, parseMoneyToCents } from "@/lib/finance/inputs";
import { Prisma } from "@prisma/client";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { assertFinancialEntryRelationsBelongToArena } from "@/lib/finance/entry-relations";
import { getFinancialRecurrenceDateAt, getFinancialRecurrenceDates } from "@/lib/finance/recurrences";
import { withArenaTransaction } from "@/lib/rls";
import { createBoletoPayment, createPixPayment, getMissingBoletoPayerFields } from "@/lib/payments/mercado-pago";
import { hasExistingOnlineCharge } from "@/lib/payments/existing-online-charge";
import { claimFinancialOnlineCharge } from "@/lib/payments/financial-online-charge-claim";
import { issueRecurringOnlineChargeForEntry } from "@/lib/payments/recurring-online-charges";
import { lockStudentPlanSubscription } from "@/lib/academy/subscription-lock";
import { refreshFinanceRoutes } from "@/lib/finance/revalidation";
import { bulkDeleteEntrySchema, bulkEntrySchema, entrySchema, onlineChargeSchema, recurrenceSchema, settlementSchema, updateEntrySchema, voidEntrySchema } from "@/lib/finance/action-schemas";
import { assertFinancialEntryPermission, hasUnresolvedOnlinePayment } from "@/lib/actions/finance/shared";

export async function createFinancialEntryAction(formData: FormData) {
  const auth = await requireArenaAccess();
  const installmentCount=readCardInstallmentCount(formData);
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
    interest: formData.get("interest"),
    discount: formData.get("discount"),
    discountMode: formData.get("discountMode"),
    paymentMethod: formData.get("paymentMethod"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    competenceDate: formData.get("competenceDate") ?? "",
    paidAt: formData.get("paidAt") ?? "",
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  if(installmentCount && (parsed.data.status==="PAID" || parsed.data.planId))return {error:"Para parcelar, mantenha o lançamento em aberto e sem vínculo direto a um plano de aulas."};
  if (parsed.data.paymentMethod === "RESERVATION_CREDIT") return {error:"Use o saldo de reservas pela grade de horários."};
  if(parsed.data.status === "PAID" && ["CREDIT_BALANCE","Saldo de crédito"].includes(parsed.data.paymentMethod??"")) return {error:"Crie o lançamento em aberto e use Receber conta para quitar com saldo do cliente ou responsável."};
  assertFinancialEntryPermission(auth, parsed.data.type, "create");
  if (parsed.data.status === "PAID") assertFinancialEntryPermission(auth, parsed.data.type, "settle");

  const discount = parsed.data.discountMode === "PERCENTAGE" ? Number(parsed.data.discount.replace(",", ".")) : parseMoneyToCents(parsed.data.discount);
  if (!Number.isFinite(discount)) throw new Error("Informe um desconto válido.");
  const adjustment = entryAdjustedAmount(parsed.data.amount, parsed.data.discount, parsed.data.discountMode, parsed.data.interest);
  const { amountCents } = adjustment;
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
    const bankAccountId = parsed.data.status === "PAID" && parsed.data.type === "REVENUE" && amountCents > 0
      ? await requireReceivingBankAccount(tx, auth.arenaId, parsed.data.bankAccountId)
      : parsed.data.bankAccountId || null;
    const payee = parsed.data.type === "EXPENSE" ? await resolvePayablePayee(tx, auth.arenaId, formData, parsed.data.counterpartyName) : null;
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
    const entryData = {
        arenaId: auth.arenaId,
        source: "MANUAL",
        type: parsed.data.type,
        category: parsed.data.category,
        description: parsed.data.description,
        ...(payee ?? { counterpartyName: parsed.data.counterpartyName, supplierId: parsed.data.supplierId || null }),
        bankAccountId,
        planId: parsed.data.planId || null,
        teacherId: teacherPlan?.teacherId ?? null,
        productId: parsed.data.productId || null,
        playerId: payee ? payee.playerId : clientId || null,
        amountCents,
        ...creationComposition(adjustment),
        paymentMethod: parsed.data.paymentMethod,
        status: parsed.data.status,
        dueDate,
        competenceDate: parseDate(parsed.data.competenceDate),
        paidAt,
        notes: entryAdjustmentNotes(parsed.data.notes,adjustment)
    };
    const entry=installmentCount ? await createCardInstallmentEntries(tx,entryData,installmentCount,String(formData.get("installmentRequestId")??""),readCardInstallmentRows(formData)) : await tx.financialEntry.create({data:entryData});
    if (parsed.data.status === "PAID") {
      await tx.financialSettlement.create({ data: {
        arenaId: auth.arenaId,
        financialEntryId: entry.id,
        bankAccountId,
        amountCents,
        interestCents: 0,
        paymentMethod: parsed.data.paymentMethod || "Não informado",
        paidAt: paidAt ?? new Date(),
        notes: "Baixa registrada na criação do lançamento."
      } });
    }

  });

  refreshFinanceRoutes();
  return enrollmentNotice ? { notice: enrollmentNotice } : undefined;
}

export async function updateFinancialEntryAction(formData: FormData) {
  const auth = await requireArenaAccess();
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
    competenceDate: formData.get("competenceDate") ?? "",
    notes: formData.get("notes"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const enteredAmountCents = parseMoneyToCents(parsed.data.amount);
  const expectedUpdatedAt = expectedRecordDate(formData.get("expectedUpdatedAt"));
  if (!expectedUpdatedAt) return { error: staleRecordMessage };
  try { await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id = ${parsed.data.entryId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const entry = await tx.financialEntry.findFirst({
      where: { id: parsed.data.entryId, arenaId: auth.arenaId, status: { not: "VOIDED" } },
      include: { settlements: { select: { amountCents: true, discountCents: true, interestCents: true } } },
    });
    if (!entry) throw new Error("Lançamento não encontrado ou estornado.");
    assertFinancialEntryPermission(auth, entry.type, "edit");
    assertRecordVersion(recordVersion(entry.updatedAt), expectedUpdatedAt.toISOString());
    const monetary = revisedLedgerOriginal(entry, enteredAmountCents);
    const { amountCents } = monetary;
    if (entry.source === "TOURNAMENT_REGISTRATION" && amountCents !== entry.amountCents) throw new Error("Altere o valor da inscrição em Eventos para manter o financeiro sincronizado.");
    if (entry.source === "AGENCY_SUBSCRIPTION") throw new Error("Esta fatura é gerenciada pela agência e não pode ser alterada aqui.");
    await assertFinancialEntryRelationsBelongToArena(tx, auth.arenaId, {
      bankAccountId: parsed.data.bankAccountId,
      planId: parsed.data.planId,
      productId: parsed.data.productId,
    });

    const paidCents = entry.settlements.reduce((total, settlement) => total + settlement.amountCents + settlement.discountCents, 0);
    const settledInterestCents = entry.settlements.reduce((total, settlement) => total + settlement.interestCents, 0);
    if (amountCents + settledInterestCents < paidCents) throw new Error("O valor não pode ser menor que o total já baixado.");
    const nextPlanId = parsed.data.planId || null;
    const keepsTeacher = entry.teacherId && nextPlanId && (entry.planId === nextPlanId || await tx.teacherPlan.findFirst({ where: { arenaId: auth.arenaId, teacherId: entry.teacherId, planId: nextPlanId, active: true }, select: { id: true } }));

    const payee = entry.type === "EXPENSE" && formData.has("payeeKind") ? await resolvePayablePayee(tx, auth.arenaId, formData, parsed.data.counterpartyName) : null;
    await tx.financialEntry.update({
      where: { id: entry.id },
      data: {
        ...(payee ?? { counterpartyName: parsed.data.counterpartyName }),
        category: parsed.data.category,
        description: parsed.data.description,
        ...monetary,
        dueDate: parseDate(parsed.data.dueDate),
        competenceDate: parseDate(parsed.data.competenceDate),
        notes: parsed.data.notes,
        bankAccountId: parsed.data.bankAccountId || null,
        planId: nextPlanId,
        teacherId: keepsTeacher ? entry.teacherId : null,
        productId: parsed.data.productId || null,
      },
    });
  }); } catch (error) { if (error instanceof StaleRecordError) return { error: error.message }; throw error; }
  refreshFinanceRoutes();
}

export async function createFinancialRecurrenceAction(formData: FormData) {
  const auth = await requireArenaAccess();
  const clientId = String(formData.get("clientId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const parsed = recurrenceSchema.safeParse({
    type: formData.get("type"),
    counterpartyName: formData.get("counterpartyName"), category: formData.get("category"), description: formData.get("description"),
    amount: formData.get("amount"), interest: formData.get("interest"), discount: formData.get("discount"), discountMode: formData.get("discountMode"), frequency: formData.get("frequency"), startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"), bankAccountId: formData.get("bankAccountId"), planId: formData.get("planId"), onlinePaymentMethod: formData.get("onlinePaymentMethod"), notes: formData.get("notes")
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  assertFinancialEntryPermission(auth, parsed.data.type, "create");
  const startsAt = parseDate(parsed.data.startsAt);
  const endsAt = parseDate(parsed.data.endsAt);
  if (!startsAt) return { error: "Data inicial inválida." };
  if (endsAt && endsAt < startsAt) return { error: "A data final deve ser posterior à inicial." };
  const discount = parsed.data.discountMode === "PERCENTAGE" ? Number(parsed.data.discount.replace(",", ".")) : parseMoneyToCents(parsed.data.discount);
  if (!Number.isFinite(discount)) return { error: "Informe um desconto válido." };
  const adjustment = entryAdjustedAmount(parsed.data.amount, parsed.data.discount, parsed.data.discountMode, parsed.data.interest);
  const { amountCents } = adjustment;
  if (parsed.data.onlinePaymentMethod === "BOLETO") {
    if (amountCents < 500) return { error: "Boleto recorrente exige valor mínimo de R$ 5,00. Ajuste o valor antes de continuar." };
    if (parsed.data.type !== "REVENUE" || !clientId) return { error: "Dados incompletos do cliente: selecione um cliente cadastrado para gerar o boleto recorrente." };
    const player = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findFirst({ where: { id: clientId, arenaId: auth.arenaId, active: true }, select: { email: true, cpf: true, personType: true, cnpj: true, addressZipCode: true, addressStreet: true, addressNumber: true, addressNeighborhood: true, addressCity: true, addressState: true } }));
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
    const payee = parsed.data.type === "EXPENSE" ? await resolvePayablePayee(tx, auth.arenaId, formData, parsed.data.counterpartyName) : null;
    const recurrence = await tx.financialRecurrence.create({ data: {
      arenaId: auth.arenaId, type: parsed.data.type, category: parsed.data.category,
      ...(payee ?? { counterpartyName: parsed.data.counterpartyName }),
      description: parsed.data.description, amountCents, ...creationComposition(adjustment), frequency: parsed.data.frequency,
      startsAt, endsAt, nextDueDate: startsAt, bankAccountId: parsed.data.bankAccountId || null, planId: parsed.data.planId || null, teacherId: teacherPlan?.teacherId ?? null,
      playerId: payee ? payee.playerId : clientId || null, onlinePaymentMethod: parsed.data.onlinePaymentMethod, notes: entryAdjustmentNotes(parsed.data.notes,adjustment)
    } });
    const dates = getFinancialRecurrenceDates(startsAt, parsed.data.frequency, endsAt);
    for (const dueDate of dates) {
      const entry = await tx.financialEntry.create({ data: {
        arenaId: auth.arenaId, type: recurrence.type, counterpartyName: recurrence.counterpartyName, category: recurrence.category,
        description: recurrence.description, amountCents: recurrence.amountCents, ...creationComposition(adjustment), dueDate, notes: recurrence.notes,
        supplierId: recurrence.supplierId, payeeEmployeeId: recurrence.payeeEmployeeId, payeeTeacherId: recurrence.payeeTeacherId,
        recurrenceId: recurrence.id, bankAccountId: recurrence.bankAccountId, planId: recurrence.planId, teacherId: recurrence.teacherId, playerId: recurrence.playerId,
        paymentMethod: recurrence.onlinePaymentMethod === "BOLETO" ? "Boleto" : ""
      } });
      if (!firstEntryId) firstEntryId = entry.id;
    }
    const nextDueDate = getFinancialRecurrenceDateAt(startsAt, parsed.data.frequency, dates.length);
    await tx.financialRecurrence.update({ where: { id: recurrence.id }, data: { nextDueDate } });
  });
  if (parsed.data.onlinePaymentMethod === "BOLETO" && firstEntryId) {
    try {
      const result = await issueRecurringOnlineChargeForEntry(auth.arenaId, firstEntryId);
      refreshFinanceRoutes();
      return result.created
        ? { notice: "Recorrência criada e primeiro boleto emitido. A cobrança já está disponível no VX4." }
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
  const parsed = onlineChargeSchema.safeParse({ bankAccountId: formData.get("bankAccountId"), entryId: formData.get("entryId"), method: formData.get("method"), amount: formData.get("amount"), discount: formData.get("discount"), discountMode: formData.get("discountMode"), interest: formData.get("interest") });
  if (!parsed.success) return { error: "Dados da cobrança inválidos." };
  const entry = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.findFirst({ where: { id: parsed.data.entryId, arenaId: auth.arenaId, type: "REVENUE", status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } }, include: { settlements: { select: { amountCents: true, interestCents: true, discountCents: true } } } }));
  if (!entry) return { error: "Lançamento a receber não encontrado ou já quitado." };
  if (entry.source === "TOURNAMENT_REGISTRATION") return { error: "A cobrança desta inscrição é gerenciada em Eventos. Não emita uma segunda cobrança pelo financeiro." };
  if (hasExistingOnlineCharge(entry)) return { error: "Este lançamento já possui uma cobrança online. Use ‘Ver cobrança’ no lançamento para consultá-la antes de emitir outra." };
  const playerId = entry.billingPlayerId ?? entry.playerId;
  if (!playerId) return { error: "Associe este lançamento a um cliente cadastrado antes de gerar a cobrança online." };
  const player = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findFirst({ where: { id: playerId, arenaId: auth.arenaId, active: true }, select: { name: true, email: true, cpf: true, personType: true, cnpj: true, addressZipCode: true, addressStreet: true, addressNumber: true, addressNeighborhood: true, addressCity: true, addressState: true } }));
  if (!player?.email) return { error: "Informe o e-mail do atleta antes de gerar a cobrança." };
  if (parsed.data.method === "BOLETO") { const missing = getMissingBoletoPayerFields(player); if (missing.length) return { error: `Dados incompletos do cliente: informe ${missing.join(", ")} no cadastro de ${player.name} antes de emitir o boleto.` }; }
  const outstandingCents = getFinancialEntryBalance(entry.amountCents, entry.settlements).outstandingCents;
  if (!outstandingCents) return { error: "Este lançamento não possui saldo para cobrar." };
  const discountValue = parsed.data.discountMode === "PERCENTAGE" ? Number(parsed.data.discount.replace(",", ".")) : parseMoneyToCents(parsed.data.discount);
  if (!Number.isFinite(discountValue) || discountValue < 0 || (parsed.data.discountMode === "PERCENTAGE" && discountValue > 100)) return { error: "Informe um desconto válido." };
  const discountCents = parsed.data.discountMode === "PERCENTAGE" ? Math.round(outstandingCents * discountValue / 100) : discountValue;
  const interestCents = parseMoneyToCents(parsed.data.interest || "0");
  const quotedAmountCents = parsed.data.amount ? parseMoneyToCents(parsed.data.amount) : undefined;
  const claim = await withArenaTransaction(auth.arenaId, (tx) => claimFinancialOnlineCharge(tx, {
    arenaId: auth.arenaId, entryId: entry.id, method: parsed.data.method, expectedAmountCents: outstandingCents, bankAccountId: parsed.data.bankAccountId, discountCents, interestCents, quotedAmountCents,
  }));
  if (!claim.ok) return { error: claim.error };
  const amountCents = claim.amountCents;
  const input = { arenaId: auth.arenaId, amountCents, description: entry.description, payerEmail: player.email, externalReference: entry.id };
  let charge;
  try {
    charge = parsed.data.method === "BOLETO" ? await createBoletoPayment({ ...input, payerCpf: boletoPayerDocument(player), payerName: player.name, payerAddress: player, expiresAt: entry.dueDate ?? undefined }) : await createPixPayment(input);
    if (!charge.paymentId || (!charge.checkoutUrl && !charge.qrCode)) throw new Error("O provedor não retornou um meio de pagamento utilizável.");
  } catch (error) {
    console.error("Could not create online financial charge", error);
    await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.updateMany({
      where: { id: entry.id, arenaId: auth.arenaId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }, onlinePaymentId: "", onlinePaymentUrl: "", onlinePaymentClaimMethod: parsed.data.method, onlinePaymentClaimedAt: claim.claimedAt },
      data: { onlinePaymentClaimedAt: null },
    })).catch((releaseError) => console.error("Could not release failed online charge claim", releaseError));
    return { error: parsed.data.method === "BOLETO" ? "Não foi possível emitir o boleto agora. Verifique a conexão do Mercado Pago e tente novamente." : "Não foi possível gerar o PIX agora. Verifique a conexão do Mercado Pago e tente novamente." };
  }
  const saved = await withArenaTransaction(auth.arenaId, async (tx) => {
    const updated = await tx.financialEntry.updateMany({
      where: { id: entry.id, arenaId: auth.arenaId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }, onlinePaymentId: { in: ["", charge.paymentId] }, onlinePaymentUrl: "", onlinePaymentClaimMethod: parsed.data.method, onlinePaymentClaimedAt: claim.claimedAt },
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
  const auth = await requireArenaAccess();
  const parsed = settlementSchema.safeParse({
    entryId: formData.get("entryId"),
    bankAccountId: formData.get("bankAccountId"),
    discount: formData.get("discount") || "0",
    discountMode: formData.get("discountMode") || "AMOUNT",
    amount: formData.get("amount"),
    interest: formData.get("interest"),
    paymentMethod: formData.get("paymentMethod"),
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const amountCents = parseMoneyToCents(parsed.data.amount);
  const interestCents = parseMoneyToCents(parsed.data.interest);
  if (!Number.isSafeInteger(interestCents) || interestCents < 0 || interestCents > 2147483647) throw new Error("Informe juros válidos, maiores ou iguais a zero.");
  if (!Number.isSafeInteger(amountCents) || amountCents > 2147483647 || amountCents < 0) throw new Error("Informe um valor recebido maior que zero.");
  const paidAt = parseDate(parsed.data.paidAt) ?? new Date();

  const expectedUpdatedAt = expectedRecordDate(formData.get("expectedUpdatedAt"));
  if (!expectedUpdatedAt) return { error: staleRecordMessage };
  try { await withArenaTransaction(auth.arenaId, async (tx) => {
    await lockTournamentRegistrationEntriesForReceipt(tx, auth.arenaId, [parsed.data.entryId]);
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id = ${parsed.data.entryId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const entry = await tx.financialEntry.findFirst({
      where: { id: parsed.data.entryId, arenaId: auth.arenaId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
      include: {
        sale: { select: { comanda: { select: { playerId: true } } } },
        scheduleParticipant: { select: { playerId: true } },
        settlements: { select: { amountCents: true, interestCents: true, discountCents: true } },
        onlinePaymentItems: { select: { checkout: { select: { status: true, mercadoPagoPaymentId: true, checkoutUrl: true } } } },
      }
    });
    if (!entry) throw new Error("Esta conta não está disponível para baixa.");
    assertFinancialEntryPermission(auth, entry.type, "settle");
    assertRecordVersion(recordVersion(entry.updatedAt), expectedUpdatedAt.toISOString());
    if (entry.source === "AGENCY_SUBSCRIPTION") throw new Error("Pague esta fatura pelo link do Mercado Pago. A baixa será automática.");
    if (hasUnresolvedOnlinePayment(entry)) throw new Error("Esta conta possui cobrança online emitida, em emissão ou em análise. Confira e concilie o pagamento antes da baixa manual.");

    if (parsed.data.paymentMethod === "RESERVATION_CREDIT") throw new Error("Use o saldo de reservas pela grade de horários.");
    const usingBalance = ["CREDIT_BALANCE", "Saldo de crédito"].includes(parsed.data.paymentMethod);
    if (usingBalance && !["REVENUE", "INCOME"].includes(entry.type)) throw new Error("Saldo do cliente só pode quitar contas a receber.");
    const bankAccountId = amountCents > 0 && !usingBalance ? await requireReceivingBankAccount(tx, auth.arenaId, parsed.data.bankAccountId) : null;

    const before = getFinancialEntryBalance(entry.amountCents, entry.settlements);
    const discountValue = parsed.data.discountMode === "PERCENTAGE" ? Number(parsed.data.discount.replace(",", ".")) : parseMoneyToCents(parsed.data.discount);
    if (!Number.isFinite(discountValue) || discountValue < 0 || (parsed.data.discountMode === "PERCENTAGE" && discountValue > 100)) throw new Error("Informe um desconto válido.");
    const discountCents = parsed.data.discountMode === "PERCENTAGE" ? Math.round(before.outstandingCents * discountValue / 100) : discountValue;
    if (!Number.isSafeInteger(discountCents) || discountCents > before.outstandingCents) throw new Error("O desconto supera o saldo da conta.");
    if (amountCents === 0 && discountCents === 0) throw new Error("Informe um valor recebido maior que zero.");
    const allowedCents = before.outstandingCents + interestCents - discountCents;
    const appliedCents = Math.min(amountCents, allowedCents);
    const surplusCents = amountCents - appliedCents;
    let creditPlayerId: string | null = null;
    if (surplusCents > 0) {
      const settings = await tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { preventOverpayment: true } });
      if (settings?.preventOverpayment !== false || !["REVENUE", "INCOME"].includes(entry.type)) throw new Error("O valor informado supera o saldo desta conta com os juros.");
      const playerId = entry.billingPlayerId ?? entry.playerId ?? entry.sale?.comanda?.playerId ?? entry.scheduleParticipant?.playerId;
      const player = playerId ? await tx.player.findFirst({ where: { id: playerId, arenaId: auth.arenaId }, select: { id: true } }) : null;
      if (!player) throw new Error("Vincule um cliente da arena para registrar o pagamento excedente como saldo.");
      creditPlayerId = player.id;
    }

    const after = getFinancialEntryBalance(entry.amountCents, [...entry.settlements, { amountCents: appliedCents, interestCents, discountCents }]);
    if (usingBalance && amountCents > 0) {
      const creditOwnerId = entry.billingPlayerId ?? entry.playerId;
      if (!creditOwnerId || surplusCents > 0) throw new Error("Vincule um cliente e informe até o saldo pendente para usar crédito.");
      await tx.$queryRaw`SELECT id FROM "Player" WHERE id=${creditOwnerId} AND "arenaId"=${auth.arenaId} FOR UPDATE`;
      const available = (await tx.clientBalanceMovement.aggregate({ where:{ arenaId:auth.arenaId, playerId:creditOwnerId, kind:"MONEY" }, _sum:{ amountCents:true } }))._sum.amountCents ?? 0;
      if (available < amountCents) throw new Error("Saldo do responsável insuficiente.");
      await tx.clientBalanceMovement.create({ data:{ arenaId:auth.arenaId, playerId:creditOwnerId, kind:"MONEY", amountCents:-amountCents, reason:`Quitação ${entry.id}${entry.playerId !== creditOwnerId ? " · dependente" : ""}` } });
    }
    await tx.financialSettlement.create({
      data: {
        arenaId: auth.arenaId,
        financialEntryId: entry.id,
        bankAccountId,
        amountCents: appliedCents,
        interestCents,
        discountCents,
        paymentMethod: usingBalance ? "CREDIT_BALANCE" : parsed.data.paymentMethod,
        paidAt,
        notes: parsed.data.notes || `Baixa ${entry.type === "REVENUE" ? "recebida" : "paga"} manualmente.`
      }
    });
    await tx.financialEntry.update({
      where: { id: entry.id },
      data: {
        status: after.settled ? "PAID" : entry.status,
        ...(bankAccountId ? { bankAccountId } : {}),
        paidAt: after.settled ? paidAt : null,
        paymentMethod: usingBalance ? "CREDIT_BALANCE" : parsed.data.paymentMethod
      }
    });
    await syncTournamentRegistrationAfterReceipt(tx, auth.arenaId, entry.id);
    if (surplusCents > 0 && creditPlayerId) {
      await tx.clientBalanceMovement.create({ data: { arenaId: auth.arenaId, playerId: creditPlayerId, kind: "MONEY", amountCents: surplusCents, reason: `Excedente recebido na conta ${entry.id}.` } });
      const creditEntry = await tx.financialEntry.create({ data: { arenaId: auth.arenaId, playerId: creditPlayerId, bankAccountId, type: "INCOME", category: "CREDITO_DE_CLIENTE", description: `Crédito por excedente da conta ${entry.id}`, amountCents: surplusCents, status: "PAID", paidAt, paymentMethod: usingBalance ? "CREDIT_BALANCE" : parsed.data.paymentMethod } });
      await tx.financialSettlement.create({ data: { arenaId: auth.arenaId, financialEntryId: creditEntry.id, bankAccountId, amountCents: surplusCents, paymentMethod: usingBalance ? "CREDIT_BALANCE" : parsed.data.paymentMethod, paidAt, notes: `Saldo do cliente originado na baixa da conta ${entry.id}.` } });
      await tx.auditEvent.create({ data: { arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName, action: "RECEIVABLE_SURPLUS_CREDIT", entityId: entry.id, details: { playerId: creditPlayerId, amountCents: surplusCents, creditEntryId: creditEntry.id } } });
    }
  }); } catch (error) { if (error instanceof StaleRecordError) return { error: error.message }; throw error; }

  refreshFinanceRoutes();
}

export async function settleFinancialEntriesBulkAction(formData: FormData) {
  const auth = await requireArenaAccess();
  const parsed = bulkEntrySchema.safeParse({
    entryIds: formData.getAll("entryIds"),
    bankAccountId: formData.get("bankAccountId"),
    paymentMethod: formData.get("paymentMethod"),
    paidAt: formData.get("paidAt")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const paidAt = parseDate(parsed.data.paidAt) ?? new Date();
  if (parsed.data.paymentMethod === "RESERVATION_CREDIT") return {error:"Use o saldo de reservas pela grade de horários."};
  if(["CREDIT_BALANCE","Saldo de crédito"].includes(parsed.data.paymentMethod)) return {error:"Para utilizar saldo do cliente ou responsável, quite cada lançamento individualmente."};
  let versions: Record<string, string>;
  try {
    const value = JSON.parse(String(formData.get("expectedVersions") ?? ""));
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 2000 || Object.values(value).some(item => !expectedRecordDate(item))) throw new Error("Invalid version map");
    versions = value;
  }
  catch { return { error: staleRecordMessage }; }
  let settledCount = 0;
  try { settledCount = await withArenaTransaction(auth.arenaId, async (tx) => {
    const entryIds = [...new Set(parsed.data.entryIds)];
    await lockTournamentRegistrationEntriesForReceipt(tx, auth.arenaId, entryIds);
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE "arenaId" = ${auth.arenaId} AND id IN (${Prisma.join(entryIds)}) ORDER BY id FOR UPDATE`;
    const entries = await tx.financialEntry.findMany({
      where: { arenaId: auth.arenaId, id: { in: entryIds }, status: { in: ["PENDING", "OVERDUE"] }, source: { not: "AGENCY_SUBSCRIPTION" } },
      include: {
        settlements: { select: { amountCents: true, interestCents: true, discountCents: true } },
        onlinePaymentItems: { select: { checkout: { select: { status: true, mercadoPagoPaymentId: true, checkoutUrl: true } } } },
      }
    });
    if (entries.length !== entryIds.length) throw new Error("Uma ou mais contas não estão disponíveis para quitação. Atualize a lista antes de tentar novamente.");
    for (const type of new Set(entries.map((entry) => entry.type))) assertFinancialEntryPermission(auth, type, "settle");
    for (const entry of entries) assertRecordVersion(recordVersion(entry.updatedAt), versions[entry.id]);
    if (entries.some(hasUnresolvedOnlinePayment)) throw new Error("Uma ou mais contas possuem cobrança online emitida, em emissão ou em análise. Confira e concilie antes da baixa em lote.");
    const bankAccountId = await requireReceivingBankAccount(tx, auth.arenaId, parsed.data.bankAccountId);
    let count = 0;
    for (const entry of entries) {
      const balance = getFinancialEntryBalance(entry.amountCents, entry.settlements);
      if (balance.outstandingCents <= 0) throw new Error("Uma ou mais contas já estão quitadas. Atualize a lista antes de tentar novamente.");
      await tx.financialSettlement.create({ data: {
        arenaId: auth.arenaId,
        financialEntryId: entry.id,
        bankAccountId,
        amountCents: balance.outstandingCents,
        interestCents: 0,
        paymentMethod: parsed.data.paymentMethod,
        paidAt,
        notes: "Baixa em massa registrada manualmente."
      } });
      await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "PAID", paidAt, paymentMethod: parsed.data.paymentMethod, bankAccountId } });
      await syncTournamentRegistrationAfterReceipt(tx, auth.arenaId, entry.id);
      count += 1;
    }
    return count;
  }); } catch (error) { if (error instanceof StaleRecordError) return { error: error.message }; throw error; }
  if (!settledCount) throw new Error("Nenhum lançamento pendente estava disponível para quitação.");
  refreshFinanceRoutes();
}

export async function voidFinancialEntryAction(formData: FormData) {
  const auth = await requireArenaAccess();
  const parsed = voidEntrySchema.safeParse({ entryId: formData.get("entryId"), reason: formData.get("reason") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const updated = await withArenaTransaction(auth.arenaId, async (tx) => {
    const entry = await tx.financialEntry.findFirst({ where: { id: parsed.data.entryId, arenaId: auth.arenaId, status: { not: "VOIDED" }, source: { not: "AGENCY_SUBSCRIPTION" } }, select: { type: true } });
    if (!entry) throw new Error("Esta conta já foi estornada ou não está disponível.");
    assertFinancialEntryPermission(auth, entry.type, "edit");
    return tx.financialEntry.updateMany({
      where: { id: parsed.data.entryId, arenaId: auth.arenaId, status: { not: "VOIDED" }, source: { not: "AGENCY_SUBSCRIPTION" } },
      data: { status: "VOIDED", voidedAt: new Date(), voidReason: parsed.data.reason }
    });
  });
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

export async function splitFinancialEntryCardAction(formData:FormData) {
 const auth=await requireArenaAccess();const entryId=String(formData.get("entryId")??"");
 const expected=expectedRecordDate(formData.get("expectedUpdatedAt"));if(!expected)return {error:staleRecordMessage};
 const count=readCardInstallmentCount(formData),firstDueDate=parseDate(String(formData.get("dueDate")??""));if(!count||!firstDueDate)return {error:"Informe as parcelas e o primeiro vencimento."};
 await withArenaTransaction(auth.arenaId,async tx=>{
  const entry=await tx.financialEntry.findFirst({where:{id:entryId,arenaId:auth.arenaId},select:{type:true}});if(!entry)throw new Error("Lançamento não encontrado.");
  assertFinancialEntryPermission(auth,entry.type,"edit");assertFinancialEntryPermission(auth,entry.type,"create");
  await splitCardEntry(tx,auth.arenaId,{entryId,expectedUpdatedAt:expected.toISOString(),count,firstDueDate,requestId:String(formData.get("installmentRequestId")??""),customRows:readCardInstallmentRows(formData)});
 });refreshFinanceRoutes();
}

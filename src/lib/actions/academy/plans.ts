"use server";
import { lessonCreditState, preservePlanCreditBatches } from "@/lib/academy/lesson-credits";
import { readExpiryPolicy } from "@/lib/academy/credit-expiry-policy";
import { createIndependentTeacherPlan } from "@/lib/academy/create-teacher-plan";
import { arenaDatabase } from "@/lib/arena-database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit, requirePermission } from "@/lib/auth/guards";
import { getDiscountedAmountCents } from "@/lib/finance/discounts";
import { getNextFinancialRecurrenceDate } from "@/lib/finance/recurrences";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { cashReferenceDate } from "@/lib/finance/cash-day";
import { issueRecurringOnlineChargeForEntry } from "@/lib/payments/recurring-online-charges";
import { cancelMercadoPagoPayment, getMercadoPagoPayment } from "@/lib/payments/mercado-pago";
import { boletoCancellationDisposition, selectFuturePlanBoletos } from "@/lib/payments/boleto-cancellation";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction, type ArenaTransaction } from "@/lib/rls";
import { lockClassGroupCapacity } from "@/lib/academy/class-group-capacity";
import { lockStudentPlanSubscription } from "@/lib/academy/subscription-lock";
import { planRecurrenceOwnerWhere } from "@/lib/academy/plan-recurrence-owner";
import { parseMoneyToCents } from "@/lib/academy/inputs";
import { refreshAcademyRoutes } from "@/lib/academy/revalidation";
import { getFirstDueDate, parseFormDate } from "@/lib/actions/academy/shared";

export async function createTeacherStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const teacherId = String(formData.get("teacherId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const newStudentName = String(formData.get("newStudentName") ?? "").trim();
  const newStudentPhone = String(formData.get("newStudentPhone") ?? "").trim();
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const teacher = await tx.teacher.findFirst({
      where: { id: teacherId, arenaId: auth.arenaId },
      select: { id: true },
    });
    if (!teacher) throw new Error("Professor não encontrado.");
    const student = studentId
      ? await tx.student.findFirst({
          where: { id: studentId, arenaId: auth.arenaId },
          select: { id: true },
        })
      : newStudentName.length >= 2
        ? await tx.student.upsert({
            where: {
              arenaId_name: { arenaId: auth.arenaId, name: newStudentName },
            },
            update: { active: true, phone: newStudentPhone },
            create: {
              arenaId: auth.arenaId,
              name: newStudentName,
              phone: newStudentPhone,
            },
          })
        : null;
    if (!student) throw new Error("Aluno não encontrado.");
    await tx.teacherStudent.upsert({
      where: { teacherId_studentId: { teacherId: teacher.id, studentId: student.id } },
      update: { active: true },
      create: { arenaId: auth.arenaId, teacherId: teacher.id, studentId: student.id },
    });
  });
  refreshAcademyRoutes();
}

export async function transferTeacherStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const sourceTeacherId = String(formData.get("sourceTeacherId") ?? "");
  const targetTeacherId = String(formData.get("targetTeacherId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!sourceTeacherId || !targetTeacherId || !studentId || sourceTeacherId === targetTeacherId) throw new Error("Selecione outro professor.");
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const [source, target, subscription] = await Promise.all([
      tx.teacher.findFirst({ where: { id: sourceTeacherId, arenaId: auth.arenaId, active: true }, select: { id: true } }),
      tx.teacher.findFirst({ where: { id: targetTeacherId, arenaId: auth.arenaId, active: true }, select: { id: true } }),
      tx.studentSubscription.findFirst({ where: { arenaId: auth.arenaId, studentId, status: "ACTIVE" }, orderBy: { startedAt: "desc" }, select: { planId: true, monthlyPriceCents: true } }),
    ]);
    if (!source || !target) throw new Error("Professor não encontrado.");
    const current = await tx.teacherStudent.findFirst({ where: { teacherId: source.id, studentId, active: true }, select: { id: true } });
    if (!current) throw new Error("O aluno não está vinculado a este professor.");
    await tx.teacherStudent.update({ where: { id: current.id }, data: { active: false } });
    await tx.teacherStudent.upsert({ where: { teacherId_studentId: { teacherId: target.id, studentId } }, update: { active: true }, create: { arenaId: auth.arenaId, teacherId: target.id, studentId } });
    await tx.classGroupEnrollment.updateMany({ where: { arenaId: auth.arenaId, studentId, status: "ACTIVE", classGroup: { teacherId: source.id } }, data: { status: "TRANSFERRED", endedAt: new Date() } });
    if (subscription) await tx.teacherPlan.upsert({ where: { teacherId_planId: { teacherId: target.id, planId: subscription.planId } }, update: { active: true }, create: { arenaId: auth.arenaId, teacherId: target.id, planId: subscription.planId, monthlyPriceCents: subscription.monthlyPriceCents } });
  });
  refreshAcademyRoutes();
}

export async function createTeacherPlanAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const prisma = arenaDatabase(auth.arenaId);
  const teacherId = String(formData.get("teacherId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const [teacher, plan] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: teacherId, arenaId: auth.arenaId },
      select: { id: true },
    }),
    prisma.plan.findFirst({
      where: { id: planId, arenaId: auth.arenaId },
      select: { id: true, monthlyPriceCents: true },
    }),
  ]);
  if (!teacher || !plan) throw new Error("Professor ou plano não encontrado.");
  await prisma.teacherPlan.upsert({
    where: { teacherId_planId: { teacherId, planId } },
    update: { active: true },
    create: { arenaId: auth.arenaId, teacherId, planId, monthlyPriceCents: plan.monthlyPriceCents },
  });
  refreshAcademyRoutes();
}

export async function createTeacherPlanWithPriceAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  try {
    await withArenaTransaction(auth.arenaId, tx => createIndependentTeacherPlan(tx, auth.arenaId, auth.userId, Object.fromEntries(formData)));
    refreshAcademyRoutes();
    revalidatePath(`/professores/${String(formData.get("teacherId") ?? "")}`);
    revalidatePath("/financeiro/planos");
    return {};
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return { error: "Já existe um plano com esse nome. Escolha outro nome." };
    const message = error instanceof Error ? error.message : "";
    const known = ["Selecione o professor.", "Informe o nome do plano.", "Use até 120 caracteres no nome.", "Informe o preço mensal.", "Quantidade de aulas inválida.", "Use até 6.000 caracteres nas observações.", "Valor inválido.", "Professor não encontrado nesta arena."];
    return { error: known.includes(message) ? message : "Não foi possível criar o plano. Revise os dados e tente novamente." };
  }
}

export async function updateTeacherPlanWithPriceAction(formData: FormData) {
  try {
    const auth = await requireModuleEdit("teachers");
    const teacherId = String(formData.get("teacherId") ?? "");
    const planId = String(formData.get("planId") ?? "");
    const parsed = z
      .object({
        monthlyPrice: z.string().trim().min(1),
      })
      .safeParse({
        monthlyPrice: formData.get("monthlyPrice"),
      });
    if (!teacherId || !planId) {
      return { error: "Plano padrão não informado." };
    }
    if (!parsed.success) {
      return { error: "Informe um preço mensal válido." };
    }
    const monthlyPriceCents = parseMoneyToCents(parsed.data.monthlyPrice);

    await withArenaTransaction(auth.arenaId, async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`teacher-prices:${auth.arenaId}:${teacherId}`}, 0))::text`;
      const updated = await tx.teacherPlan.updateMany({ where: { teacherId, planId, arenaId: auth.arenaId, active: true }, data: { monthlyPriceCents } });
      if (!updated.count) throw new Error("Plano não encontrado para este professor.");
      if (formData.has("creditExpiryCycle")) { await preservePlanCreditBatches(tx,auth.arenaId,planId); await tx.plan.updateMany({where:{id:planId,arenaId:auth.arenaId},data:{...readExpiryPolicy(formData),creditPolicyConfiguredAt:new Date(),updatedByUserId:auth.userId}}); }
    });
    refreshAcademyRoutes();
  } catch (error) {
    console.error("Falha ao atualizar plano do professor", error);
    return {
      error:
        "Não foi possível atualizar o preço do plano. Revise os dados e tente novamente.",
    };
  }
}

export async function assignTeacherPlanStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const prisma = arenaDatabase(auth.arenaId);
  const teacherId = String(formData.get("teacherId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const classGroupId = String(formData.get("classGroupId") ?? "");
  if (!teacherId || !planId || !clientId || !classGroupId)
    throw new Error("Selecione o cliente, o plano e a turma de destino.");
  const startedAt =
    parseFormDate(String(formData.get("startedAt") ?? "")) ?? new Date();
  const dueDateInput = parseFormDate(String(formData.get("dueDate") ?? ""));
  const dueDay =
    dueDateInput?.getDate() ??
    Math.min(28, Math.max(1, Number(formData.get("dueDay") ?? 10) || 10));
  // Plan allowances are released by the paid monthly bill, never by enrollment.
  const remainingClasses = 0;
  const enrollmentPaid = formData.get("paid") === "on";
  const paidAt = enrollmentPaid ? parseFormDate(String(formData.get("paidAt") ?? "")) : null;
  const paymentMethod = String(formData.get("paymentMethod") ?? "Boleto").trim();
  const boleto=paymentMethod.toLowerCase()==="boleto";
  if(!paymentMethod)return{error:"Selecione a forma de pagamento."};
  if (enrollmentPaid) {
    const paymentAuth = await requirePermission("finance:receivable:settle");
    if (paymentAuth.arenaId !== auth.arenaId) return { error: "Atualize a arena antes de registrar o pagamento." };
    if (!paidAt || !paymentMethod) return { error: "Informe a data e a forma de pagamento." };
  }
  const discountMode =
    String(formData.get("discountMode") ?? "AMOUNT") === "PERCENTAGE"
      ? "PERCENTAGE"
      : "AMOUNT";
  const discountApplication =
    String(formData.get("discountApplication") ?? "ONE_TIME") === "RECURRING"
      ? "RECURRING"
      : "ONE_TIME";
  const discountRaw = String(formData.get("discount") ?? "0");
  const discount =
    discountMode === "PERCENTAGE"
      ? Number(discountRaw.replace(",", "."))
      : parseMoneyToCents(discountRaw);
  if (!Number.isFinite(discount) || discount < 0)
    throw new Error("Informe um desconto válido.");
  const [teacher, plan, assignment, client, classGroup] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: teacherId, arenaId: auth.arenaId },
      select: { id: true },
    }),
    prisma.plan.findFirst({
      where: { id: planId, arenaId: auth.arenaId },
      select: {
        id: true,
        name: true,
        monthlyPriceCents: true,
        classesPerMonth: true,
      },
    }),
    prisma.teacherPlan.findFirst({
      where: { arenaId: auth.arenaId, teacherId, planId, active: true },
      select: { monthlyPriceCents: true },
    }),
    withArenaTransaction(auth.arenaId, (tx) => tx.player.findFirst({
      where: { id: clientId, arenaId: auth.arenaId, active: true },
      select: { id: true, name: true, phone: true },
    })),
    classGroupId
      ? prisma.classGroup.findFirst({
          where: {
            id: classGroupId,
            arenaId: auth.arenaId,
            teacherId,
            active: true,
          },
          include: {
            plans: { select: { planId: true } },
            schedules: true,
            enrollments: { where: { status: "ACTIVE" }, select: { id: true } },
          },
        })
      : null,
  ]);
  if (!teacher || !plan || !assignment || !client)
    throw new Error("Professor, plano ou cliente não encontrado.");
  const alreadyEnrolled = await prisma.studentSubscription.findFirst({ where: { arenaId: auth.arenaId, planId, status: "ACTIVE", student: { playerId: client.id } }, select: { id: true } });
  if (alreadyEnrolled) return { error: "Este aluno já está inscrito neste plano." };
  if (
    classGroupId &&
    (!classGroup ||
      !classGroup.plans.some(
        ({ planId: groupPlanId }) => groupPlanId === planId,
      ))
  ) {
    throw new Error("Selecione uma turma compatível com o plano.");
  }
  if (
    classGroup &&
    !classGroup.schedules.every(
      (schedule) => classGroup.enrollments.length < schedule.capacity,
    )
  ) {
    throw new Error("A turma selecionada não possui vagas.");
  }
  const discountedAmountCents = getDiscountedAmountCents(
    assignment.monthlyPriceCents,
    discount,
    discountMode,
  );
  const recurringAmountCents =
    discountApplication === "RECURRING"
      ? discountedAmountCents
      : assignment.monthlyPriceCents;
  const firstAmountCents = discountedAmountCents;
  const firstDueDate = dueDateInput ?? getFirstDueDate(startedAt, dueDay);
  let firstEntryId = "";
  try {
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const bankAccountId = ((enrollmentPaid && firstAmountCents > 0) || (boleto && formData.has("paymentMethod"))) ? await requireReceivingBankAccount(tx, auth.arenaId, formData.get("bankAccountId")) : null;
    await lockClassGroupCapacity(tx, auth.arenaId, classGroupId);
    await lockStudentPlanSubscription(tx, auth.arenaId, client.id, planId);
    const alreadyEnrolled = await tx.studentSubscription.findFirst({ where: { arenaId: auth.arenaId, planId, status: "ACTIVE", student: { playerId: client.id } }, select: { id: true } });
    if (alreadyEnrolled) throw new Error("Este aluno já está inscrito neste plano.");
    const currentGroup = await tx.classGroup.findFirst({
      where: { id: classGroupId, arenaId: auth.arenaId, teacherId, active: true },
      include: { plans: { select: { planId: true } }, schedules: true, enrollments: { where: { status: "ACTIVE" }, select: { id: true } } },
    });
    if (!currentGroup || !currentGroup.plans.some((item) => item.planId === planId)) throw new Error("Selecione uma turma compatível com o plano.");
    if (!currentGroup.schedules.length || !currentGroup.schedules.every((schedule) => currentGroup.enrollments.length < schedule.capacity)) throw new Error("A turma selecionada não possui vagas.");
    const student = await tx.student.upsert({
      where: { playerId: client.id },
      update: {
        active: true,
        name: client.name,
        phone: client.phone,

      },
      create: {
        arenaId: auth.arenaId,
        playerId: client.id,
        name: client.name,
        phone: client.phone,
        remainingClasses,
        totalClasses: remainingClasses,
      },
    });
    await tx.teacherStudent.upsert({
      where: { teacherId_studentId: { teacherId, studentId: student.id } },
      update: { active: true },
      create: { arenaId: auth.arenaId, teacherId, studentId: student.id },
    });
    if (classGroup) {
      await tx.classGroupEnrollment.updateMany({
        where: {
          arenaId: auth.arenaId,
          studentId: student.id,
          status: "ACTIVE",
          classGroup: { teacherId, NOT: { id: classGroup.id } },
        },
        data: { status: "TRANSFERRED", endedAt: new Date() },
      });
      await tx.classGroupEnrollment.upsert({
        where: {
          classGroupId_studentId: {
            classGroupId: classGroup.id,
            studentId: student.id,
          },
        },
        update: { status: "ACTIVE", endedAt: null, startedAt: new Date() },
        create: {
          arenaId: auth.arenaId,
          classGroupId: classGroup.id,
          studentId: student.id,
        },
      });
    }
    const note = `Desconto ${discountMode === "PERCENTAGE" ? `${discount}%` : `R$ ${(discount / 100).toFixed(2)}`} ${discountApplication === "RECURRING" ? "recorrente" : "na primeira mensalidade"}.`;
    await tx.studentSubscription.create({
      data: {
        arenaId: auth.arenaId,
        studentId: student.id,
        planId,
        monthlyPriceCents: recurringAmountCents,
        classesPerMonth: plan.classesPerMonth,
        dueDay,
        startedAt,
        notes: note,
      },
    });
    await tx.financialRecurrence.updateMany({
      where: planRecurrenceOwnerWhere({ arenaId: auth.arenaId, planId, studentId: student.id, studentName: student.name, playerId: client.id }),
      data: { active: false },
    });
    const recurrence = await tx.financialRecurrence.create({
      data: {
        arenaId: auth.arenaId,
        type: "REVENUE",
        counterpartyName: client.name,
        category: "Planos de aulas",
        description: `${plan.name} · ${client.name}`,
        amountCents: recurringAmountCents,
        frequency: "MONTHLY",
        startsAt: startedAt,
        nextDueDate: firstDueDate,
        onlinePaymentMethod: boleto?"BOLETO":"",
        bankAccountId,
        planId,
        teacherId,
        playerId: client.id,
        studentId: student.id,
        notes: `Gerado pelo plano do professor. ${note}`,
      },
    });
    const firstEntry = await tx.financialEntry.create({
      data: {
        arenaId: auth.arenaId,
        type: "REVENUE",
        counterpartyName: client.name,
        category: "Planos de aulas",
        description: `${plan.name} · ${client.name}`,
        amountCents: firstAmountCents,
        dueDate: firstDueDate,
        planId,
        teacherId,
        recurrenceId: recurrence.id,
        playerId: client.id,
        status: enrollmentPaid ? "PAID" : "PENDING",
        bankAccountId,
        paidAt,
        paymentMethod,
        notes: `Primeira mensalidade. ${note}`,
      },
    });
    firstEntryId = firstEntry.id;
    if (enrollmentPaid) {
      if (firstAmountCents > 0) await tx.financialSettlement.create({ data: { arenaId: auth.arenaId, financialEntryId: firstEntry.id, bankAccountId, amountCents: firstAmountCents, paymentMethod, paidAt: paidAt! } });
      await lessonCreditState(tx, auth.arenaId, student.id);
    }
    let nextDueDate = getNextFinancialRecurrenceDate(firstDueDate, "MONTHLY");
    let lastDueDate = firstDueDate;
    for (let month = 0; month < 11; month += 1) {
      await tx.financialEntry.create({
        data: {
          arenaId: auth.arenaId,
          type: "REVENUE",
          counterpartyName: client.name,
          category: "Planos de aulas",
          description: `${plan.name} · ${client.name}`,
          amountCents: recurringAmountCents,
          dueDate: nextDueDate,
          planId,
          teacherId,
          recurrenceId: recurrence.id,
          playerId: client.id,
          paymentMethod,
          bankAccountId,
          notes: `Mensalidade recorrente gerada pelo plano do professor. ${note}`,
        },
      });
      lastDueDate = nextDueDate;
      nextDueDate = getNextFinancialRecurrenceDate(nextDueDate, "MONTHLY");
    }
    await tx.financialRecurrence.update({
      where: { id: recurrence.id },
      data: { endsAt: lastDueDate, nextDueDate },
    });
  });
  } catch (error) {
    if (error instanceof Error && error.message === "Este aluno já está inscrito neste plano.") return { error: error.message };
    throw error;
  }
  if (boleto && firstEntryId && !enrollmentPaid && firstAmountCents > 0) {
    try { await issueRecurringOnlineChargeForEntry(auth.arenaId, firstEntryId); }
    catch (error) { console.error("Could not issue the initial plan boleto", error); }
  }
  refreshAcademyRoutes();
  revalidatePath(`/professores/${teacherId}`);
}

export async function copyTeacherPlansAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const prisma = arenaDatabase(auth.arenaId);
  const sourceTeacherId = String(formData.get("sourceTeacherId") ?? "");
  const targetTeacherId = String(formData.get("targetTeacherId") ?? "");
  if (
    !sourceTeacherId ||
    !targetTeacherId ||
    sourceTeacherId === targetTeacherId
  )
    throw new Error("Selecione outro professor para receber os planos.");
  const [source, target] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: sourceTeacherId, arenaId: auth.arenaId, active: true },
      include: {
        planAssignments: {
          where: { active: true },
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                monthlyPriceCents: true,
                classesPerMonth: true,
                notes: true,
              },
            },
          },
        },
      },
    }),
    prisma.teacher.findFirst({
      where: { id: targetTeacherId, arenaId: auth.arenaId, active: true },
      select: { id: true, name: true },
    }),
  ]);
  if (!source || !target) throw new Error("Professor não encontrado.");
  const sourcePlanIds = source.planAssignments.map(({ planId }) => planId);
  await prisma.$transaction(async (tx) => {
    await tx.teacherPlan.updateMany({
      where: {
        arenaId: auth.arenaId,
        teacherId: target.id,
        planId: { in: sourcePlanIds },
        active: true,
      },
      data: { active: false },
    });

      for (const { planId, monthlyPriceCents } of source.planAssignments) {
        await tx.teacherPlan.upsert({
          where: {
              teacherId_planId: { teacherId: target.id, planId },
          },
          update: { active: true, monthlyPriceCents },
          create: {
            arenaId: auth.arenaId,
            teacherId: target.id,
              planId,
              monthlyPriceCents,
          },
      });
    }
  });
  refreshAcademyRoutes();
}

export async function removeTeacherPlanStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const teacherId = String(formData.get("teacherId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const clearRemainingClasses = formData.get("clearRemainingClasses") === "true";
  const cancelOpenBoletosChoice = formData.get("cancelOpenBoletos");
  if (cancelOpenBoletosChoice !== "yes" && cancelOpenBoletosChoice !== "no") {
    throw new Error("Escolha se deseja cancelar também os boletos em aberto.");
  }
  const cancelOpenBoletos = cancelOpenBoletosChoice === "yes";
  const today = cashReferenceDate();
  const [assignment, subscription] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.teacherPlan.findFirst({ where: { teacherId, planId, arenaId: auth.arenaId, active: true }, select: { id: true } }),
    tx.studentSubscription.findFirst({ where: { arenaId: auth.arenaId, studentId, planId, status: "ACTIVE" }, include: { student: { select: { id: true, name: true, playerId: true, remainingClasses: true } } } }),
  ]));
  if (!assignment || !subscription) throw new Error("Vínculo de plano não encontrado.");
  const recurrences = await withArenaTransaction(auth.arenaId, (tx) => tx.financialRecurrence.findMany({
    where: planRecurrenceOwnerWhere({ arenaId: auth.arenaId, planId, studentId: subscription.student.id, studentName: subscription.student.name, playerId: subscription.student.playerId, startedAt: subscription.startedAt }),
    select: { id: true }
  }));
  const recurrenceIds = recurrences.map(({ id }) => id);
  const futureEntriesWhere = {
    arenaId: auth.arenaId, recurrenceId: { in: recurrenceIds }, type: "REVENUE", status: "PENDING", dueDate: { gte: today }
  } as const;
  const assertNoIssuanceInProgress = async (tx: ArenaTransaction) => {
    const issuing = await tx.financialEntry.findFirst({
      where: { ...futureEntriesWhere, onlinePaymentClaimedAt: { not: null }, onlinePaymentId: "" },
      select: { id: true },
    });
    if (issuing) throw new Error("Há um boleto em emissão para este plano. Aguarde a conclusão ou confira a cobrança antes de cancelar.");
  };
  if (recurrenceIds.length) await withArenaTransaction(auth.arenaId, assertNoIssuanceInProgress);
  const handledPaymentIds = new Set<string>();
  const protectedEntryIds = new Set<string>();

  if (cancelOpenBoletos && recurrenceIds.length) {
    const entries = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.findMany({
      where: futureEntriesWhere,
      select: { id: true, onlineProvider: true, onlinePaymentId: true, settlements: { select: { amountCents: true } } }
    }));
    const selection = selectFuturePlanBoletos(entries);
    for (const entryId of selection.protectedEntryIds) protectedEntryIds.add(entryId);
    const issued = selection.issued;
    if (issued.some((entry) => entry.onlineProvider !== "MERCADO_PAGO")) {
      throw new Error("Há um boleto futuro cujo provedor não é o Mercado Pago. O plano não foi cancelado.");
    }
    const payments = await Promise.all(issued.map(async (entry) => ({
      entryId: entry.id,
      id: entry.onlinePaymentId,
      status: String((await getMercadoPagoPayment(auth.arenaId, entry.onlinePaymentId)).status ?? "")
    })));
    const invalid = payments.find((payment) => boletoCancellationDisposition(payment.status) === "unsupported");
    if (invalid) throw new Error(`O boleto ${invalid.id} está com status ${invalid.status || "desconhecido"} no Mercado Pago. O plano não foi cancelado; confira o pagamento antes de tentar novamente.`);
    for (const payment of payments) {
      if (boletoCancellationDisposition(payment.status) === "preserve") protectedEntryIds.add(payment.entryId);
      else await cancelMercadoPagoPayment(auth.arenaId, payment.id);
      handledPaymentIds.add(payment.id);
    }
  }

  await withArenaTransaction(auth.arenaId, async (tx) => {
    const current = await tx.studentSubscription.findFirst({ where: { id: subscription.id, arenaId: auth.arenaId, status: "ACTIVE" } });
    if (!current) throw new Error("O plano já foi encerrado. Atualize a página antes de tentar novamente.");
    if (recurrenceIds.length) await assertNoIssuanceInProgress(tx);
    const now = new Date();
    if (cancelOpenBoletos && recurrenceIds.length) {
      const entries = await tx.financialEntry.findMany({ where: futureEntriesWhere, select: { id: true, onlinePaymentId: true, settlements: { select: { amountCents: true } } } });
      const currentSelection = selectFuturePlanBoletos(entries);
      for (const entryId of currentSelection.protectedEntryIds) protectedEntryIds.add(entryId);
      if (currentSelection.issued.some((entry) => !handledPaymentIds.has(entry.onlinePaymentId))) {
        throw new Error("Um novo boleto foi emitido durante o cancelamento. O plano permanece ativo; tente novamente.");
      }
    }
    await tx.studentSubscription.update({ where: { id: current.id }, data: { status: "CANCELED", endedAt: now } });
    if (clearRemainingClasses) {
      await tx.lessonCreditBatch.updateMany({where:{arenaId:auth.arenaId,studentId:subscription.student.id},data:{remaining:0}});
      await tx.student.update({ where: { id: subscription.student.id }, data: { remainingClasses: 0 } });
      if (subscription.student.playerId) await tx.clientBalanceMovement.create({ data: { arenaId: auth.arenaId, playerId: subscription.student.playerId, kind: "CLASSES", classesDelta: -subscription.student.remainingClasses, reason: `Saldo removido ao encerrar o plano ${planId}.` } });
    }
    await tx.financialRecurrence.updateMany({ where: { id: { in: recurrenceIds }, arenaId: auth.arenaId, active: true }, data: { active: false } });
    if (cancelOpenBoletos && recurrenceIds.length) await tx.financialEntry.updateMany({ where: { ...futureEntriesWhere, id: { notIn: [...protectedEntryIds] } }, data: { status: "VOIDED", voidedAt: now, voidReason: "Plano cancelado; boletos em aberto cancelados no Mercado Pago. Boletos vencidos preservados." } });
  });
  refreshAcademyRoutes();
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { requireModuleEdit } from "@/lib/auth/guards";
import { getNextFinancialRecurrenceDate } from "@/lib/finance/recurrences";
import { issueRecurringOnlineChargeForEntry } from "@/lib/payments/recurring-online-charges";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

function referenceMonth(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

export async function checkInPortalLessonAction(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? "").trim();
  const lessonId = String(formData.get("lessonId") ?? "").trim();
  if (!arenaSlug || !lessonId) throw new Error("Aula inválida.");
  const auth = await requirePublicPlayerAuth(arenaSlug);
  const now = new Date();
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const attendance = await tx.lessonAttendance.findFirst({
      where: { lessonId, student: { arenaId: auth.arenaId, playerId: auth.playerId, active: true } },
      include: { lesson: { select: { id: true, scheduledAt: true, status: true } }, student: { include: { subscriptions: { where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1 } } } }
    });
    if (!attendance || !attendance.lesson.scheduledAt || attendance.lesson.status === "CANCELED") throw new Error("Esta aula não está disponível para check-in.");
    if (attendance.checkedInAt) throw new Error("Seu check-in nesta aula já foi registrado.");
    const startsAt = attendance.lesson.scheduledAt;
    const opensAt = new Date(startsAt.getTime() - 3 * 60 * 60_000);
    const closesAt = new Date(startsAt.getTime() + 8 * 60 * 60_000);
    if (now < opensAt || now > closesAt) throw new Error("O check-in fica disponível três horas antes da aula e até oito horas após o início.");
    const month = referenceMonth(startsAt);
    const subscriptionCredits = attendance.student.subscriptions[0]?.classesPerMonth ?? 0;
    const existing = await tx.studentMonthlyBalance.findUnique({ where: { studentId_referenceMonth: { studentId: attendance.studentId, referenceMonth: month } } });
    const initialCredits = existing ? existing.remainingClasses : subscriptionCredits || attendance.student.remainingClasses;
    if (initialCredits <= 0) throw new Error("Não há saldo de aulas disponível para este mês.");
    if (existing) {
      await tx.studentMonthlyBalance.update({ where: { id: existing.id }, data: { remainingClasses: { decrement: 1 } } });
    } else {
      await tx.studentMonthlyBalance.create({ data: { arenaId: auth.arenaId, studentId: attendance.studentId, referenceMonth: month, totalClasses: initialCredits, remainingClasses: initialCredits - 1 } });
    }
    await tx.lessonAttendance.update({ where: { id: attendance.id }, data: { status: "PRESENT", checkedInAt: now } });
    await tx.student.update({ where: { id: attendance.studentId }, data: { remainingClasses: Math.max(0, initialCredits - 1), attendedClasses: { increment: 1 } } });
  });
  revalidatePath(`/classificacao/${arenaSlug}`);
  revalidatePath("/aulas");
}

export async function requestClassGroupAction(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? "").trim();
  const classGroupId = String(formData.get("classGroupId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);
  if (!arenaSlug || !classGroupId) throw new Error("Turma inválida.");
  const auth = await requirePublicPlayerAuth(arenaSlug);
  const group = await prisma.classGroup.findFirst({
    where: { id: classGroupId, arenaId: auth.arenaId, active: true },
    include: { schedules: true, enrollments: { where: { status: "ACTIVE" }, select: { id: true } } }
  });
  if (!group || !group.schedules.length) throw new Error("Esta turma não está disponível.");
  if (!group.schedules.every((schedule) => group.enrollments.length < schedule.capacity)) throw new Error("Esta turma não possui vagas no momento.");
  const student = await prisma.student.upsert({
    where: { playerId: auth.playerId },
    update: { active: true, name: auth.name, phone: auth.phone, email: auth.email },
    create: { arenaId: auth.arenaId, playerId: auth.playerId, name: auth.name, phone: auth.phone, email: auth.email }
  });
  const [enrollment, request] = await Promise.all([
    prisma.classGroupEnrollment.findFirst({ where: { classGroupId, studentId: student.id, status: "ACTIVE" }, select: { id: true } }),
    prisma.classGroupRequest.findFirst({ where: { classGroupId, studentId: student.id, status: "PENDING" }, select: { id: true } })
  ]);
  if (enrollment) throw new Error("Você já participa desta turma.");
  if (request) throw new Error("Sua solicitação para esta turma já está em análise.");
  await prisma.classGroupRequest.create({ data: { arenaId: auth.arenaId, classGroupId, studentId: student.id, message } });
  revalidatePath(`/classificacao/${arenaSlug}`);
  revalidatePath("/aulas");
}

export async function approveClassGroupRequestAction(formData: FormData) {
  const auth = await requireModuleEdit("lessons");
  const requestId = String(formData.get("requestId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const startedAtInput = String(formData.get("startedAt") ?? "");
  const dueDay = Math.min(28, Math.max(1, Number(formData.get("dueDay") ?? 10) || 10));
  const startedAt = startedAtInput ? new Date(`${startedAtInput}T12:00:00`) : new Date();
  if (!requestId || !planId || Number.isNaN(startedAt.getTime())) throw new Error("Informe o plano e a data de início.");
  const request = await prisma.classGroupRequest.findFirst({ where: { id: requestId, arenaId: auth.arenaId, status: "PENDING" }, include: { classGroup: { include: { schedules: true, enrollments: { where: { status: "ACTIVE" }, select: { id: true } }, plans: { select: { planId: true } } } }, student: { select: { id: true, name: true, playerId: true } } } });
  if (!request) throw new Error("Solicitação não encontrada.");
  if (!request.classGroup.plans.some((item) => item.planId === planId)) throw new Error("Este plano não é aceito pela turma.");
  if (!request.classGroup.schedules.every((schedule) => request.classGroup.enrollments.length < schedule.capacity)) throw new Error("A turma não possui mais vagas.");
  const plan = await prisma.plan.findFirst({ where: { id: planId, arenaId: auth.arenaId, active: true }, select: { id: true, name: true, monthlyPriceCents: true, classesPerMonth: true } });
  if (!plan) throw new Error("Plano não encontrado.");
  const firstDueDate = new Date(startedAt.getFullYear(), startedAt.getMonth(), dueDay, 12);
  if (firstDueDate < startedAt) firstDueDate.setMonth(firstDueDate.getMonth() + 1);
  let firstEntryId = "";
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.classGroupEnrollment.upsert({ where: { classGroupId_studentId: { classGroupId: request.classGroupId, studentId: request.studentId } }, update: { status: "ACTIVE", endedAt: null, startedAt }, create: { arenaId: auth.arenaId, classGroupId: request.classGroupId, studentId: request.studentId, startedAt } });
    const activeSubscription = await tx.studentSubscription.findFirst({ where: { arenaId: auth.arenaId, studentId: request.studentId, planId: plan.id, status: "ACTIVE" }, select: { id: true } });
    if (!activeSubscription) {
      await tx.studentSubscription.create({ data: { arenaId: auth.arenaId, studentId: request.studentId, planId: plan.id, monthlyPriceCents: plan.monthlyPriceCents, classesPerMonth: plan.classesPerMonth, dueDay, startedAt, notes: `Matrícula na turma ${request.classGroup.name}.` } });
      const recurrence = await tx.financialRecurrence.create({ data: { arenaId: auth.arenaId, type: "REVENUE", counterpartyName: request.student.name, playerId: request.student.playerId, category: "Planos de aulas", description: `${plan.name} · ${request.student.name}`, amountCents: plan.monthlyPriceCents, frequency: "MONTHLY", startsAt: startedAt, nextDueDate: firstDueDate, onlinePaymentMethod: "BOLETO", planId: plan.id, notes: `Gerado pela matrícula na turma ${request.classGroup.name}.` } });
      const firstEntry = await tx.financialEntry.create({ data: { arenaId: auth.arenaId, type: "REVENUE", counterpartyName: request.student.name, playerId: request.student.playerId, category: "Planos de aulas", description: `${plan.name} · ${request.student.name}`, amountCents: plan.monthlyPriceCents, dueDate: firstDueDate, planId: plan.id, recurrenceId: recurrence.id, paymentMethod: "Boleto" } });
      firstEntryId = firstEntry.id;
      await tx.financialRecurrence.update({ where: { id: recurrence.id }, data: { nextDueDate: getNextFinancialRecurrenceDate(firstDueDate, "MONTHLY") } });
    }
    await tx.classGroupRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } });
  });
  if (firstEntryId) {
    try { await issueRecurringOnlineChargeForEntry(firstEntryId); }
    catch (error) { console.error("Could not issue the initial class plan boleto", error); }
  }
  revalidatePath("/aulas");
  revalidatePath("/financeiro");
}

async function requireTeacherForClassGroups(arenaSlug: string) {
  const auth = await requirePublicPlayerAuth(arenaSlug);
  const teacher = await prisma.teacher.findFirst({ where: { arenaId: auth.arenaId, playerId: auth.playerId, active: true }, select: { id: true } });
  if (!teacher) throw new Error("Seu perfil não possui acesso de professor.");
  return { ...auth, teacherId: teacher.id };
}

export async function moveClassGroupStudentAction(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? "");
  const sourceClassGroupId = String(formData.get("sourceClassGroupId") ?? "");
  const destinationClassGroupId = String(formData.get("destinationClassGroupId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const auth = await requireTeacherForClassGroups(arenaSlug);
  if (!sourceClassGroupId || !destinationClassGroupId || !studentId || sourceClassGroupId === destinationClassGroupId) throw new Error("Selecione uma turma de destino diferente.");
  const [source, destination] = await Promise.all([
    prisma.classGroup.findFirst({ where: { id: sourceClassGroupId, arenaId: auth.arenaId, teacherId: auth.teacherId, active: true }, select: { id: true } }),
    prisma.classGroup.findFirst({ where: { id: destinationClassGroupId, arenaId: auth.arenaId, teacherId: auth.teacherId, active: true }, include: { schedules: true, enrollments: { where: { status: "ACTIVE" }, select: { id: true } } } })
  ]);
  if (!source || !destination) throw new Error("Você só pode movimentar alunos entre suas turmas ativas.");
  if (!destination.schedules.every((schedule) => destination.enrollments.length < schedule.capacity)) throw new Error("A turma de destino não possui vagas.");
  await prisma.$transaction(async (tx) => {
    const enrollment = await tx.classGroupEnrollment.findFirst({ where: { classGroupId: source.id, studentId, status: "ACTIVE" }, select: { id: true } });
    if (!enrollment) throw new Error("Aluno não encontrado nesta turma.");
    await tx.classGroupEnrollment.update({ where: { id: enrollment.id }, data: { status: "TRANSFERRED", endedAt: new Date() } });
    await tx.classGroupEnrollment.upsert({ where: { classGroupId_studentId: { classGroupId: destination.id, studentId } }, update: { status: "ACTIVE", endedAt: null, startedAt: new Date() }, create: { arenaId: auth.arenaId, classGroupId: destination.id, studentId } });
  });
  revalidatePath(`/classificacao/${arenaSlug}`);
  revalidatePath("/aulas");
}

export async function updateTeacherPortalClassGroupCapacityAction(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? "").trim();
  const classGroupId = String(formData.get("classGroupId") ?? "").trim();
  const scheduleId = String(formData.get("scheduleId") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0);
  const auth = await requireTeacherForClassGroups(arenaSlug);
  if (!classGroupId || !scheduleId || !Number.isInteger(capacity) || capacity < 1 || capacity > 99) throw new Error("Informe entre 1 e 99 vagas.");
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const schedule = await tx.classGroupSchedule.findFirst({
      where: { id: scheduleId, classGroupId, arenaId: auth.arenaId, classGroup: { teacherId: auth.teacherId, active: true } },
      include: { classGroup: { include: { enrollments: { where: { status: "ACTIVE" }, select: { id: true } } } } },
    });
    if (!schedule) throw new Error("Horário da turma não encontrado.");
    if (capacity < schedule.classGroup.enrollments.length) throw new Error("As vagas não podem ser menores que os alunos matriculados.");
    await tx.classGroupSchedule.update({ where: { id: schedule.id }, data: { capacity } });
  });
  revalidatePath(`/classificacao/${arenaSlug}`);
  revalidatePath("/aulas");
  revalidatePath("/professores");
}

export async function adjustTeacherStudentBalanceAction(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const classesDelta = Number(formData.get("classesDelta") ?? 0);
  const reason = String(formData.get("reason") ?? "Ajuste realizado pelo professor.").trim().slice(0, 240);
  const auth = await requireTeacherForClassGroups(arenaSlug);
  if (!studentId || !Number.isInteger(classesDelta) || !classesDelta) throw new Error("Informe um ajuste válido de aulas.");
  const assignment = await prisma.teacherStudent.findFirst({ where: { teacherId: auth.teacherId, studentId, active: true }, include: { student: { select: { playerId: true, remainingClasses: true, subscriptions: { where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1, select: { classesPerMonth: true } } } } } });
  if (!assignment) throw new Error("Você só pode ajustar o saldo dos seus alunos ativos.");
  await prisma.$transaction(async (tx) => {
    const month = referenceMonth(new Date());
    const balance = await tx.studentMonthlyBalance.findUnique({ where: { studentId_referenceMonth: { studentId, referenceMonth: month } } });
    const current = balance?.remainingClasses ?? assignment.student.subscriptions[0]?.classesPerMonth ?? assignment.student.remainingClasses;
    const next = current + classesDelta;
    if (next < 0) throw new Error("O saldo mensal não pode ficar negativo.");
    if (balance) {
      await tx.studentMonthlyBalance.update({ where: { id: balance.id }, data: { remainingClasses: next, totalClasses: classesDelta > 0 ? { increment: classesDelta } : undefined } });
    } else {
      const total = Math.max(0, current + Math.max(0, classesDelta));
      await tx.studentMonthlyBalance.create({ data: { arenaId: auth.arenaId, studentId, referenceMonth: month, totalClasses: total, remainingClasses: next } });
    }
    await tx.student.update({ where: { id: studentId }, data: { remainingClasses: next } });
    if (assignment.student.playerId) await tx.clientBalanceMovement.create({ data: { arenaId: auth.arenaId, playerId: assignment.student.playerId, kind: "LESSON_CREDIT", classesDelta, reason } });
  });
  revalidatePath(`/classificacao/${arenaSlug}`);
}

export async function notifyTeacherStudentAction(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);
  const auth = await requireTeacherForClassGroups(arenaSlug);
  if (!studentId || !message) throw new Error("Escreva o aviso para o aluno.");
  const assignment = await prisma.teacherStudent.findFirst({ where: { teacherId: auth.teacherId, studentId, active: true }, include: { student: { select: { playerId: true } } } });
  if (!assignment?.student.playerId) throw new Error("Aluno não está vinculado ao portal.");
  await prisma.playerNotification.create({ data: { playerId: assignment.student.playerId, type: "TEACHER_NOTICE", title: "Aviso do professor", message, href: `/classificacao/${arenaSlug}?section=lessons` } });
  revalidatePath(`/classificacao/${arenaSlug}`);
}

export async function registerClassGroupMakeupAction(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? "");
  const sourceClassGroupId = String(formData.get("sourceClassGroupId") ?? "");
  const destinationClassGroupId = String(formData.get("destinationClassGroupId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const scheduledFor = new Date(`${String(formData.get("scheduledFor") ?? "")}T12:00:00`);
  const auth = await requireTeacherForClassGroups(arenaSlug);
  if (!sourceClassGroupId || !destinationClassGroupId || !studentId || Number.isNaN(scheduledFor.getTime())) throw new Error("Informe aluno, turma de reposição e data.");
  const groups = await prisma.classGroup.findMany({ where: { id: { in: [sourceClassGroupId, destinationClassGroupId] }, arenaId: auth.arenaId, teacherId: auth.teacherId, active: true }, include: { schedules: true, enrollments: { where: { status: "ACTIVE" }, select: { id: true } } } });
  if (groups.length !== 2) throw new Error("Você só pode registrar reposições entre suas turmas.");
  const destination = groups.find((group) => group.id === destinationClassGroupId)!;
  if (!destination.schedules.every((schedule) => destination.enrollments.length < schedule.capacity)) throw new Error("A turma de reposição não possui vagas.");
  const enrollment = await prisma.classGroupEnrollment.findFirst({ where: { classGroupId: sourceClassGroupId, studentId, status: "ACTIVE" }, select: { id: true } });
  if (!enrollment) throw new Error("O aluno não possui matrícula ativa na turma de origem.");
  await prisma.classGroupMakeup.create({ data: { arenaId: auth.arenaId, studentId, sourceClassGroupId, destinationClassGroupId, scheduledFor, teacherId: auth.teacherId } });
  revalidatePath(`/classificacao/${arenaSlug}`);
}

export async function scheduleTeacherMakeupAction(formData: FormData) {
  const arenaSlug = String(formData.get("arenaSlug") ?? "").trim();
  const slot = String(formData.get("slot") ?? "").trim();
  const attendanceIds = formData.getAll("attendanceIds").map(String).filter(Boolean);
  const auth = await requireTeacherForClassGroups(arenaSlug);
  const [courtId, startsAtInput, durationInput] = slot.split("|");
  const startsAt = new Date(startsAtInput ?? "");
  const durationMinutes = Number(durationInput ?? 60);
  if (!courtId || !attendanceIds.length || Number.isNaN(startsAt.getTime()) || !Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 240) throw new Error("Selecione alunos e um horário disponível.");
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const [court, pendingAttendances, conflict] = await Promise.all([
      tx.court.findFirst({ where: { id: courtId, arenaId: auth.arenaId, active: true }, include: { weeklyRules: true } }),
      tx.lessonAttendance.findMany({ where: { id: { in: attendanceIds }, status: "ABSENT", makeupScheduledAt: null, student: { teacherAssignments: { some: { teacherId: auth.teacherId, active: true } } } }, include: { student: { select: { id: true, name: true, playerId: true } } } }),
      tx.scheduleOccurrence.findFirst({ where: { arenaId: auth.arenaId, status: { not: "CANCELED" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, occurrenceCourts: { some: { courtId } } }, select: { id: true } }),
    ]);
    if (!court) throw new Error("Quadra não encontrada.");
    const dayRule = court.weeklyRules.find((rule) => rule.weekday === startsAt.getDay() && rule.available);
    const startMinute = startsAt.getHours() * 60 + startsAt.getMinutes();
    if (!dayRule || startMinute < dayRule.startsAtMinute || startMinute + durationMinutes > dayRule.endsAtMinute) throw new Error("Este horário não está disponível na grade da arena.");
    if (conflict) throw new Error("Este horário acabou de ser reservado. Escolha outro.");
    if (pendingAttendances.length !== new Set(attendanceIds).size) throw new Error("Uma ou mais reposições já foram agendadas.");
    const participantIds = [...new Set(pendingAttendances.flatMap((attendance) => attendance.student.playerId ? [attendance.student.playerId] : []))];
    const occurrence = await tx.scheduleOccurrence.create({ data: { arenaId: auth.arenaId, sourceType: "LESSON_MAKEUP", title: `Reposição · ${auth.name}`, startsAt, endsAt, status: "SCHEDULED", bookingTypeName: "Reposição", teacherId: auth.teacherId, notes: pendingAttendances.map((attendance) => attendance.student.name).join(" · "), occurrenceCourts: { create: { courtId } }, participants: { create: participantIds.map((playerId) => ({ playerId })) } } });
    await tx.lessonAttendance.updateMany({ where: { id: { in: pendingAttendances.map((attendance) => attendance.id) }, makeupScheduledAt: null }, data: { makeupScheduledAt: startsAt, makeupOccurrenceId: occurrence.id } });
  });
  revalidatePath(`/classificacao/${arenaSlug}`);
  revalidatePath("/aulas");
  revalidatePath("/professores");
}

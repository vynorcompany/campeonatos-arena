"use server";

import { revalidatePath } from "next/cache";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { requireModuleEdit } from "@/lib/auth/guards";
import { getNextFinancialRecurrenceDate } from "@/lib/finance/recurrences";
import { prisma } from "@/lib/prisma";

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
  const request = await prisma.classGroupRequest.findFirst({ where: { id: requestId, arenaId: auth.arenaId, status: "PENDING" }, include: { classGroup: { include: { schedules: true, enrollments: { where: { status: "ACTIVE" }, select: { id: true } }, plans: { select: { planId: true } } } }, student: true } });
  if (!request) throw new Error("Solicitação não encontrada.");
  if (!request.classGroup.plans.some((item) => item.planId === planId)) throw new Error("Este plano não é aceito pela turma.");
  if (!request.classGroup.schedules.every((schedule) => request.classGroup.enrollments.length < schedule.capacity)) throw new Error("A turma não possui mais vagas.");
  const plan = await prisma.plan.findFirst({ where: { id: planId, arenaId: auth.arenaId, active: true }, select: { id: true, name: true, monthlyPriceCents: true, classesPerMonth: true } });
  if (!plan) throw new Error("Plano não encontrado.");
  const firstDueDate = new Date(startedAt.getFullYear(), startedAt.getMonth(), dueDay, 12);
  if (firstDueDate < startedAt) firstDueDate.setMonth(firstDueDate.getMonth() + 1);
  await prisma.$transaction(async (tx) => {
    await tx.classGroupEnrollment.upsert({ where: { classGroupId_studentId: { classGroupId: request.classGroupId, studentId: request.studentId } }, update: { status: "ACTIVE", endedAt: null, startedAt }, create: { arenaId: auth.arenaId, classGroupId: request.classGroupId, studentId: request.studentId, startedAt } });
    await tx.studentSubscription.create({ data: { arenaId: auth.arenaId, studentId: request.studentId, planId: plan.id, monthlyPriceCents: plan.monthlyPriceCents, classesPerMonth: plan.classesPerMonth, dueDay, startedAt, notes: `Matrícula na turma ${request.classGroup.name}.` } });
    const recurrence = await tx.financialRecurrence.create({ data: { arenaId: auth.arenaId, type: "REVENUE", counterpartyName: request.student.name, category: "Planos de aulas", description: `${plan.name} · ${request.student.name}`, amountCents: plan.monthlyPriceCents, frequency: "MONTHLY", startsAt: startedAt, nextDueDate: firstDueDate, planId: plan.id, notes: `Gerado pela matrícula na turma ${request.classGroup.name}.` } });
    await tx.financialEntry.create({ data: { arenaId: auth.arenaId, type: "REVENUE", counterpartyName: request.student.name, category: "Planos de aulas", description: `${plan.name} · ${request.student.name}`, amountCents: plan.monthlyPriceCents, dueDate: firstDueDate, planId: plan.id, recurrenceId: recurrence.id } });
    await tx.financialRecurrence.update({ where: { id: recurrence.id }, data: { nextDueDate: getNextFinancialRecurrenceDate(firstDueDate, "MONTHLY") } });
    await tx.classGroupRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } });
  });
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

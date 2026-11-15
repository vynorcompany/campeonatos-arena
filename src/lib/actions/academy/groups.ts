"use server";
import { arenaDatabase } from "@/lib/arena-database";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { lockClassGroupCapacity } from "@/lib/academy/class-group-capacity";
import { getClassGroupName, getFormValues } from "@/lib/academy/inputs";
import { refreshAcademyRoutes } from "@/lib/academy/revalidation";

export async function createClassGroupAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const prisma = arenaDatabase(auth.arenaId);
  const teacherId = String(formData.get("teacherId") ?? "");
  const planIds = getFormValues(formData, "planIds");
  const weekdays = getFormValues(formData, "weekdays");
  const startTimes = getFormValues(formData, "startTimes");
  const capacities = getFormValues(formData, "capacities");
  const schedules = weekdays
    .map((weekday, index) => ({
      weekday: Number(weekday),
      startTime: startTimes[index] ?? "",
      capacity: Number(capacities[index]),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.weekday) &&
        item.weekday >= 0 &&
        item.weekday <= 6 &&
        /^\d{2}:\d{2}$/.test(item.startTime) &&
        Number.isInteger(item.capacity) &&
        item.capacity > 0 &&
        item.capacity <= 4,
    );
  if (!teacherId || !schedules.length)
    throw new Error("Informe professor e ao menos um horário da turma.");
  if (!planIds.length)
    throw new Error("Selecione ao menos um plano para a turma.");
  const [teacher, plans] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: teacherId, arenaId: auth.arenaId, active: true },
      select: { id: true },
    }),
    prisma.plan.findMany({
      where: { id: { in: planIds }, arenaId: auth.arenaId, active: true },
      select: { id: true },
    }),
  ]);
  if (!teacher) throw new Error("Professor não encontrado.");
  if (plans.length !== planIds.length)
    throw new Error("Selecione apenas planos ativos desta arena.");
  const duplicateSchedule =
    new Set(schedules.map((item) => `${item.weekday}-${item.startTime}`))
      .size !== schedules.length;
  if (duplicateSchedule)
    throw new Error("Não repita o mesmo dia e horário na turma.");
  await prisma.classGroup.create({
    data: {
      arenaId: auth.arenaId,
      name: getClassGroupName(schedules),
      teacherId,
      notes: String(formData.get("notes") ?? "").trim(),
      schedules: {
        create: schedules.map((item) => ({ ...item, arenaId: auth.arenaId })),
      },
      plans: { create: plans.map((plan) => ({ planId: plan.id })) },
    },
  });
  refreshAcademyRoutes();
}

export async function updateTeacherClassGroupAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const classGroupId = String(formData.get("classGroupId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const planIds = getFormValues(formData, "planIds");
  const weekdays = getFormValues(formData, "weekdays");
  const startTimes = getFormValues(formData, "startTimes");
  const capacities = getFormValues(formData, "capacities");

  if (!classGroupId || !teacherId) {
    throw new Error("Informe a turma e o professor.");
  }
  if (!planIds.length) {
    throw new Error("Selecione ao menos um plano para a turma.");
  }
  if (
    !weekdays.length ||
    weekdays.length !== startTimes.length ||
    weekdays.length !== capacities.length
  ) {
    throw new Error("Informe ao menos um horário completo para a turma.");
  }

  const schedules = weekdays.map((weekday, index) => ({
    weekday: Number(weekday),
    startTime: startTimes[index] ?? "",
    capacity: Number(capacities[index]),
  }));
  const validSchedules = schedules.every(
    (schedule) =>
      Number.isInteger(schedule.weekday) &&
      schedule.weekday >= 0 &&
      schedule.weekday <= 6 &&
      /^\d{2}:\d{2}$/.test(schedule.startTime) &&
      Number.isInteger(schedule.capacity) &&
      schedule.capacity > 0 &&
      schedule.capacity <= 4,
  );
  if (!validSchedules) {
    throw new Error("Revise dia, hora e vagas de cada horário.");
  }
  if (
    new Set(
      schedules.map((schedule) => `${schedule.weekday}-${schedule.startTime}`),
    ).size !== schedules.length
  ) {
    throw new Error("Não repita o mesmo dia e horário na turma.");
  }

  await withArenaTransaction(auth.arenaId, async (tx) => {
    await lockClassGroupCapacity(tx, auth.arenaId, classGroupId);
    const [group, plans] = await Promise.all([
      tx.classGroup.findFirst({
        where: { id: classGroupId, arenaId: auth.arenaId, teacherId, active: true },
        include: { enrollments: { where: { status: "ACTIVE" }, select: { id: true } } },
      }),
      tx.plan.findMany({ where: { id: { in: planIds }, arenaId: auth.arenaId, active: true }, select: { id: true } }),
    ]);
    if (!group) throw new Error("Turma não encontrada.");
    if (plans.length !== new Set(planIds).size) throw new Error("Selecione apenas planos ativos desta arena.");
    if (schedules.some((schedule) => schedule.capacity < group.enrollments.length)) throw new Error("As vagas não podem ser menores que os alunos já matriculados.");
    await tx.classGroup.update({
      where: { id: group.id },
      data: {
        name: getClassGroupName(schedules),
        notes,
        plans: { deleteMany: {}, create: [...new Set(planIds)].map((planId) => ({ planId })) },
        schedules: { deleteMany: {}, create: schedules.map((schedule) => ({ ...schedule, arenaId: auth.arenaId })) },
      },
    });
  });
  refreshAcademyRoutes();
}

export async function updateTeacherClassGroupCapacityAction(
  formData: FormData,
) {
  const auth = await requireModuleEdit("lessons");
  const teacherId = String(formData.get("teacherId") ?? "");
  const classGroupId = String(formData.get("classGroupId") ?? "");
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const capacity = z.coerce
    .number()
    .int()
    .min(1)
    .max(4)
    .parse(formData.get("capacity"));
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await lockClassGroupCapacity(tx, auth.arenaId, classGroupId);
    const schedule = await tx.classGroupSchedule.findFirst({
      where: {
        id: scheduleId,
        classGroupId,
        arenaId: auth.arenaId,
        classGroup: { teacherId, active: true },
      },
      include: {
        classGroup: {
          include: {
            enrollments: { where: { status: "ACTIVE" }, select: { id: true } },
          },
        },
      },
    });
    if (!schedule) throw new Error("Horário da turma não encontrado.");
    if (capacity < schedule.classGroup.enrollments.length)
      throw new Error("As vagas não podem ser menores que os alunos já matriculados.");
    await tx.classGroupSchedule.update({ where: { id: schedule.id }, data: { capacity } });
  });
  refreshAcademyRoutes();
}

export async function moveTeacherClassGroupStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("lessons");
  const teacherId = String(formData.get("teacherId") ?? "");
  const sourceClassGroupId = String(formData.get("sourceClassGroupId") ?? "");
  const destinationClassGroupId = String(
    formData.get("destinationClassGroupId") ?? "",
  );
  const studentId = String(formData.get("studentId") ?? "");
  if (
    !teacherId ||
    !destinationClassGroupId ||
    !studentId ||
    sourceClassGroupId === destinationClassGroupId
  )
    throw new Error("Selecione uma turma de destino diferente.");
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await lockClassGroupCapacity(tx, auth.arenaId, destinationClassGroupId);
    const [student, source, destination] = await Promise.all([
      tx.student.findFirst({ where: { id: studentId, arenaId: auth.arenaId }, select: { id: true } }),
      sourceClassGroupId
        ? tx.classGroup.findFirst({ where: { id: sourceClassGroupId, arenaId: auth.arenaId, teacherId, active: true }, select: { id: true } })
        : Promise.resolve(null),
      tx.classGroup.findFirst({
        where: { id: destinationClassGroupId, arenaId: auth.arenaId, teacherId, active: true },
        include: { schedules: true, enrollments: { where: { status: "ACTIVE" }, select: { id: true } } },
      }),
    ]);
    if (!student || !destination || (sourceClassGroupId && !source)) throw new Error("Selecione turmas e aluno ativos desta arena.");
    if (!destination.schedules.length || !destination.schedules.every((schedule) => destination.enrollments.length < schedule.capacity)) throw new Error("A turma de destino não possui vagas.");
    if (source) {
      const enrollment = await tx.classGroupEnrollment.findFirst({
        where: { classGroupId: source.id, studentId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!enrollment) throw new Error("Aluno não encontrado nesta turma.");
      await tx.classGroupEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "TRANSFERRED", endedAt: new Date() },
      });
    }
    await tx.classGroupEnrollment.upsert({
      where: {
        classGroupId_studentId: { classGroupId: destination.id, studentId },
      },
      update: { status: "ACTIVE", endedAt: null, startedAt: new Date() },
      create: {
        arenaId: auth.arenaId,
        classGroupId: destination.id,
        studentId,
      },
    });
  });
  refreshAcademyRoutes();
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { getDiscountedAmountCents } from "@/lib/finance/discounts";
import { getNextFinancialRecurrenceDate } from "@/lib/finance/recurrences";
import { prisma } from "@/lib/prisma";

const optionalText = z.string().trim().default("");

const studentSchema = z.object({
  name: z.string().trim().default(""),
  playerId: z.string().trim().default(""),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .or(z.literal(""))
    .default(""),
  remainingClasses: z.coerce
    .number()
    .int()
    .min(0, "Aulas restantes inválidas.")
    .default(0),
  notes: optionalText,
});

const teacherSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do professor."),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .or(z.literal(""))
    .default(""),
  monthlyTarget: z.coerce
    .number()
    .int()
    .min(0, "Meta mensal inválida.")
    .default(0),
  notes: optionalText,
});

const lessonSchema = z.object({
  title: z.string().trim().min(2, "Informe o nome da aula."),
  teacherId: z.string().optional().default(""),
  scheduledAt: z.string().optional().default(""),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(60),
  isPaid: z.string().optional().default(""),
  price: z.string().trim().optional().default(""),
  paymentMethod: z.string().trim().optional().default("PIX"),
  notes: optionalText,
});

function refreshAcademyRoutes() {
  revalidatePath("/aulas");
  revalidatePath("/aulas/alunos");
  revalidatePath("/professores");
  revalidatePath("/financeiro");
}

function getFormValues(formData: FormData, name: string) {
  return formData.getAll(name).map(String).filter(Boolean);
}

function parseScheduledAt(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMoneyToCents(value: string) {
  const cleanValue = value.trim() || "0";
  const normalized = cleanValue.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Valor inválido.");
  }

  return Math.round(amount * 100);
}

export async function createStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("students");
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    playerId: formData.get("playerId"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    remainingClasses: formData.get("remainingClasses"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const linkedPlayer = parsed.data.playerId
    ? await prisma.player.findFirst({
        where: {
          id: parsed.data.playerId,
          arenaId: auth.arenaId,
        },
      })
    : null;
  const studentName = linkedPlayer?.name ?? parsed.data.name;

  if (studentName.trim().length < 2) {
    throw new Error("Informe o nome do aluno ou selecione um jogador.");
  }

  if (linkedPlayer) {
    const existingStudent = await prisma.student.findFirst({
      where: {
        arenaId: auth.arenaId,
        name: linkedPlayer.name,
      },
    });

    if (existingStudent) {
      await prisma.student.update({
        where: {
          id: existingStudent.id,
        },
        data: {
          playerId: linkedPlayer.id,
          phone: parsed.data.phone || existingStudent.phone,
          email: parsed.data.email || existingStudent.email,
          remainingClasses: {
            increment: parsed.data.remainingClasses,
          },
          totalClasses: {
            increment: parsed.data.remainingClasses,
          },
          notes: parsed.data.notes || existingStudent.notes,
        },
      });

      refreshAcademyRoutes();
      return;
    }
  }

  await prisma.student.create({
    data: {
      arenaId: auth.arenaId,
      name: studentName,
      playerId: linkedPlayer?.id ?? null,
      phone: parsed.data.phone,
      email: parsed.data.email,
      remainingClasses: parsed.data.remainingClasses,
      notes: parsed.data.notes,
      totalClasses: parsed.data.remainingClasses,
    },
  });

  refreshAcademyRoutes();
}

export async function addStudentCreditsAction(formData: FormData) {
  const auth = await requireModuleEdit("students");
  const studentId = String(formData.get("studentId") ?? "");
  const quantity = z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .parse(formData.get("quantity"));

  const updated = await prisma.student.updateMany({
    where: {
      id: studentId,
      arenaId: auth.arenaId,
    },
    data: {
      remainingClasses: {
        increment: quantity,
      },
      totalClasses: {
        increment: quantity,
      },
    },
  });

  if (!updated.count) {
    throw new Error("Aluno não encontrado.");
  }

  refreshAcademyRoutes();
}

export async function updateStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("students");
  const studentId = String(formData.get("studentId") ?? "");
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    playerId: "",
    phone: formData.get("phone"),
    email: formData.get("email"),
    remainingClasses: formData.get("remainingClasses"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  if (parsed.data.name.trim().length < 2) {
    throw new Error("Informe o nome do aluno.");
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      arenaId: auth.arenaId,
    },
  });

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  const nameConflict = await prisma.student.findFirst({
    where: {
      arenaId: auth.arenaId,
      name: parsed.data.name,
      NOT: {
        id: student.id,
      },
    },
  });

  if (nameConflict) {
    throw new Error("Já existe outro aluno com esse nome.");
  }

  await prisma.student.update({
    where: {
      id: student.id,
    },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      remainingClasses: parsed.data.remainingClasses,
      notes: parsed.data.notes,
    },
  });

  refreshAcademyRoutes();
}

export async function deleteStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("students");
  const studentId = String(formData.get("studentId") ?? "");

  const deleted = await prisma.student.deleteMany({
    where: {
      id: studentId,
      arenaId: auth.arenaId,
    },
  });

  if (!deleted.count) {
    throw new Error("Aluno não encontrado.");
  }

  refreshAcademyRoutes();
}

export async function createTeacherAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const parsed = teacherSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    monthlyTarget: formData.get("monthlyTarget"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.teacher.create({
    data: {
      arenaId: auth.arenaId,
      createdByUserId: auth.userId,
      updatedByUserId: auth.userId,
      ...parsed.data,
    },
  });

  refreshAcademyRoutes();
}

export async function archiveTeacherAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const teacherId = String(formData.get("teacherId") ?? "");
  const archived = await prisma.teacher.updateMany({
    where: { id: teacherId, arenaId: auth.arenaId, active: true },
    data: { active: false, updatedByUserId: auth.userId },
  });
  if (!archived.count)
    throw new Error("Professor não encontrado ou já removido.");
  refreshAcademyRoutes();
}

export async function deleteTeacherAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const teacherId = String(formData.get("teacherId") ?? "");
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, arenaId: auth.arenaId },
    select: {
      id: true,
      active: true,
      _count: {
        select: {
          lessons: true,
          scheduleOccurrences: true,
          payrollEntries: true,
          studentAssignments: true,
          planAssignments: true,
          classGroups: true,
          classGroupMakeups: true,
        },
      },
    },
  });
  if (!teacher) throw new Error("Professor não encontrado.");
  if (teacher.active)
    throw new Error("Desative o professor antes de excluí-lo definitivamente.");
  const historicalLinks = [
    teacher._count.lessons,
    teacher._count.scheduleOccurrences,
    teacher._count.payrollEntries,
    teacher._count.classGroups,
    teacher._count.classGroupMakeups,
  ];
  if (historicalLinks.some(Boolean)) {
    throw new Error(
      "Este professor possui histórico operacional. Mantenha-o inativo para preservar os dados.",
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.teacherPlan.deleteMany({ where: { teacherId: teacher.id } });
    await tx.teacherStudent.deleteMany({ where: { teacherId: teacher.id } });
    await tx.teacher.delete({ where: { id: teacher.id } });
  });
  refreshAcademyRoutes();
}

export async function createClassGroupAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const name = String(formData.get("name") ?? "").trim();
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
        item.capacity > 0,
    );
  if (name.length < 2 || !teacherId || !schedules.length)
    throw new Error("Informe nome, professor e ao menos um horário da turma.");
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
      name,
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
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const planIds = getFormValues(formData, "planIds");
  const weekdays = getFormValues(formData, "weekdays");
  const startTimes = getFormValues(formData, "startTimes");
  const capacities = getFormValues(formData, "capacities");

  if (!classGroupId || !teacherId || name.length < 2) {
    throw new Error("Informe o nome da turma.");
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
      schedule.capacity <= 100,
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

  const [group, plans] = await Promise.all([
    prisma.classGroup.findFirst({
      where: {
        id: classGroupId,
        arenaId: auth.arenaId,
        teacherId,
        active: true,
      },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
      },
    }),
    prisma.plan.findMany({
      where: {
        id: { in: planIds },
        arenaId: auth.arenaId,
        active: true,
      },
      select: { id: true },
    }),
  ]);
  if (!group) throw new Error("Turma não encontrada.");
  if (plans.length !== new Set(planIds).size) {
    throw new Error("Selecione apenas planos ativos desta arena.");
  }
  if (
    schedules.some((schedule) => schedule.capacity < group.enrollments.length)
  ) {
    throw new Error(
      "As vagas não podem ser menores que os alunos já matriculados.",
    );
  }

  await prisma.classGroup.update({
    where: { id: group.id },
    data: {
      name,
      notes,
      plans: {
        deleteMany: {},
        create: [...new Set(planIds)].map((planId) => ({ planId })),
      },
      schedules: {
        deleteMany: {},
        create: schedules.map((schedule) => ({
          ...schedule,
          arenaId: auth.arenaId,
        })),
      },
    },
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
    .max(100)
    .parse(formData.get("capacity"));
  const schedule = await prisma.classGroupSchedule.findFirst({
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
    throw new Error(
      "As vagas não podem ser menores que os alunos já matriculados.",
    );
  await prisma.classGroupSchedule.update({
    where: { id: schedule.id },
    data: { capacity },
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
  const [source, destination] = await Promise.all([
    sourceClassGroupId
      ? prisma.classGroup.findFirst({
          where: {
            id: sourceClassGroupId,
            arenaId: auth.arenaId,
            teacherId,
            active: true,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.classGroup.findFirst({
      where: {
        id: destinationClassGroupId,
        arenaId: auth.arenaId,
        teacherId,
        active: true,
      },
      include: {
        schedules: true,
        enrollments: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    }),
  ]);
  if (!destination || (sourceClassGroupId && !source))
    throw new Error("Selecione turmas ativas deste professor.");
  if (
    !destination.schedules.every(
      (schedule) => destination.enrollments.length < schedule.capacity,
    )
  )
    throw new Error("A turma de destino não possui vagas.");
  await prisma.$transaction(async (tx) => {
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

function parseFormDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getFirstDueDate(startedAt: Date, dueDay: number) {
  const dueDate = new Date(
    startedAt.getFullYear(),
    startedAt.getMonth(),
    Math.min(dueDay, 28),
    12,
  );
  return dueDate < startedAt
    ? new Date(
        startedAt.getFullYear(),
        startedAt.getMonth() + 1,
        Math.min(dueDay, 28),
        12,
      )
    : dueDate;
}

export async function createTeacherStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const teacherId = String(formData.get("teacherId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const newStudentName = String(formData.get("newStudentName") ?? "").trim();
  const newStudentPhone = String(formData.get("newStudentPhone") ?? "").trim();
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, arenaId: auth.arenaId },
    select: { id: true },
  });
  const student = studentId
    ? await prisma.student.findFirst({
        where: { id: studentId, arenaId: auth.arenaId },
        select: { id: true },
      })
    : newStudentName.length >= 2
      ? await prisma.student.upsert({
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
  if (!teacher || !student)
    throw new Error("Professor ou aluno não encontrado.");
  await prisma.teacherStudent.upsert({
    where: { teacherId_studentId: { teacherId, studentId } },
    update: { active: true },
    create: { arenaId: auth.arenaId, teacherId, studentId },
  });
  refreshAcademyRoutes();
}

export async function createTeacherPlanAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const teacherId = String(formData.get("teacherId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const [teacher, plan] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: teacherId, arenaId: auth.arenaId },
      select: { id: true },
    }),
    prisma.plan.findFirst({
      where: { id: planId, arenaId: auth.arenaId },
      select: { id: true },
    }),
  ]);
  if (!teacher || !plan) throw new Error("Professor ou plano não encontrado.");
  await prisma.teacherPlan.upsert({
    where: { teacherId_planId: { teacherId, planId } },
    update: { active: true },
    create: { arenaId: auth.arenaId, teacherId, planId },
  });
  refreshAcademyRoutes();
}

export async function createTeacherPlanWithPriceAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const teacherId = String(formData.get("teacherId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const classesPerMonth = z.coerce
    .number()
    .int()
    .min(1)
    .max(31)
    .parse(formData.get("classesPerMonth"));
  const monthlyPriceCents = parseMoneyToCents(
    String(formData.get("monthlyPrice") ?? ""),
  );
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, arenaId: auth.arenaId },
    select: { id: true },
  });
  if (!teacher || name.length < 2)
    throw new Error("Informe o professor e o nome do plano.");
  const plan = await prisma.plan.upsert({
    where: { arenaId_name: { arenaId: auth.arenaId, name } },
    update: {
      classesPerMonth,
      monthlyPriceCents,
      active: true,
      updatedByUserId: auth.userId,
    },
    create: {
      arenaId: auth.arenaId,
      name,
      classesPerMonth,
      monthlyPriceCents,
      createdByUserId: auth.userId,
      updatedByUserId: auth.userId,
    },
  });
  await prisma.teacherPlan.upsert({
    where: { teacherId_planId: { teacherId, planId: plan.id } },
    update: { active: true },
    create: { arenaId: auth.arenaId, teacherId, planId: plan.id },
  });
  refreshAcademyRoutes();
}

export async function updateTeacherPlanWithPriceAction(formData: FormData) {
  try {
    const auth = await requireModuleEdit("teachers");
    const teacherId = String(formData.get("teacherId") ?? "");
    const planId = String(formData.get("planId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const parsed = z
      .object({
        classesPerMonth: z.coerce.number().int().min(1).max(31),
        monthlyPrice: z.string().trim().min(1),
      })
      .safeParse({
        classesPerMonth: formData.get("classesPerMonth"),
        monthlyPrice: formData.get("monthlyPrice"),
      });
    if (!teacherId || !planId || name.length < 2) {
      return { error: "Informe o nome do plano." };
    }
    if (!parsed.success) {
      return { error: "Informe aulas por mês e um preço mensal válido." };
    }
    const monthlyPriceCents = parseMoneyToCents(parsed.data.monthlyPrice);

    const assignment = await prisma.teacherPlan.findFirst({
      where: { teacherId, planId, arenaId: auth.arenaId, active: true },
      select: { id: true },
    });
    if (!assignment) {
      return { error: "Plano não encontrado para este professor." };
    }
    const duplicate = await prisma.plan.findFirst({
      where: { arenaId: auth.arenaId, name, NOT: { id: planId } },
      select: { id: true },
    });
    if (duplicate) {
      return { error: "Já existe outro plano ativo com este nome." };
    }

    const updated = await prisma.plan.updateMany({
      where: { id: planId, arenaId: auth.arenaId },
      data: {
        name,
        classesPerMonth: parsed.data.classesPerMonth,
        monthlyPriceCents,
        updatedByUserId: auth.userId,
      },
    });
    if (!updated.count) {
      return { error: "Não foi possível localizar este plano." };
    }
    refreshAcademyRoutes();
  } catch (error) {
    console.error("Falha ao atualizar plano do professor", error);
    return {
      error:
        "Não foi possível atualizar o plano. Revise os dados e tente novamente.",
    };
  }
}

export async function assignTeacherPlanStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const teacherId = String(formData.get("teacherId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const classGroupId = String(formData.get("classGroupId") ?? "");
  const startedAt =
    parseFormDate(String(formData.get("startedAt") ?? "")) ?? new Date();
  const dueDateInput = parseFormDate(String(formData.get("dueDate") ?? ""));
  const dueDay =
    dueDateInput?.getDate() ??
    Math.min(28, Math.max(1, Number(formData.get("dueDay") ?? 10) || 10));
  const remainingClasses = z.coerce
    .number()
    .int()
    .min(0)
    .max(500)
    .parse(formData.get("remainingClasses") ?? "0");
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
  const [teacher, plan, client, classGroup] = await Promise.all([
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
    prisma.player.findFirst({
      where: { id: clientId, arenaId: auth.arenaId, active: true },
      select: { id: true, name: true, phone: true },
    }),
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
  if (!teacher || !plan || !client)
    throw new Error("Professor, plano ou cliente não encontrado.");
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
    plan.monthlyPriceCents,
    discount,
    discountMode,
  );
  const recurringAmountCents =
    discountApplication === "RECURRING"
      ? discountedAmountCents
      : plan.monthlyPriceCents;
  const firstAmountCents = discountedAmountCents;
  const firstDueDate = dueDateInput ?? getFirstDueDate(startedAt, dueDay);
  await prisma.$transaction(async (tx) => {
    const student = await tx.student.upsert({
      where: { playerId: client.id },
      update: {
        active: true,
        name: client.name,
        phone: client.phone,
        remainingClasses,
        totalClasses: { increment: remainingClasses },
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
    const subscription = await tx.studentSubscription.findFirst({
      where: { arenaId: auth.arenaId, studentId: student.id, planId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
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
    if (subscription)
      await tx.studentSubscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          endedAt: null,
          monthlyPriceCents: recurringAmountCents,
          classesPerMonth: plan.classesPerMonth,
          dueDay,
          startedAt,
          notes: note,
        },
      });
    else
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
      where: {
        arenaId: auth.arenaId,
        planId,
        counterpartyName: client.name,
        active: true,
      },
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
        planId,
        notes: `Gerado pelo plano do professor. ${note}`,
      },
    });
    await tx.financialEntry.create({
      data: {
        arenaId: auth.arenaId,
        type: "REVENUE",
        counterpartyName: client.name,
        category: "Planos de aulas",
        description: `${plan.name} · ${client.name}`,
        amountCents: firstAmountCents,
        dueDate: firstDueDate,
        planId,
        recurrenceId: recurrence.id,
        notes: `Primeira mensalidade. ${note}`,
      },
    });
    let nextDueDate = getNextFinancialRecurrenceDate(firstDueDate, "MONTHLY");
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
          recurrenceId: recurrence.id,
          notes: `Mensalidade recorrente gerada pelo plano do professor. ${note}`,
        },
      });
      nextDueDate = getNextFinancialRecurrenceDate(nextDueDate, "MONTHLY");
    }
    await tx.financialRecurrence.update({
      where: { id: recurrence.id },
      data: { nextDueDate },
    });
  });
  refreshAcademyRoutes();
}

export async function copyTeacherPlansAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
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

    for (const { plan } of source.planAssignments) {
      const name = `${plan.name} · ${target.name}`;
      const copiedPlan = await tx.plan.upsert({
        where: { arenaId_name: { arenaId: auth.arenaId, name } },
        update: {
          monthlyPriceCents: plan.monthlyPriceCents,
          classesPerMonth: plan.classesPerMonth,
          notes: plan.notes,
          active: true,
          updatedByUserId: auth.userId,
        },
        create: {
          arenaId: auth.arenaId,
          name,
          monthlyPriceCents: plan.monthlyPriceCents,
          classesPerMonth: plan.classesPerMonth,
          notes: plan.notes,
          createdByUserId: auth.userId,
          updatedByUserId: auth.userId,
        },
      });
      await tx.teacherPlan.upsert({
        where: {
          teacherId_planId: { teacherId: target.id, planId: copiedPlan.id },
        },
        update: { active: true },
        create: {
          arenaId: auth.arenaId,
          teacherId: target.id,
          planId: copiedPlan.id,
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
  const assignment = await prisma.teacherPlan.findFirst({
    where: { teacherId, planId, arenaId: auth.arenaId, active: true },
    select: { id: true },
  });
  if (!assignment) throw new Error("Vínculo de plano não encontrado.");
  await prisma.studentSubscription.updateMany({
    where: { arenaId: auth.arenaId, studentId, planId, status: "ACTIVE" },
    data: { status: "CANCELED", endedAt: new Date() },
  });
  refreshAcademyRoutes();
}

export async function createLessonAction(formData: FormData) {
  const auth = await requireModuleEdit("lessons");
  const studentIds = getFormValues(formData, "studentIds");
  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    teacherId: formData.get("teacherId"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    isPaid: formData.get("isPaid"),
    price: formData.get("price"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const scheduledAt = parseScheduledAt(parsed.data.scheduledAt);
  const priceCents = parsed.data.isPaid
    ? parseMoneyToCents(parsed.data.price)
    : 0;
  const paidAt = priceCents > 0 ? new Date() : null;

  await prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.create({
      data: {
        arenaId: auth.arenaId,
        title: parsed.data.title,
        teacherId: parsed.data.teacherId || null,
        scheduledAt,
        durationMinutes: parsed.data.durationMinutes,
        priceCents,
        paymentMethod: priceCents > 0 ? parsed.data.paymentMethod : "",
        paidAt,
        notes: parsed.data.notes,
        attendances: {
          create: studentIds.map((studentId) => ({
            studentId,
            status: "PRESENT",
          })),
        },
      },
    });

    if (priceCents > 0) {
      await tx.financialEntry.create({
        data: {
          arenaId: auth.arenaId,
          type: "REVENUE",
          category: "Aulas avulsas",
          description: `${lesson.title} - ${scheduledAt ? scheduledAt.toLocaleDateString("pt-BR") : "sem data"}`,
          amountCents: priceCents,
          paymentMethod: parsed.data.paymentMethod,
          status: "PAID",
          dueDate: paidAt,
          paidAt,
          notes: "Receita gerada automaticamente pelo registro de aula paga.",
        },
      });
    }
  });

  refreshAcademyRoutes();
}

export async function completeLessonAction(formData: FormData) {
  const auth = await requireModuleEdit("lessons");
  const lessonId = String(formData.get("lessonId") ?? "");
  const absentStudentIds = new Set(getFormValues(formData, "absentStudentIds"));

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      arenaId: auth.arenaId,
    },
    include: {
      attendances: true,
    },
  });

  if (!lesson) {
    throw new Error("Aula não encontrada.");
  }

  if (lesson.status === "COMPLETED") {
    throw new Error("Esta aula já foi concluída.");
  }

  await prisma.$transaction(async (tx) => {
    for (const attendance of lesson.attendances) {
      const isAbsent = absentStudentIds.has(attendance.studentId);

      await tx.lessonAttendance.update({
        where: {
          id: attendance.id,
        },
        data: {
          status: isAbsent ? "ABSENT" : "PRESENT",
        },
      });

      if (isAbsent) {
        await tx.student.update({
          where: {
            id: attendance.studentId,
          },
          data: {
            missedClasses: {
              increment: 1,
            },
          },
        });
      } else {
        await tx.student.update({
          where: {
            id: attendance.studentId,
          },
          data: {
            attendedClasses: {
              increment: 1,
            },
          },
        });

        await tx.student.updateMany({
          where: {
            id: attendance.studentId,
            remainingClasses: {
              gt: 0,
            },
          },
          data: {
            remainingClasses: {
              decrement: 1,
            },
          },
        });
      }
    }

    await tx.lesson.update({
      where: {
        id: lesson.id,
      },
      data: {
        status: "COMPLETED",
      },
    });
  });

  refreshAcademyRoutes();
}

export async function deleteLessonAction(formData: FormData) {
  const auth = await requireModuleEdit("lessons");
  const lessonId = String(formData.get("lessonId") ?? "");

  if (!lessonId) {
    throw new Error("Aula invalida.");
  }

  const deleted = await prisma.lesson.deleteMany({
    where: {
      id: lessonId,
      arenaId: auth.arenaId,
    },
  });

  if (!deleted.count) {
    throw new Error("Aula nao encontrada.");
  }

  refreshAcademyRoutes();
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const optionalText = z.string().trim().default("");

const studentSchema = z.object({
  name: z.string().trim().default(""),
  playerId: z.string().trim().default(""),
  phone: optionalText,
  email: z.string().trim().email("Informe um e-mail válido.").or(z.literal("")).default(""),
  remainingClasses: z.coerce.number().int().min(0, "Aulas restantes inválidas.").default(0),
  notes: optionalText
});

const teacherSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do professor."),
  phone: optionalText,
  email: z.string().trim().email("Informe um e-mail válido.").or(z.literal("")).default(""),
  monthlyTarget: z.coerce.number().int().min(0, "Meta mensal inválida.").default(0),
  notes: optionalText
});

const lessonSchema = z.object({
  title: z.string().trim().min(2, "Informe o nome da aula."),
  teacherId: z.string().optional().default(""),
  scheduledAt: z.string().optional().default(""),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(60),
  isPaid: z.string().optional().default(""),
  price: z.string().trim().optional().default(""),
  paymentMethod: z.string().trim().optional().default("PIX"),
  notes: optionalText
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
  const auth = await requireRole("STAFF");
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    playerId: formData.get("playerId"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    remainingClasses: formData.get("remainingClasses"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const linkedPlayer = parsed.data.playerId
    ? await prisma.player.findFirst({
        where: {
          id: parsed.data.playerId,
          arenaId: auth.arenaId
        }
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
        name: linkedPlayer.name
      }
    });

    if (existingStudent) {
      await prisma.student.update({
        where: {
          id: existingStudent.id
        },
        data: {
          playerId: linkedPlayer.id,
          phone: parsed.data.phone || existingStudent.phone,
          email: parsed.data.email || existingStudent.email,
          remainingClasses: {
            increment: parsed.data.remainingClasses
          },
          totalClasses: {
            increment: parsed.data.remainingClasses
          },
          notes: parsed.data.notes || existingStudent.notes
        }
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
      totalClasses: parsed.data.remainingClasses
    }
  });

  refreshAcademyRoutes();
}

export async function addStudentCreditsAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const studentId = String(formData.get("studentId") ?? "");
  const quantity = z.coerce.number().int().min(1).max(200).parse(formData.get("quantity"));

  const updated = await prisma.student.updateMany({
    where: {
      id: studentId,
      arenaId: auth.arenaId
    },
    data: {
      remainingClasses: {
        increment: quantity
      },
      totalClasses: {
        increment: quantity
      }
    }
  });

  if (!updated.count) {
    throw new Error("Aluno não encontrado.");
  }

  refreshAcademyRoutes();
}

export async function updateStudentAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const studentId = String(formData.get("studentId") ?? "");
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    playerId: "",
    phone: formData.get("phone"),
    email: formData.get("email"),
    remainingClasses: formData.get("remainingClasses"),
    notes: formData.get("notes")
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
      arenaId: auth.arenaId
    }
  });

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  const nameConflict = await prisma.student.findFirst({
    where: {
      arenaId: auth.arenaId,
      name: parsed.data.name,
      NOT: {
        id: student.id
      }
    }
  });

  if (nameConflict) {
    throw new Error("Já existe outro aluno com esse nome.");
  }

  await prisma.student.update({
    where: {
      id: student.id
    },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      remainingClasses: parsed.data.remainingClasses,
      notes: parsed.data.notes
    }
  });

  refreshAcademyRoutes();
}

export async function deleteStudentAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const studentId = String(formData.get("studentId") ?? "");

  const deleted = await prisma.student.deleteMany({
    where: {
      id: studentId,
      arenaId: auth.arenaId
    }
  });

  if (!deleted.count) {
    throw new Error("Aluno não encontrado.");
  }

  refreshAcademyRoutes();
}

export async function createTeacherAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const parsed = teacherSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    monthlyTarget: formData.get("monthlyTarget"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.teacher.create({
    data: {
      arenaId: auth.arenaId,
      ...parsed.data
    }
  });

  refreshAcademyRoutes();
}

export async function createLessonAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const studentIds = getFormValues(formData, "studentIds");
  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    teacherId: formData.get("teacherId"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    isPaid: formData.get("isPaid"),
    price: formData.get("price"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const scheduledAt = parseScheduledAt(parsed.data.scheduledAt);
  const priceCents = parsed.data.isPaid ? parseMoneyToCents(parsed.data.price) : 0;
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
            status: "PRESENT"
          }))
        }
      }
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
          notes: "Receita gerada automaticamente pelo registro de aula paga."
        }
      });
    }
  });

  refreshAcademyRoutes();
}

export async function completeLessonAction(formData: FormData) {
  const auth = await requireRole("STAFF");
  const lessonId = String(formData.get("lessonId") ?? "");
  const absentStudentIds = new Set(getFormValues(formData, "absentStudentIds"));

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      arenaId: auth.arenaId
    },
    include: {
      attendances: true
    }
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
          id: attendance.id
        },
        data: {
          status: isAbsent ? "ABSENT" : "PRESENT"
        }
      });

      if (isAbsent) {
        await tx.student.update({
          where: {
            id: attendance.studentId
          },
          data: {
            missedClasses: {
              increment: 1
            }
          }
        });
      } else {
        await tx.student.update({
          where: {
            id: attendance.studentId
          },
          data: {
            attendedClasses: {
              increment: 1
            }
          }
        });

        await tx.student.updateMany({
          where: {
            id: attendance.studentId,
            remainingClasses: {
              gt: 0
            }
          },
          data: {
            remainingClasses: {
              decrement: 1
            }
          }
        });
      }
    }

    await tx.lesson.update({
      where: {
        id: lesson.id
      },
      data: {
        status: "COMPLETED"
      }
    });
  });

  refreshAcademyRoutes();
}

"use server";
import { consumeLessonCredit } from "@/lib/academy/lesson-credits";
import { arenaDatabase } from "@/lib/arena-database";
import { requireModuleEdit } from "@/lib/auth/guards";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { lessonSchema } from "@/lib/academy/action-schemas";
import { getFormValues, parseMoneyToCents, parseScheduledAt } from "@/lib/academy/inputs";
import { refreshAcademyRoutes } from "@/lib/academy/revalidation";

export async function createLessonAction(formData: FormData) {
  const auth = await requireModuleEdit("lessons");
  const prisma = arenaDatabase(auth.arenaId);
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
    const bankAccountId = priceCents > 0 ? await requireReceivingBankAccount(tx, auth.arenaId, formData.get("bankAccountId")) : null;
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
          bankAccountId,
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
  const prisma = arenaDatabase(auth.arenaId);
  const lessonId = String(formData.get("lessonId") ?? "");
  const absentStudentIds = new Set(getFormValues(formData, "absentStudentIds"));

  const lesson = await withArenaTransaction(auth.arenaId, (tx) => tx.lesson.findFirst({
    where: { id: lessonId, arenaId: auth.arenaId },
    select: { id: true, status: true },
  }));

  if (!lesson) {
    throw new Error("Aula não encontrada.");
  }

  if (lesson.status === "COMPLETED") {
    throw new Error("Esta aula já foi concluída.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Lesson" WHERE id=${lesson.id} AND "arenaId"=${auth.arenaId} FOR UPDATE`;
    const currentLesson=await tx.lesson.findFirst({where:{id:lesson.id,arenaId:auth.arenaId},select:{status:true,attendances:true}});
    if(!currentLesson || currentLesson.status==="COMPLETED")throw new Error("Esta aula já foi concluída.");

    for (const attendance of [...currentLesson.attendances].sort((a,b)=>a.studentId.localeCompare(b.studentId))) {
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
        if (!attendance.makeupRequestedAt) await consumeLessonCredit(tx,auth.arenaId,attendance.studentId,attendance.id);
      } else if (!attendance.checkedInAt) {
        const next=await consumeLessonCredit(tx,auth.arenaId,attendance.studentId,attendance.id);
        await tx.student.update({where:{id:attendance.studentId},data:{attendedClasses:{increment:1},remainingClasses:next}});
        if (attendance.makeupRequestedAt) await tx.lessonAttendance.update({ where: { id: attendance.id }, data: { makeupRequestedAt: null, makeupExpiresAt: null } });
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
  const prisma = arenaDatabase(auth.arenaId);
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

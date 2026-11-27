import { AcademyOperationError } from "@/lib/backend/academy-operation-error";
import "server-only";
import { changeLessonCredits, lessonCreditState } from "@/lib/academy/lesson-credits";
import { arenaDatabase } from "@/lib/arena-database";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { studentSchema } from "@/lib/academy/action-schemas";


export async function createStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("students");
  const prisma = arenaDatabase(auth.arenaId);
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    playerId: formData.get("playerId"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    remainingClasses: formData.get("remainingClasses"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new AcademyOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const linkedPlayer = parsed.data.playerId
    ? await withArenaTransaction(auth.arenaId, (tx) => tx.player.findFirst({
        where: {
          id: parsed.data.playerId,
          arenaId: auth.arenaId,
        },
      }))
    : null;
  if (parsed.data.playerId && !linkedPlayer) {
    throw new AcademyOperationError("Cliente não encontrado nesta arena.");
  }
  const studentName = linkedPlayer?.name ?? parsed.data.name;

  if (studentName.trim().length < 2) {
    throw new AcademyOperationError("Informe o nome do aluno ou selecione um jogador.");
  }

  if (linkedPlayer) {
    const existingStudent = await prisma.student.findFirst({
      where: {
        arenaId: auth.arenaId,
        name: linkedPlayer.name,
      },
    });

    if (existingStudent) {
      if (existingStudent.playerId && existingStudent.playerId !== linkedPlayer.id) {
        throw new AcademyOperationError("Este aluno já está vinculado a outro cliente com o mesmo nome.");
      }
      await withArenaTransaction(auth.arenaId,async tx=>{
        if(parsed.data.remainingClasses>0) await changeLessonCredits(tx,auth.arenaId,existingStudent.id,parsed.data.remainingClasses);
        await tx.student.update({where:{id:existingStudent.id},data:{playerId:linkedPlayer.id,phone:parsed.data.phone||existingStudent.phone,email:parsed.data.email||existingStudent.email,notes:parsed.data.notes||existingStudent.notes}});
      });


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


}

export async function addStudentCreditsAction(formData: FormData) {
  const auth = await requireModuleEdit("students");
  const prisma = arenaDatabase(auth.arenaId);
  const studentId = String(formData.get("studentId") ?? "");
  const quantity = z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .parse(formData.get("quantity"));

  await withArenaTransaction(auth.arenaId,tx=>changeLessonCredits(tx,auth.arenaId,studentId,quantity));


}

export async function updateStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("students");
  const prisma = arenaDatabase(auth.arenaId);
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
    throw new AcademyOperationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  if (parsed.data.name.trim().length < 2) {
    throw new AcademyOperationError("Informe o nome do aluno.");
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      arenaId: auth.arenaId,
    },
  });

  if (!student) {
    throw new AcademyOperationError("Aluno não encontrado.");
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
    throw new AcademyOperationError("Já existe outro aluno com esse nome.");
  }

  await withArenaTransaction(auth.arenaId,async tx=>{
    const state=await lessonCreditState(tx,auth.arenaId,student.id);
    await changeLessonCredits(tx,auth.arenaId,student.id,parsed.data.remainingClasses-state.available);
    await tx.student.update({where:{id:student.id},data:{name:parsed.data.name,phone:parsed.data.phone,email:parsed.data.email,notes:parsed.data.notes}});
  });


}

export async function deleteStudentAction(formData: FormData) {
  const auth = await requireModuleEdit("students");
  const prisma = arenaDatabase(auth.arenaId);
  const studentId = String(formData.get("studentId") ?? "");

  const deleted = await prisma.student.deleteMany({
    where: {
      id: studentId,
      arenaId: auth.arenaId,
    },
  });

  if (!deleted.count) {
    throw new AcademyOperationError("Aluno não encontrado.");
  }


}

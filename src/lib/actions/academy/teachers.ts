"use server";
import { arenaDatabase } from "@/lib/arena-database";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { teacherSchema } from "@/lib/academy/action-schemas";
import { refreshAcademyRoutes } from "@/lib/academy/revalidation";

export async function createTeacherAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const prisma = arenaDatabase(auth.arenaId);
  const playerId = String(formData.get("playerId") ?? "").trim();
  const client = playerId
    ? await withArenaTransaction(auth.arenaId, (tx) => tx.player.findFirst({
        where: { id: playerId, arenaId: auth.arenaId, active: true, teacher: null },
        select: { id: true, name: true, phone: true, email: true },
      }))
    : null;

  if (!client) {
    throw new Error("Cliente inválido ou já vinculado a outro professor.");
  }

  const parsed = teacherSchema.safeParse({
    name: client.name,
    phone: client.phone,
    email: client.email,
    monthlyTarget: formData.get("monthlyTarget"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const standaloneTeacher = await prisma.teacher.findFirst({ where: { arenaId: auth.arenaId, name: client.name, playerId: null }, select: { id: true } });
  if (standaloneTeacher) {
    await prisma.teacher.update({ where: { id: standaloneTeacher.id }, data: { ...parsed.data, playerId: client.id, active: true, updatedByUserId: auth.userId } });
  } else {
    await prisma.teacher.create({
      data: {
        arenaId: auth.arenaId,
        playerId: client.id,
        createdByUserId: auth.userId,
        updatedByUserId: auth.userId,
        ...parsed.data,
      },
    });
  }

  refreshAcademyRoutes();
}

export async function archiveTeacherAction(formData: FormData) {
  const auth = await requireModuleEdit("teachers");
  const prisma = arenaDatabase(auth.arenaId);
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
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Teacher" WHERE "id" = ${teacherId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const teacher = await tx.teacher.findFirst({
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
    if (teacher.active) throw new Error("Desative o professor antes de excluí-lo definitivamente.");
    const historicalLinks = [
      teacher._count.lessons,
      teacher._count.scheduleOccurrences,
      teacher._count.payrollEntries,
      teacher._count.classGroups,
      teacher._count.classGroupMakeups,
    ];
    if (historicalLinks.some(Boolean)) {
      throw new Error("Este professor possui histórico operacional. Mantenha-o inativo para preservar os dados.");
    }
    await tx.teacherPlan.deleteMany({ where: { teacherId: teacher.id } });
    await tx.teacherStudent.deleteMany({ where: { teacherId: teacher.id } });
    await tx.teacher.delete({ where: { id: teacher.id } });
  });
  refreshAcademyRoutes();
}

import { consumeLessonCredit } from "../academy/lesson-credits";
import type { Prisma } from "@prisma/client";
import { arenaWallClockToInstant } from "../calendar/arena-wall-clock";

/** Shared by the athlete portal and the arena QR. Student lock serializes credit use. */
export async function registerLessonCheckin(tx: Prisma.TransactionClient, input: { arenaId: string; playerId: string; lessonId: string }, now = new Date()) {
  const student = await tx.student.findFirst({ where: { arenaId: input.arenaId, playerId: input.playerId, active: true }, select: { id: true } });
  if (!student) throw new Error("Esta aula não está disponível para check-in.");
  await tx.$queryRaw`SELECT id FROM "Lesson" WHERE id = ${input.lessonId} AND "arenaId" = ${input.arenaId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "Student" WHERE id = ${student.id} AND "arenaId" = ${input.arenaId} FOR UPDATE`;
  const attendance = await tx.lessonAttendance.findFirst({
    where: { lessonId: input.lessonId, studentId: student.id, lesson: { arenaId: input.arenaId }, student: { active: true, arenaId: input.arenaId, playerId: input.playerId } },
    include: { lesson: { select: { scheduledAt: true, status: true } }, student: { include: { subscriptions: { where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1 } } } },
  });
  if (!attendance?.lesson.scheduledAt || attendance.lesson.status !== "SCHEDULED") throw new Error("Esta aula não está disponível para check-in.");
  if (attendance.checkedInAt) return attendance;
  const startsAt = attendance.lesson.scheduledAt;
  const instant = arenaWallClockToInstant(startsAt).getTime();
  if (now.getTime() < instant - 3 * 60 * 60_000 || now.getTime() > instant + 8 * 60 * 60_000) throw new Error("O check-in fica disponível três horas antes da aula e até oito horas após o início.");
  const remaining = await consumeLessonCredit(tx,input.arenaId,student.id,attendance.id,now);
  const result = await tx.lessonAttendance.update({ where: { id: attendance.id }, data: { status: "PRESENT", checkedInAt: now } });
  await tx.student.update({ where: { id: student.id }, data: { remainingClasses: remaining, attendedClasses: { increment: 1 } } });
  await tx.auditEvent.create({ data: { arenaId: input.arenaId, actorId: input.playerId, actorName: attendance.student.name, action: "LESSON_CHECKIN", entityId: input.lessonId, details: { studentId: student.id, remainingClasses: remaining } } });
  return result;
}

export async function registerQrLessonCheckin(tx: Prisma.TransactionClient, input: { arenaId: string; playerId: string; lessonId: string; token: string }, now = new Date()) {
  await tx.$queryRaw`SELECT id FROM "Arena" WHERE id = ${input.arenaId} FOR SHARE`;
  const arena = await tx.arena.findFirst({ where: { id: input.arenaId, checkinEnabled: true, checkinToken: input.token } });
  if (!arena || !input.token) throw new Error("Este QR Code foi desativado. Peça o código atual à recepção.");
  return registerLessonCheckin(tx, input, now);
}

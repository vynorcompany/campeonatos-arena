import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { playerLessonCredits } from '@/lib/academy/lesson-credit-portal';
import { lessonCreditBalanceSchema, lessonCreditRequestsSchema } from '@/lib/backend/contracts/lesson-credit-reads';
export async function resolveLessonCreditBalance(arenaId: string, playerId: string, arenaSlug: string) {
  return lessonCreditBalanceSchema.parse(await withArenaTransaction(arenaId, tx => playerLessonCredits(tx, arenaId, playerId, arenaSlug)));
}
export async function resolveLessonCreditRequests(arenaId: string, teacherPlayerId?: string) {
  return withArenaTransaction(arenaId, async tx => {
    const teacher = teacherPlayerId ? await tx.teacher.findFirst({ where: { arenaId, playerId: teacherPlayerId, active: true }, select: { id: true } }) : null;
    if (teacherPlayerId && !teacher) return [];
    const rows = await tx.lessonCreditRequest.findMany({ where: { arenaId, status: 'PENDING', ...(teacher ? { batch: { student: { teacherAssignments: { some: { teacherId: teacher.id, active: true, arenaId } } } } } : {}) },
      select: { id: true, message: true, batch: { select: { remaining: true, expiresAt: true, student: { select: { name: true } } } } }, orderBy: { createdAt: 'asc' }, take: 50 });
    return lessonCreditRequestsSchema.parse(rows.map(row => ({ ...row, batch: { ...row.batch, expiresAt: row.batch.expiresAt?.toISOString() ?? null } })));
  });
}

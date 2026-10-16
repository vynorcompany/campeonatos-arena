import type { ArenaTransaction } from "@/lib/rls";

export async function lockStudentPlanSubscription(tx: ArenaTransaction, arenaId: string, playerOrStudentId: string, planId: string) {
  const lockKey = `student-plan:${arenaId}:${playerOrStudentId}:${planId}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text`;
}

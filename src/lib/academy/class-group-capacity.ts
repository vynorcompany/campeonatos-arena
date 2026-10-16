import type { ArenaTransaction } from "@/lib/rls";

export async function lockClassGroupCapacity(tx: ArenaTransaction, arenaId: string, classGroupId: string) {
  const lockKey = `class-capacity:${arenaId}:${classGroupId}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text`;
}

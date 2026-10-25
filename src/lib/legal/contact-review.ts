import type { ArenaTransaction } from "@/lib/rls";

export async function releaseRetainedContact(tx: ArenaTransaction, input: { arenaId: string; referenceId: string; userId: string; userName: string; reason: string }) {
  const reference = await tx.erasedContactReference.findFirst({ where: { id: input.referenceId, arenaId: input.arenaId }, select: { id: true, playerId: true, contactHash: true } });
  if (!reference) return false;
  const removed = await tx.erasedContactReference.deleteMany({ where: { contactHash: reference.contactHash, arenaId: input.arenaId } });
  if (removed.count === 0) return false;
  await tx.auditEvent.create({ data: { arenaId: input.arenaId, actorId: input.userId, actorName: input.userName, action: "RETAINED_CONTACT_RELEASED", entityId: reference.id, details: { previousPlayerId: reference.playerId, reason: input.reason, referencesRemoved: removed.count, financialRecordsChanged: false } } });
  return true;
}

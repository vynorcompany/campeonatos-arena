import type { ArenaTransaction } from "@/lib/rls";
export async function validateGuardian(tx: ArenaTransaction, arenaId: string, guardianId: string, playerId?: string) {
    await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtextextended(${`guardian:${arenaId}`}, 0))`;
    if (!guardianId)
        return null;
    if (guardianId === playerId)
        throw new Error("O cliente não pode ser responsável por si mesmo.");
    const guardian = await tx.player.findFirst({ where: { id: guardianId, arenaId, active: true, guardianId: null, mergedIntoPlayerId: null }, select: { id: true } });
    if (!guardian)
        throw new Error("Selecione um responsável ativo desta arena, sem outro responsável vinculado.");
    if (playerId && await tx.player.count({ where: { arenaId, guardianId: playerId } }))
        throw new Error("Um responsável com dependentes não pode ser vinculado a outro responsável.");
    return guardian.id;
}

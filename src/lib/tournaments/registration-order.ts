import type { Prisma } from "@prisma/client";

/** Serializes registrations of one tournament before checking capacity and assigning order. */
export async function lockTournamentRegistrations(tx: Prisma.TransactionClient, tournamentId: string, arenaId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Tournament"
    WHERE "id" = ${tournamentId} AND "arenaId" = ${arenaId}
    FOR UPDATE
  `;
  if (rows.length !== 1) throw new Error("Torneio não encontrado nesta arena.");
}

export async function nextTournamentRegistrationOrder(tx: Prisma.TransactionClient, tournamentId: string) {
  const aggregate = await tx.publicTournamentRegistration.aggregate({
    where: { tournamentId },
    _max: { registrationOrder: true },
  });
  return (aggregate._max.registrationOrder ?? 0) + 1;
}

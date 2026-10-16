import type { ArenaTransaction } from "@/lib/rls";

type ProposalInput = {
  arenaId: string;
  categoryMatchId: string;
  courtId: string;
  proposerPairId: string;
  opponentPairId: string;
  startsAt: Date;
  endsAt: Date;
  responseDueAt: Date;
};

export async function createLimitedLeagueProposal(tx: ArenaTransaction, input: ProposalInput) {
  // Serialize proposals for one match before checking its three-attempt limit.
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CategoryMatch" WHERE "id" = ${input.categoryMatchId} FOR UPDATE`;
  if (!locked.length) throw new Error("Não existe jogo pendente entre estas duplas.");
  const match = await tx.categoryMatch.findFirst({
    where: {
      id: input.categoryMatchId,
      homePairId: input.proposerPairId,
      awayPairId: input.opponentPairId,
      winnerPairId: null,
      OR: [{ manualStatus: null }, { manualStatus: { not: "FINISHED" } }],
      competition: { format: "LEAGUE", status: "PUBLISHED", category: { tournament: { arenaId: input.arenaId } } },
    },
    select: { id: true },
  });
  if (!match) throw new Error("Não existe jogo pendente entre estas duplas.");
  const count = await tx.leagueMatchProposal.count({ where: { categoryMatchId: match.id } });
  if (count >= 3) throw new Error("As três sugestões deste confronto já foram utilizadas.");
  return tx.leagueMatchProposal.create({ data: {
    categoryMatchId: match.id,
    courtId: input.courtId,
    proposerPairId: input.proposerPairId,
    opponentPairId: input.opponentPairId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    responseDueAt: input.responseDueAt,
  } });
}

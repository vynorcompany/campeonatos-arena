export const categoryMatchManualStatuses = [
  "WAITING",
  "SCHEDULED",
  "LIVE",
  "FINISHED",
] as const;

export type CategoryMatchManualStatus =
  (typeof categoryMatchManualStatuses)[number];

export function buildReopenedMatch(
  match: {
    homeScore: number | null;
    awayScore: number | null;
    winnerPairId: string | null;
  },
  status: Extract<CategoryMatchManualStatus, "WAITING" | "SCHEDULED" | "LIVE">,
) {
  return {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    winnerPairId: null,
    manualStatus: status,
  };
}

export function assertMatchCanBeCorrected(match: {
  stage: string;
  winnerPairId: string | null;
  hasDownstreamParticipant: boolean;
}) {
  if (
    match.stage !== "GROUP" &&
    match.winnerPairId &&
    match.hasDownstreamParticipant
  ) {
    throw new Error(
      "Não é possível corrigir este jogo porque o vencedor já foi enviado para a próxima fase.",
    );
  }
}

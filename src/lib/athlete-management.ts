type AthleteHistory = {
  tournamentEntries: number;
  pairAppearances: number;
  categoryPairAppearances?: number;
};

export function getAthleteDeletionRestriction({
  tournamentEntries,
  pairAppearances,
  categoryPairAppearances = 0
}: AthleteHistory) {
  if (tournamentEntries > 0 || pairAppearances > 0 || categoryPairAppearances > 0) {
    return "Este atleta possui histórico em torneios e não pode ser excluído. Inative-o para preservar os registros.";
  }

  return null;
}

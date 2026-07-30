type AthleteHistory = {
  tournamentEntries: number;
  pairAppearances: number;
};

export function getAthleteDeletionRestriction({ tournamentEntries, pairAppearances }: AthleteHistory) {
  if (tournamentEntries > 0 || pairAppearances > 0) {
    return "Este atleta possui histórico em torneios e não pode ser excluído. Inative-o para preservar os registros.";
  }

  return null;
}

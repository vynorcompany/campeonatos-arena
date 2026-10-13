type RankedPair = { id: string; name: string; wins: number; saldo: number; pointsFor: number };
type GroupMatch = { homePairId: string | null; awayPairId: string | null; homeScore: number | null; awayScore: number | null };

export function compareSuper12GroupPairs(left: RankedPair, right: RankedPair, matches: GroupMatch[]) {
  const primary = right.wins - left.wins || right.saldo - left.saldo;
  if (primary) return primary;

  const directMatch = matches.find((match) =>
    (match.homePairId === left.id && match.awayPairId === right.id)
    || (match.homePairId === right.id && match.awayPairId === left.id));
  if (directMatch?.homeScore != null && directMatch.awayScore != null && directMatch.homeScore !== directMatch.awayScore) {
    const leftWon = directMatch.homePairId === left.id
      ? directMatch.homeScore > directMatch.awayScore
      : directMatch.awayScore > directMatch.homeScore;
    return leftWon ? -1 : 1;
  }
  return right.pointsFor - left.pointsFor || left.name.localeCompare(right.name, "pt-BR") || left.id.localeCompare(right.id);
}

// Duplas de grupos diferentes não têm confronto direto. Use os critérios
// numéricos e uma ordem estável apenas se continuarem empatadas.
export function compareSuper12CrossGroupPairs(left: RankedPair, right: RankedPair) {
  return right.wins - left.wins || right.saldo - left.saldo || right.pointsFor - left.pointsFor
    || left.name.localeCompare(right.name, "pt-BR") || left.id.localeCompare(right.id);
}

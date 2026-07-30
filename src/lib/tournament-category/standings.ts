import type { GroupStandings, StandingMatch, StandingRow } from "./types";

function miniTableVictories(
  pairId: string,
  tiedPairIds: Set<string>,
  matches: StandingMatch[],
): number {
  let victories = 0;

  for (const match of matches) {
    const includesPair = match.homePairId === pairId || match.awayPairId === pairId;
    const opponentPairId = match.homePairId === pairId ? match.awayPairId : match.homePairId;
    if (!includesPair || !tiedPairIds.has(opponentPairId)) {
      continue;
    }

    const winnerPairId = match.winnerPairId ?? scoreWinner(match);
    if (winnerPairId === pairId) {
      victories += 1;
    }
  }

  return victories;
}

function scoreWinner(match: StandingMatch): string | null {
  if (match.homeScore == null || match.awayScore == null || match.homeScore === match.awayScore) {
    return null;
  }

  return match.homeScore > match.awayScore ? match.homePairId : match.awayPairId;
}

export function rankStandings(
  rows: StandingRow[],
  matches: StandingMatch[],
): StandingRow[] {
  const victoryLevels = [...new Set(rows.map((row) => row.victories))].sort((left, right) => right - left);

  return victoryLevels.flatMap((victories) => {
    const tiedRows = rows.filter((row) => row.victories === victories);
    const tiedPairIds = new Set(tiedRows.map((row) => row.pairId));
    const headToHeadVictories = new Map(
      tiedRows.map((row) => [
        row.pairId,
        miniTableVictories(row.pairId, tiedPairIds, matches),
      ]),
    );

    return tiedRows.sort((left, right) => {
      const headToHeadDifference =
        (headToHeadVictories.get(right.pairId) ?? 0) -
        (headToHeadVictories.get(left.pairId) ?? 0);
      if (headToHeadDifference !== 0) {
        return headToHeadDifference;
      }

      if (left.differential !== right.differential) {
        return right.differential - left.differential;
      }

      return left.pairId.localeCompare(right.pairId);
    });
  });
}

export function selectQuarterfinalists(groups: GroupStandings[]): string[] {
  const rankedGroups = groups.map((group) => ({
    rows: rankStandings(group.rows, group.matches),
    matches: group.matches,
  }));
  const allMatches = rankedGroups.flatMap((group) => group.matches);
  const qualified: StandingRow[] = [];

  for (const group of rankedGroups) {
    qualified.push(...group.rows.slice(0, 2));
  }

  if (qualified.length >= 8) {
    return rankStandings(qualified, allMatches)
      .slice(0, 8)
      .map((row) => row.pairId);
  }

  for (let position = 2; qualified.length < 8; position += 1) {
    const candidates = rankedGroups
      .map((group) => group.rows[position])
      .filter((row): row is StandingRow => row !== undefined);

    if (candidates.length === 0) {
      break;
    }

    qualified.push(...rankStandings(candidates, allMatches).slice(0, 8 - qualified.length));
  }

  if (qualified.length !== 8) {
    throw new Error("Exactly eight pairs are required for quarterfinal qualification.");
  }

  return qualified.map((row) => row.pairId);
}

import type { GroupStandings, StandingMatch, StandingRow } from "./types";

function headToHeadResult(
  leftPairId: string,
  rightPairId: string,
  matches: StandingMatch[],
): number {
  let leftWins = 0;
  let rightWins = 0;

  for (const match of matches) {
    const isHeadToHead =
      (match.homePairId === leftPairId && match.awayPairId === rightPairId) ||
      (match.homePairId === rightPairId && match.awayPairId === leftPairId);

    if (!isHeadToHead) {
      continue;
    }

    const winnerPairId = match.winnerPairId ?? scoreWinner(match);
    if (winnerPairId === leftPairId) {
      leftWins += 1;
    } else if (winnerPairId === rightPairId) {
      rightWins += 1;
    }
  }

  return rightWins - leftWins;
}

function scoreWinner(match: StandingMatch): string | null {
  if (match.homeScore == null || match.awayScore == null || match.homeScore === match.awayScore) {
    return null;
  }

  return match.homeScore > match.awayScore ? match.homePairId : match.awayPairId;
}

function compareStandings(
  left: StandingRow,
  right: StandingRow,
  matches: StandingMatch[],
): number {
  if (left.victories !== right.victories) {
    return right.victories - left.victories;
  }

  const headToHead = headToHeadResult(left.pairId, right.pairId, matches);
  if (headToHead !== 0) {
    return headToHead;
  }

  if (left.differential !== right.differential) {
    return right.differential - left.differential;
  }

  return left.pairId.localeCompare(right.pairId);
}

export function rankStandings(
  rows: StandingRow[],
  matches: StandingMatch[],
): StandingRow[] {
  return [...rows].sort((left, right) => compareStandings(left, right, matches));
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

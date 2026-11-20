import { rankStandings } from "./standings";

type Match = {
  stage: string;
  homePairId: string | null;
  awayPairId: string | null;
  winnerPairId: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

/** Uses completed encounters only: a partial Trio series is not a victory. */
export function groupDisplayStandings<T extends { id: string }>(pairs: readonly T[], matches: readonly Match[]) {
  const ids = new Set(pairs.map(pair => pair.id));
  const finished = matches.filter((match): match is Match & { homePairId: string; awayPairId: string; homeScore: number; awayScore: number; winnerPairId: string } =>
    match.stage === "GROUP" && Boolean(match.homePairId && match.awayPairId && match.winnerPairId) &&
    ids.has(match.homePairId!) && ids.has(match.awayPairId!) &&
    match.homeScore !== null && match.awayScore !== null,
  );
  const rows = pairs.map(pair => ({
    pairId: pair.id,
    victories: finished.filter(match => match.winnerPairId === pair.id).length,
    differential: finished.reduce((total, match) => total + (match.homePairId === pair.id ? match.homeScore - match.awayScore : match.awayPairId === pair.id ? match.awayScore - match.homeScore : 0), 0),
  }));
  const byId = new Map(pairs.map(pair => [pair.id, pair]));
  return (finished.length ? rankStandings(rows, finished) : rows).map((row, index) => {
    const played = finished.filter(match => match.homePairId === row.pairId || match.awayPairId === row.pairId).length;
    return { ...row, pair: byId.get(row.pairId)!, position: index + 1, matches: played, losses: played - row.victories };
  });
}

/** Presentation only: never rewrites draw order, group membership or seeding. */
export function orderGroupPairsByStandings<T extends { id: string }>(pairs: readonly T[], matches: readonly Match[]): T[] {
  return groupDisplayStandings(pairs, matches).map(row => row.pair);
}

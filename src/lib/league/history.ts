export type HistoricalStanding = {
  pairId: string;
  pairName: string;
  played: number;
  victories: number;
  differential: number;
};

type HistoricalMatch = {
  homePairId: string | null;
  awayPairId: string | null;
  winnerPairId: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function score(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function historicalPairs(snapshot: unknown): Array<{ id: string; name: string }> {
  const pairs = record(snapshot)?.pairs;
  if (!Array.isArray(pairs)) return [];
  return pairs.flatMap((value) => {
    const pair = record(value);
    const id = text(pair?.id);
    return id ? [{ id, name: text(pair?.name) ?? "Dupla sem nome" }] : [];
  });
}

function snapshotMatches(snapshot: unknown, pairs: Array<{ id: string; name: string }>): HistoricalMatch[] {
  const matches = record(snapshot)?.matches;
  if (!Array.isArray(matches)) return [];
  const idByName = new Map(pairs.map((pair) => [pair.name, pair.id]));
  return matches.map((value) => {
    const match = record(value);
    return {
      homePairId: idByName.get(text(match?.homePair) ?? "") ?? null,
      awayPairId: idByName.get(text(match?.awayPair) ?? "") ?? null,
      winnerPairId: idByName.get(text(match?.winnerPair) ?? "") ?? null,
      homeScore: score(match?.homeScore),
      awayScore: score(match?.awayScore),
    };
  });
}

/** Rebuilds the archived table without reading mutable, current-cycle pair records. */
export function historicalStandings(snapshot: unknown, cycleMatches: HistoricalMatch[]): HistoricalStanding[] {
  const pairs = historicalPairs(snapshot);
  const matches = cycleMatches.length ? cycleMatches : snapshotMatches(snapshot, pairs);
  const participantIds = new Set(matches.flatMap((match) => [match.homePairId, match.awayPairId].filter((id): id is string => Boolean(id))));
  const rows = new Map(pairs.filter((pair) => !matches.length || participantIds.has(pair.id)).map((pair) => [pair.id, {
    pairId: pair.id, pairName: pair.name, played: 0, victories: 0, differential: 0,
  }]));
  for (const match of matches) {
    const home = match.homePairId ? rows.get(match.homePairId) : null;
    const away = match.awayPairId ? rows.get(match.awayPairId) : null;
    if (!home || !away) continue;
    if (match.winnerPairId || match.homeScore != null && match.awayScore != null) {
      home.played += 1;
      away.played += 1;
    }
    home.differential += (match.homeScore ?? 0) - (match.awayScore ?? 0);
    away.differential += (match.awayScore ?? 0) - (match.homeScore ?? 0);
    if (match.winnerPairId === home.pairId) home.victories += 1;
    if (match.winnerPairId === away.pairId) away.victories += 1;
  }
  // Keep the same ordering used when a monthly League cycle is processed.
  return [...rows.values()].sort((left, right) =>
    right.victories - left.victories || right.differential - left.differential || left.pairId.localeCompare(right.pairId));
}

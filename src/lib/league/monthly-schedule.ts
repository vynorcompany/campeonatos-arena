export type LeagueMonthBlock = { number: 1 | 2 | 3 | 4; startsOn: string; endsOn: string };
export type MonthlyLeagueMatch = { homePairId: string; awayPairId: string; blockNumber: 1 | 2 | 3 | 4 };

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getLeagueMonthBlocks(year: number, month: number): LeagueMonthBlock[] {
  const lastDay = new Date(year, month, 0).getDate();
  return [
    { number: 1, startsOn: isoDate(year, month, 1), endsOn: isoDate(year, month, 7) },
    { number: 2, startsOn: isoDate(year, month, 8), endsOn: isoDate(year, month, 14) },
    { number: 3, startsOn: isoDate(year, month, 15), endsOn: isoDate(year, month, 21) },
    { number: 4, startsOn: isoDate(year, month, 22), endsOn: isoDate(year, month, lastDay) },
  ];
}

export function buildMonthlyLeagueSchedule(pairIds: string[]) {
  const distinctPairIds = [...new Set(pairIds)];
  const matches: MonthlyLeagueMatch[] = [];
  if (distinctPairIds.length < 2) return { matches, blockCounts: [0, 0, 0, 0] };
  const count = distinctPairIds.length;
  const regularSize = count % 2 ? count : count - 1;
  for (let first = 0; first < count; first += 1) {
    for (let second = first + 1; second < count; second += 1) {
      const left = distinctPairIds[first];
      const right = distinctPairIds[second];
      const leftHosts = count % 2
        ? ((second - first + count) % count) <= Math.floor(count / 2)
        : first === count - 1
          ? second < count / 2
          : second === count - 1
            ? first >= count / 2
            : ((second - first + regularSize) % regularSize) <= Math.floor(regularSize / 2);
      matches.push({ homePairId: leftHosts ? left : right, awayPairId: leftHosts ? right : left, blockNumber: ((matches.length % 4) + 1) as 1 | 2 | 3 | 4 });
    }
  }

  return {
    matches,
    blockCounts: [1, 2, 3, 4].map((blockNumber) => matches.filter((match) => match.blockNumber === blockNumber).length),
  };
}

import type { Pair } from "@prisma/client";
import type { GroupDraft, PairDraft } from "@/types/domain";

type RankedPlayer = {
  id: string;
  name: string;
  points: number;
};

function shuffleWindow<T>(items: T[], start: number, size: number) {
  const end = Math.min(items.length, start + size);

  for (let i = end - 1; i > start; i -= 1) {
    const j = start + Math.floor(Math.random() * (i - start + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function generateBalancedPairs(players: RankedPlayer[]): {
  pairs: PairDraft[];
  waitlist: RankedPlayer[];
} {
  const ordered = [...players].sort((a, b) => b.points - a.points);

  for (let index = 0; index < ordered.length; index += 2) {
    shuffleWindow(ordered, index, 2);
  }

  const middle = Math.ceil(ordered.length / 2);
  const strongerSide = ordered.slice(0, middle);
  const weakerSide = ordered.slice(middle).reverse();
  const pairs: PairDraft[] = [];
  const waitlist: RankedPlayer[] = [];

  if (strongerSide.length > weakerSide.length) {
    const leftover = strongerSide.pop();
    if (leftover) {
      waitlist.push(leftover);
    }
  }

  for (let index = 0; index < strongerSide.length; index += 1) {
    const playerA = strongerSide[index];
    const playerB = weakerSide[index];

    if (!playerA || !playerB) {
      continue;
    }

    pairs.push({
      playerAId: playerA.id,
      playerBId: playerB.id,
      playerAName: playerA.name,
      playerBName: playerB.name,
      playerAPoints: playerA.points,
      playerBPoints: playerB.points,
      totalPoints: playerA.points + playerB.points
    });
  }

  return {
    pairs: pairs.sort((a, b) => b.totalPoints - a.totalPoints),
    waitlist
  };
}

export function distributePairsIntoGroups(
  pairs: Pick<Pair, "id" | "name" | "totalPoints">[],
  groupCount: number
): GroupDraft[] {
  const groups = Array.from({ length: groupCount }, (_, index) => ({
    name: `Grupo ${String.fromCharCode(65 + index)}`,
    pairs: [] as GroupDraft["pairs"]
  }));

  const orderedPairs = [...pairs].sort((a, b) => b.totalPoints - a.totalPoints);
  let direction = 1;
  let cursor = 0;

  for (const pair of orderedPairs) {
    groups[cursor].pairs.push({
      pairId: pair.id,
      pairName: pair.name,
      totalPoints: pair.totalPoints
    });

    const nextCursor = cursor + direction;

    if (nextCursor >= groupCount || nextCursor < 0) {
      direction *= -1;
      cursor += direction;
    } else {
      cursor = nextCursor;
    }
  }

  return groups;
}

export function buildRoundRobin(groupId: string, pairIds: string[]) {
  const matches: Array<{
    groupId: string;
    homePairId: string;
    awayPairId: string;
    label: string;
  }> = [];

  for (let i = 0; i < pairIds.length; i += 1) {
    for (let j = i + 1; j < pairIds.length; j += 1) {
      matches.push({
        groupId,
        homePairId: pairIds[i],
        awayPairId: pairIds[j],
        label: `Grupo - Jogo ${matches.length + 1}`
      });
    }
  }

  return matches;
}

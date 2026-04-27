export type PairDraft = {
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  playerAPoints: number;
  playerBPoints: number;
  totalPoints: number;
};

export type GroupDraft = {
  name: string;
  pairs: {
    pairId: string;
    pairName: string;
    totalPoints: number;
  }[];
};

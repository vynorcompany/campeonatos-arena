export type CompetitionFormat =
  | "LEAGUE"
  | "THREE_GROUPS"
  | "FOUR_GROUPS"
  | "SIMPLE";

export type StandingRow = {
  pairId: string;
  victories: number;
  differential: number;
};

export type StandingMatch = {
  homePairId: string;
  awayPairId: string;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerPairId?: string | null;
};

export type DrawGroup = {
  name: string;
  pairIds: string[];
};

export type GroupStandings = {
  rows: StandingRow[];
  matches: StandingMatch[];
};

export type RoundRobinMatch = Pick<StandingMatch, "homePairId" | "awayPairId">;

export type KnockoutStage = "QUARTERFINAL" | "SEMIFINAL" | "FINAL";

export type KnockoutMatch = {
  stage: KnockoutStage;
  roundOrder: number;
  homePairId: string | null;
  awayPairId: string | null;
};

export type TournamentStatus =
  | "DRAFT"
  | "READY_FOR_DRAW"
  | "GROUPS_DEFINED"
  | "MATCHES_DEFINED"
  | "IN_PROGRESS"
  | "FINISHED";

export type MatchStage = "GROUP" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL";

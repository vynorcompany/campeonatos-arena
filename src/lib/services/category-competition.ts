/** Public entry point. Business rules live in the domain modules below. */
export {
  createCategoryCompetition,
  updateCategoryPublicVisibility,
  reopenCategoryLeagueForEditing,
  finishCategoryCompetition
} from "@/lib/services/category-competition/lifecycle";
export {
  addManualPair,
  removeCategoryPair,
  moveCategoryPair,
  replaceCategoryPairPlayer
} from "@/lib/services/category-competition/pairs";
export {
  generateCategoryDraw,
  publishCategoryDraw
} from "@/lib/services/category-competition/draw";
export {
  updateCategoryMatchSchedule,
  updateCategoryMatchStatus,
  recordCategoryMatchResult,
  recordCategoryLeagueMatchResult,
  resetCategoryLeagueMatchResult
} from "@/lib/services/category-competition/matches";
export {
  assertMatchCanBeCorrected,
  buildReopenedMatch,
} from "@/lib/tournament-category/match-status";

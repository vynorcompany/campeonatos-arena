type CategoryEligibility = {
  arenaId: string;
  className: string;
  gender: string;
  format?: string;
  leagueTier?: string;
};

type EligiblePlayer = {
  id: string;
  arenaId: string;
  active: boolean;
  className: string;
  gender: string;
  leagueTier?: string;
};

function normalizeEligibilityValue(value: string) {
  return value.trim().toLocaleUpperCase("pt-BR");
}

export function matchesCategoryEligibility(
  category: Pick<CategoryEligibility, "className" | "gender">,
  player: Pick<EligiblePlayer, "className" | "gender">,
) {
  // Profile class is descriptive; event registrations are not restricted by it.
  const categoryGender = normalizeEligibilityValue(category.gender);
  const playerGender = normalizeEligibilityValue(player.gender);
  return !categoryGender || !playerGender || playerGender === categoryGender;
}

export function matchesCompetitionAthleteEligibility(
  category: Pick<CategoryEligibility, "className" | "gender" | "format" | "leagueTier">,
  player: Pick<EligiblePlayer, "className" | "gender" | "leagueTier">,
) {
  const categoryTier = category.leagueTier?.trim().toUpperCase();
  const playerTier = player.leagueTier?.trim().toUpperCase();
  if (category.format === "LEAGUE" && categoryTier && playerTier && playerTier !== categoryTier) return false;
  return matchesCategoryEligibility(category, player);
}

export function getAvailableCategoryAthletes<Athlete extends { id: string }>(
  athletes: Athlete[],
  pairedPlayerIds: string[],
) {
  const pairedPlayerIdSet = new Set(pairedPlayerIds);
  return athletes.filter((athlete) => !pairedPlayerIdSet.has(athlete.id));
}

function pairKey(playerIds: string[]) {
  return [...playerIds].sort().join(":");
}

export function validateManualPairEligibility(
  category: CategoryEligibility,
  players: EligiblePlayer[],
  existingPairPlayerIds: string[][],
) {
  if (players.length !== (category.format === "TRIO" ? 3 : 2) || new Set(players.map(player => player.id)).size !== players.length) {
    throw new Error(category.format === "TRIO" ? "Selecione três atletas diferentes." : "Selecione dois atletas diferentes.");
  }

  if (players.some((player) => player.arenaId !== category.arenaId)) {
    throw new Error("Os atletas devem pertencer à mesma arena da categoria.");
  }

  if (players.some((player) => !player.active)) {
    throw new Error("Atleta inativo não pode ser inscrito.");
  }

  const categoryGender = normalizeEligibilityValue(category.gender);
  if (
    categoryGender &&
    players.some((player) => {
      const playerGender = normalizeEligibilityValue(player.gender);
      return playerGender && playerGender !== categoryGender;
    })
  ) {
    throw new Error("O gênero do atleta não é elegível para esta categoria.");
  }

  const requestedPairKey = pairKey(players.map((player) => player.id));
  if (
    existingPairPlayerIds.some(
      (existingPlayerIds) => pairKey(existingPlayerIds) === requestedPairKey,
    )
  ) {
    throw new Error("Esta dupla já está inscrita na categoria.");
  }

  const pairedPlayerIds = new Set(existingPairPlayerIds.flat());
  if (players.some((player) => pairedPlayerIds.has(player.id))) {
    throw new Error("Um dos atletas já está vinculado a uma dupla na categoria.");
  }
}

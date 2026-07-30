type CategoryEligibility = {
  arenaId: string;
  className: string;
  gender: string;
};

type EligiblePlayer = {
  id: string;
  arenaId: string;
  active: boolean;
  className: string;
  gender: string;
};

function normalizeEligibilityValue(value: string) {
  return value.trim().toLocaleUpperCase("pt-BR");
}

export function matchesCategoryEligibility(
  category: Pick<CategoryEligibility, "className" | "gender">,
  player: Pick<EligiblePlayer, "className" | "gender">,
) {
  const categoryClass = normalizeEligibilityValue(category.className);
  const playerClass = normalizeEligibilityValue(player.className);
  if (categoryClass && playerClass !== categoryClass) {
    return false;
  }

  const categoryGender = normalizeEligibilityValue(category.gender);
  const playerGender = normalizeEligibilityValue(player.gender);
  return !categoryGender || playerGender === categoryGender;
}

function pairKey(playerIds: string[]) {
  return [...playerIds].sort().join(":");
}

export function validateManualPairEligibility(
  category: CategoryEligibility,
  players: EligiblePlayer[],
  existingPairPlayerIds: string[][],
) {
  if (players.length !== 2 || players[0].id === players[1].id) {
    throw new Error("Selecione dois atletas diferentes.");
  }

  if (players.some((player) => player.arenaId !== category.arenaId)) {
    throw new Error("Os atletas devem pertencer à mesma arena da categoria.");
  }

  if (players.some((player) => !player.active)) {
    throw new Error("Atleta inativo não pode ser inscrito.");
  }

  const categoryClass = normalizeEligibilityValue(category.className);
  if (
    categoryClass &&
    players.some(
      (player) => normalizeEligibilityValue(player.className) !== categoryClass,
    )
  ) {
    throw new Error("A classe do atleta não é elegível para esta categoria.");
  }

  const categoryGender = normalizeEligibilityValue(category.gender);
  if (
    categoryGender &&
    players.some((player) => !matchesCategoryEligibility(category, player))
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
}

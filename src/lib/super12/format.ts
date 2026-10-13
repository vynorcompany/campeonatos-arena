export type Super12KnockoutQualification = "TOP_TWO" | "TOP_TWO_PLUS_BEST_THIRDS";

export function super12GroupSetupError(pairCount: number, groupCount: number, qualification: Super12KnockoutQualification) {
  const expectedGroups = qualification === "TOP_TWO" ? 4 : 3;
  if (groupCount !== expectedGroups) return "O mata-mata sempre classifica oito duplas: use 4 grupos com os dois primeiros, ou 3 grupos com os dois melhores terceiros.";
  const minimumPairs = qualification === "TOP_TWO" ? 8 : 9;
  if (pairCount < minimumPairs) return qualification === "TOP_TWO"
    ? "Monte ao menos 8 duplas para que os 4 grupos classifiquem dois primeiros cada."
    : "Monte ao menos 9 duplas para que os 3 grupos tenham uma terceira colocada e classifiquem 8 duplas.";
  return null;
}

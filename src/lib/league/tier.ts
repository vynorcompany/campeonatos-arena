export type LeagueTier = "A" | "B" | "";

/** Category titles override a stale legacy setting when they explicitly say Liga A or B. */
export function resolveLeagueTier(categoryName: string, configuredTier: string): LeagueTier {
  if (/\bLIGA\b.*\bB\b/i.test(categoryName)) return "B";
  if (/\bLIGA\b.*\bA\b/i.test(categoryName)) return "A";
  const tier = configuredTier.trim().toUpperCase();
  return tier === "A" || tier === "B" ? tier : "";
}

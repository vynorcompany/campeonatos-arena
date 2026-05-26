export const TOURNAMENT_CATEGORY_PRESETS = [
  "2ª feminina",
  "2ª masculina",
  "3ª feminina",
  "3ª masculina",
  "4ª feminina",
  "4ª masculina",
  "5ª feminina",
  "5ª masculina",
  "6ª feminina",
  "6ª masculina",
  "7ª feminina",
  "7ª masculina",
  "Mista A",
  "Mista B",
  "Mista C",
  "Mista D"
] as const;

export function parseCategoryListInput(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export type TournamentCategoryConfig = {
  name: string;
  groupCount: number;
  pairsPerGroup: number;
};

export function parseCategoryConfigInput(raw: string): TournamentCategoryConfig[] {
  const value = raw.trim();
  if (!value) return [];

  if (value.startsWith("[") || value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as Array<{ name: string; groupCount?: number; pairsPerGroup?: number }>;
      return parsed
        .map((item) => ({
          name: String(item.name ?? "").trim(),
          groupCount: Number(item.groupCount ?? 4),
          pairsPerGroup: Number(item.pairsPerGroup ?? 3)
        }))
        .filter((item) => item.name);
    } catch {
      return [];
    }
  }

  return parseCategoryListInput(value).map((name) => ({ name, groupCount: 4, pairsPerGroup: 3 }));
}

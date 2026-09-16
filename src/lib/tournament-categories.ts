export const TOURNAMENT_CATEGORY_PRESETS = [
  ...Array.from({ length: 8 }, (_, index) => `${8 - index}ª Masculina`),
  ...Array.from({ length: 8 }, (_, index) => `${8 - index}ª Feminina`),
  "Open Masculina", "Open Feminina", "Mista A", "Mista B", "Mista C", "Kids"
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

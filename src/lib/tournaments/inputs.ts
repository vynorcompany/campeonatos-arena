export type TournamentCategoryInput = {
  name: string;
  level: number;
  groupCount: number;
  pairsPerGroup: number;
  priceFirstCents: number;
  priceSecondCents: number;
  priceThirdCents: number;
  standardKey: string;
  allowedRegistrationStandardKeys: string[];
  maxRegistrations: number;
  active: boolean;
};

export function parseCategoryList(
  raw: string,
  fallbackPriceFirstCents: number,
  fallbackPriceSecondCents: number,
  fallbackPriceThirdCents: number
): TournamentCategoryInput[] {
  const maybeJson = raw.trim();
  if (maybeJson.startsWith("[") || maybeJson.startsWith("{")) {
    const parsed = JSON.parse(maybeJson) as Array<{
      name: string;
      groupCount?: number;
      pairsPerGroup?: number;
      priceFirstCents?: number | string;
      priceSecondCents?: number | string;
      priceThirdCents?: number | string;
      standardKey?: string;
      allowedRegistrationStandardKeys?: string[];
      // Compatibility with category lists saved before standard categories
      // became the basis for the registration rule.
      allowedRegistrationCategoryNames?: string[];
      maxRegistrations?: number | string;
      active?: boolean;
    }>;
    const normalized = parsed
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        groupCount: Number(item.groupCount ?? 4),
        pairsPerGroup: Number(item.pairsPerGroup ?? 3),
        priceFirstCents:
          item.priceFirstCents === undefined
            ? fallbackPriceFirstCents
            : parseReaisToCents(item.priceFirstCents),
        priceSecondCents:
          item.priceSecondCents === undefined
            ? fallbackPriceSecondCents
            : parseReaisToCents(item.priceSecondCents),
        priceThirdCents:
          item.priceThirdCents === undefined
            ? fallbackPriceThirdCents
            : parseReaisToCents(item.priceThirdCents),
        standardKey: String(item.standardKey ?? "").trim(),
        allowedRegistrationStandardKeys: Array.isArray(item.allowedRegistrationStandardKeys)
          ? item.allowedRegistrationStandardKeys.map(String).map((key) => key.trim()).filter(Boolean)
          : [],
        maxRegistrations: Number(item.maxRegistrations ?? 0),
        active: item.active !== false
      }))
      .filter((item) => item.name.length > 0);

    if (!normalized.length) {
      throw new Error("Informe ao menos uma categoria.");
    }

    return normalized.map((item, index) => ({
      name: item.name,
      level: index + 1,
      groupCount: Number.isFinite(item.groupCount) ? Math.min(8, Math.max(1, Math.trunc(item.groupCount))) : 4,
      pairsPerGroup: Number.isFinite(item.pairsPerGroup) ? Math.min(16, Math.max(2, Math.trunc(item.pairsPerGroup))) : 3,
      priceFirstCents: Number.isFinite(item.priceFirstCents) ? Math.max(0, Math.trunc(item.priceFirstCents)) : fallbackPriceFirstCents,
      priceSecondCents: Number.isFinite(item.priceSecondCents) ? Math.max(0, Math.trunc(item.priceSecondCents)) : fallbackPriceSecondCents,
      priceThirdCents: Number.isFinite(item.priceThirdCents) ? Math.max(0, Math.trunc(item.priceThirdCents)) : fallbackPriceThirdCents,
      standardKey: item.standardKey,
      allowedRegistrationStandardKeys: item.allowedRegistrationStandardKeys,
      maxRegistrations: Number.isFinite(item.maxRegistrations) ? Math.max(0, Math.trunc(item.maxRegistrations)) : 0,
      active: item.active
    }));
  }

  const names = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!names.length) {
    throw new Error("Informe ao menos uma categoria.");
  }

  return names.map((name, index) => ({
    name,
    level: index + 1,
    groupCount: 4,
    pairsPerGroup: 3,
    priceFirstCents: fallbackPriceFirstCents,
    priceSecondCents: fallbackPriceSecondCents,
    priceThirdCents: fallbackPriceThirdCents, standardKey: "", allowedRegistrationStandardKeys: [], maxRegistrations: 0, active: true
  }));
}

export function parseReaisToCents(input: unknown) {
  const normalized = String(input ?? "")
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Valor monetário inválido.");
  }
  return Math.round(value * 100);
}

export function normalizeCpf(input: string) {
  return input.replace(/\D/g, "");
}

export function normalizeDateInput(input: unknown) {
  const value = String(input ?? "").trim();
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }
  return value;
}

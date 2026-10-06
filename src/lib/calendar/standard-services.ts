export const STANDARD_SERVICES = [
  { code: "LEAGUE", name: "Liga" },
  { code: "SUPER12", name: "Super 12" }
] as const;

export type StandardServiceCode = typeof STANDARD_SERVICES[number]["code"];
export type StandardServicePrices = Partial<Record<StandardServiceCode, number>>;

export function standardServiceCode(bookingTypeName: string): StandardServiceCode | undefined {
  return STANDARD_SERVICES.find((service) => service.name.toLowerCase() === bookingTypeName.trim().toLowerCase())?.code;
}

export function standardServicePrices(rows: Array<{ serviceCode: string; priceCents: number }>): StandardServicePrices {
  return Object.fromEntries(rows.filter((row) => STANDARD_SERVICES.some((service) => service.code === row.serviceCode)).map((row) => [row.serviceCode, row.priceCents]));
}

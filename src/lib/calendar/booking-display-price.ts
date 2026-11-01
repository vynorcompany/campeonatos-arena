import { calculateCourtIntervalPrice } from "./court-interval-pricing";
import { standardServiceCode, type StandardServicePrices } from "./standard-services";

type BookingPrice = {
  bookingTypeName?: string; priceCents?: number; pricingIntervalMinutes?: number;
  startsAt: string; endsAt: string; dateValue: string;
  participants?: { amountCents: number }[];
  services?: { priceCents: number }[];
  pricingRules?: { weekday: number; startsAtMinute: number; endsAtMinute: number; priceCents: number; available: boolean }[];
};
export function initialBookingAmount(slot: BookingPrice, prices: StandardServicePrices = {}) {
  const code = standardServiceCode(slot.bookingTypeName ?? "", prices);
  if (code) return slot.participants?.[0]?.amountCents ?? prices[code] ?? 0;
  if (slot.priceCents !== undefined) return slot.priceCents;
  const charged = (slot.participants ?? []).reduce((sum, p) => sum + p.amountCents, 0);
  if (charged > 0) return charged;
  const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const tariff = calculateCourtIntervalPrice({ startsAtMinute: minute(slot.startsAt), durationMinutes: minute(slot.endsAt) - minute(slot.startsAt), intervalMinutes: slot.pricingIntervalMinutes ?? 30, weekday: new Date(`${slot.dateValue}T12:00:00`).getDay(), rules: slot.pricingRules ?? [] });
  return tariff === null ? charged : tariff + (slot.services ?? []).reduce((sum, s) => sum + s.priceCents, 0);
}

import { peakServiceOccupancy, type PortalBookingService } from "./service-capacity";
import { servicePermitsDuration } from "./service-booking-rules";
import { resolvePublicBookingSelection } from "./public-booking-selection";

export type PublicBookingSlot = { startsAt: string; label: string; priceCents: number; durationPrices: Record<number, number>; durations: number[]; standardDurations: number[]; availableMinutes: number[]; blockedMinutes: number[] };
export type PublicBookingCourt = { id: string; name: string; color: string; slotMinutes: number; slots: PublicBookingSlot[] };

/** A displayed start must accommodate the entire duration, including every selected service. */
export function eligibleBookingDurations(court: PublicBookingCourt, slot: PublicBookingSlot, services: readonly PortalBookingService[]) {
  const [hours, minutes] = slot.label.split(":").map(Number);
  const start = hours * 60 + minutes;
  const weekday = new Date(`${slot.startsAt.slice(0,10)}T12:00:00`).getDay();
  return slot.durations.filter(duration =>
    servicePermitsDuration(slot.standardDurations, duration, services, court.id, weekday, start, court.slotMinutes)
    && !resolvePublicBookingSelection({ startsAtMinute:start, durationMinutes:duration, slotMinutes:court.slotMinutes, availableMinutes:slot.availableMinutes, blockedMinutes:slot.blockedMinutes }).hasConflict
    && services.every(service => peakServiceOccupancy(service.busy, start, start + duration) < service.limit)
  );
}

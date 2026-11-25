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

/** Explain a rejected choice using the same interval and capacity rules as availability. */
export function serviceBookingIssue({ service, court, slot, durationMinutes, selectedServices, courts }: {
  service: PortalBookingService;
  court: PublicBookingCourt | undefined;
  slot: PublicBookingSlot | undefined;
  durationMinutes: number;
  selectedServices: readonly PortalBookingService[];
  courts: readonly Pick<PublicBookingCourt, "id" | "name">[];
}): string | null {
  if (!court || !slot) return "Escolha uma quadra e um horário compatíveis para adicionar este serviço.";
  const rules = service.rules;
  if (rules.courtIds.length && !rules.courtIds.includes(court.id)) {
    const names = rules.courtIds.map(id => courts.find(candidate => candidate.id === id)?.name).filter(Boolean);
    return names.length ? `Este serviço está disponível somente em: ${names.join(", ")}.` : "Este serviço não está disponível na quadra selecionada.";
  }
  const weekday = new Date(`${slot.startsAt.slice(0, 10)}T12:00:00`).getDay();
  const window = rules.dailyWindows === undefined ? rules : rules.dailyWindows.find(candidate => candidate.weekday === weekday);
  if (!window || (rules.dailyWindows === undefined && rules.weekdays.length && !rules.weekdays.includes(weekday))) {
    return "Este serviço não está disponível no dia selecionado. Confira os dias e horários permitidos.";
  }
  const [hour, minute] = slot.label.split(":").map(Number);
  const start = hour * 60 + minute;
  const clock = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  if (start < window.startMinute || start + durationMinutes > window.endMinute) {
    return `A reserva inteira deve ficar entre ${clock(window.startMinute)} e ${clock(window.endMinute)} para usar este serviço.`;
  }
  if (rules.minimumMinutes !== null && durationMinutes < rules.minimumMinutes) {
    return `Este serviço exige uma reserva de pelo menos ${rules.minimumMinutes} minutos.`;
  }
  if (peakServiceOccupancy(service.busy, start, start + durationMinutes) >= service.limit) {
    return "Não há unidades disponíveis deste serviço para o horário selecionado.";
  }
  if (!eligibleBookingDurations(court, slot, selectedServices).includes(durationMinutes)) {
    return "Este serviço não é compatível com a duração, a disponibilidade da quadra ou os demais serviços selecionados.";
  }
  return null;
}

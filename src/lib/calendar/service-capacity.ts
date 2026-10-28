export type CapacityWindow = { start: number; end: number };

/** Peak occupancy within a half-open interval; adjacent reservations can share a unit. */
export function peakServiceOccupancy(windows: readonly CapacityWindow[], start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("Período de reserva inválido.");
  const events = windows.flatMap(window => {
    const from = Math.max(start, window.start), to = Math.min(end, window.end);
    return from < to ? [{ at: from, delta: 1 }, { at: to, delta: -1 }] : [];
  }).sort((a, b) => a.at - b.at || a.delta - b.delta);
  let active = 0, peak = 0;
  for (const event of events) { active += event.delta; peak = Math.max(peak, active); }
  return peak;
}

export type PortalBookingService = { serviceHourly?: boolean; id: string; name: string; priceCents: number; limit: number; busy: CapacityWindow[] };

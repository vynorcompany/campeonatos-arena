type WeeklyRule = {
  weekday: number;
  startsAtMinute: number;
  endsAtMinute: number;
  available: boolean;
};

type Court = {
  id: string;
  name: string;
  weeklyRules: WeeklyRule[];
};

type Occurrence = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  sourceType: string;
  bookingTypeName: string;
  occurrenceCourts: Array<{ courtId: string }>;
};

export type ReservationCourtInsight = {
  courtId: string;
  courtName: string;
  reservations: number;
  occupiedMinutes: number;
  availableMinutes: number;
  occupancyPercent: number;
};

const cancelledStatuses = new Set(["CANCELED", "CANCELLED"]);

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function overlapMinutes(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  const clippedStart = new Date(Math.max(start.getTime(), rangeStart.getTime()));
  const clippedEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
  return minutesBetween(clippedStart, clippedEnd);
}

function availableMinutes(rules: WeeklyRule[], rangeStart: Date, rangeEnd: Date) {
  let total = 0;
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(rangeEnd);
  lastDay.setHours(0, 0, 0, 0);
  while (cursor <= lastDay) {
    for (const rule of rules) {
      if (rule.available && rule.weekday === cursor.getDay()) total += Math.max(0, rule.endsAtMinute - rule.startsAtMinute);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

export function reservationServiceLabel(occurrence: Pick<Occurrence, "sourceType" | "bookingTypeName">) {
  if (occurrence.sourceType === "ONLINE_BOOKING") return "Reserva online";
  if (occurrence.sourceType === "SUPER12") return "Super 12";
  if (["LEAGUE_CHALLENGE", "LEAGUE_PROPOSAL"].includes(occurrence.sourceType)) return "Liga";
  if (["LESSON", "LESSON_MAKEUP"].includes(occurrence.sourceType)) return "Aulas";
  return occurrence.bookingTypeName?.trim() || "Reserva";
}

export function reservationInsights(courts: Court[], occurrences: Occurrence[], rangeStart: Date, rangeEnd: Date) {
  const active = occurrences.filter((occurrence) => !cancelledStatuses.has(occurrence.status));
  const courtInsights = courts.map((court) => {
    const reservations = active.filter((occurrence) => occurrence.occurrenceCourts.some((relation) => relation.courtId === court.id));
    const occupiedMinutes = reservations.reduce((total, occurrence) => total + overlapMinutes(occurrence.startsAt, occurrence.endsAt, rangeStart, rangeEnd), 0);
    const availability = availableMinutes(court.weeklyRules, rangeStart, rangeEnd);
    return {
      courtId: court.id,
      courtName: court.name,
      reservations: reservations.length,
      occupiedMinutes,
      availableMinutes: availability,
      occupancyPercent: availability ? Math.min(100, Math.round((occupiedMinutes / availability) * 100)) : 0
    };
  }).sort((a, b) => b.reservations - a.reservations || b.occupiedMinutes - a.occupiedMinutes || a.courtName.localeCompare(b.courtName, "pt-BR"));

  const serviceCounts = Object.values(active.reduce<Record<string, { label: string; reservations: number }>>((all, occurrence) => {
    const label = reservationServiceLabel(occurrence);
    all[label] ??= { label, reservations: 0 };
    all[label].reservations += 1;
    return all;
  }, {})).sort((a, b) => b.reservations - a.reservations || a.label.localeCompare(b.label, "pt-BR"));

  const occupiedMinutes = courtInsights.reduce((total, court) => total + court.occupiedMinutes, 0);
  const availableMinutesTotal = courtInsights.reduce((total, court) => total + court.availableMinutes, 0);
  return {
    activeReservations: active.length,
    cancelledReservations: occurrences.length - active.length,
    courtInsights,
    highestVolumeCourt: courtInsights[0] ?? null,
    lowestVolumeCourt: [...courtInsights].sort((a, b) => a.reservations - b.reservations || a.occupiedMinutes - b.occupiedMinutes || a.courtName.localeCompare(b.courtName, "pt-BR"))[0] ?? null,
    services: serviceCounts,
    mostUsedService: serviceCounts[0] ?? null,
    occupiedMinutes,
    availableMinutes: availableMinutesTotal,
    occupancyPercent: availableMinutesTotal ? Math.min(100, Math.round((occupiedMinutes / availableMinutesTotal) * 100)) : 0
  };
}

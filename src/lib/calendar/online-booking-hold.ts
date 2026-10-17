export const ONLINE_BOOKING_PAYMENT_HOLD_MINUTES = 15;

// The Pix request is retried with the same idempotency key. Keep its expiration
// stable and at least 30 minutes ahead even near the end of the booking hold.
export function onlineBookingPixExpiration(createdAt: Date) {
  return new Date(createdAt.getTime() + 60 * 60_000);
}

export function onlineBookingHoldCutoff(now = new Date()) {
  return new Date(now.getTime() - ONLINE_BOOKING_PAYMENT_HOLD_MINUTES * 60_000);
}

export function pendingPlayerOnlineBookingWhere(arenaId: string, playerId: string, today: Date, now = new Date()) {
  return {
    arenaId,
    sourceType: "ONLINE_BOOKING",
    OR: [
      { status: "PENDING_CONFIRMATION" },
      { status: "PENDING_PAYMENT", createdAt: { gt: onlineBookingHoldCutoff(now) } },
    ],
    participants: { some: { playerId } },
    endsAt: { gte: today },
  };
}

export function activeCourtOccurrenceWhere(now = new Date()) {
  return {
    OR: [
      { status: { notIn: ["CANCELED", "CANCELLED", "PENDING_PAYMENT"] } },
      { status: "PENDING_PAYMENT", createdAt: { gt: onlineBookingHoldCutoff(now) } },
    ],
  };
}

export function isActiveCourtOccurrence(occurrence: { status: string; createdAt: Date }, now = new Date()) {
  if (["CANCELED", "CANCELLED"].includes(occurrence.status)) return false;
  return occurrence.status !== "PENDING_PAYMENT" || occurrence.createdAt > onlineBookingHoldCutoff(now);
}

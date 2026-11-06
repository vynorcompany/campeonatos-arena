"use server";

import { PublicBookingView } from "@/components/public-booking-view";

/** Reuse the authenticated, arena-scoped availability calculation without navigating. */
export async function loadPublicBookingDate(arenaSlug: string, matchId: string | undefined, embedded: boolean, date: string) {
  if (typeof arenaSlug !== "string" || arenaSlug.length > 160 || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (matchId !== undefined && (typeof matchId !== "string" || matchId.length > 160)) || typeof embedded !== "boolean") {
    throw new Error("Data de reserva inválida.");
  }
  return PublicBookingView({ arenaSlug, date, matchId, embedded });
}

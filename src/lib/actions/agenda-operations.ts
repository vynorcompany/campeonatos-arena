"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { manuallyCheckInParticipant, removeOptionalBookingService, blockCourtSlots, moveBookingCourt } from "@/lib/calendar/staff-operations";
import { refreshCalendarRoutes } from "@/lib/calendar/revalidation";
import { refreshFinanceRoutes } from "@/lib/finance/revalidation";

export async function manualBookingCheckinAction(form: FormData) {
  const auth = await requirePermission("calendar:booking:edit");
  const input = z.object({ occurrenceId: z.string().min(1), playerId: z.string().min(1) }).parse(Object.fromEntries(form));
  const date = await withArenaTransaction(auth.arenaId, tx => manuallyCheckInParticipant(tx, { ...input, arenaId: auth.arenaId, actorId: auth.userId, actorName: auth.userName }));
  refreshCalendarRoutes(); return { checkedInAt: date.toISOString() };
}
export async function removeBookingServiceAction(form: FormData) {
  const auth = await requirePermission("calendar:booking:edit");
  const input = z.object({ occurrenceId: z.string().min(1), serviceId: z.string().min(1) }).parse(Object.fromEntries(form));
  await withArenaTransaction(auth.arenaId, tx => removeOptionalBookingService(tx, auth.arenaId, input.occurrenceId, input.serviceId));
  refreshCalendarRoutes(); refreshFinanceRoutes();
}
export async function blockAgendaSlotsAction(form: FormData) {
  const auth = await requirePermission("calendar:booking:create");
  const slots = z.array(z.object({ courtId: z.string().min(1), startsAt: z.string().datetime({ local: true }), endsAt: z.string().datetime({ local: true }) })).min(1).max(200).parse(JSON.parse(String(form.get("slots") ?? "[]")));
  await withArenaTransaction(auth.arenaId, tx => blockCourtSlots(tx, auth.arenaId, slots.map(s => ({ courtId: s.courtId, startsAt: new Date(s.startsAt), endsAt: new Date(s.endsAt) }))), { timeout: 20_000 });
  refreshCalendarRoutes();
}
export async function moveBookingCourtAction(form: FormData) {
  const auth = await requirePermission("calendar:booking:edit");
  const input = z.object({ occurrenceId: z.string().min(1), courtId: z.string().min(1) }).parse(Object.fromEntries(form));
  await withArenaTransaction(auth.arenaId, tx => moveBookingCourt(tx, auth.arenaId, input.occurrenceId, input.courtId));
  refreshCalendarRoutes();
}

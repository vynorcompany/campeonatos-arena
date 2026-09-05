import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireModuleView } from "@/lib/auth/guards";
import { buildCourtBookingAvailability } from "@/lib/calendar/booking-availability";
import { withArenaTransaction } from "@/lib/rls";

const querySchema = z.object({
  courtId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  occurrenceId: z.string().trim().optional(),
});

function minuteOfDay(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    courtId: request.nextUrl.searchParams.get("courtId"),
    date: request.nextUrl.searchParams.get("date"),
    occurrenceId: request.nextUrl.searchParams.get("occurrenceId") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });

  const auth = await requireModuleView("calendar");
  const dayStart = new Date(`${parsed.data.date}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const result = await withArenaTransaction(auth.arenaId, async (tx) => {
    const court = await tx.court.findFirst({
      where: { id: parsed.data.courtId, arenaId: auth.arenaId, active: true },
      select: { id: true, onlineSlotMinutes: true, weeklyRules: true },
    });
    if (!court) return null;

    const occurrences = await tx.scheduleOccurrence.findMany({
      where: {
        arenaId: auth.arenaId,
        id: parsed.data.occurrenceId ? { not: parsed.data.occurrenceId } : undefined,
        status: { not: "CANCELED" },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        occurrenceCourts: { some: { courtId: court.id } },
      },
      select: { startsAt: true, endsAt: true },
    });

    return {
      slotMinutes: court.onlineSlotMinutes,
      availableMinutes: buildCourtBookingAvailability({
        weekday: dayStart.getDay(),
        slotMinutes: court.onlineSlotMinutes,
        rules: court.weeklyRules,
        occupiedIntervals: occurrences.map((occurrence) => ({
          startsAtMinute: minuteOfDay(occurrence.startsAt),
          endsAtMinute: minuteOfDay(occurrence.endsAt),
        })),
      }),
    };
  });

  if (!result) return NextResponse.json({ error: "Quadra não encontrada." }, { status: 404 });
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

export const dynamic = "force-dynamic";

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET(_: Request, { params }: { params: { arenaSlug: string; occurrenceId: string } }) {
  try {
    const auth = await requirePublicPlayerAuth(params.arenaSlug);
    const arena = await prisma.arena.findUnique({ where: { slug: params.arenaSlug }, select: { id: true, name: true } });
    if (!arena) return NextResponse.json({ error: "Arena não encontrada." }, { status: 404 });
    const booking = await withArenaTransaction(arena.id, (tx) => tx.scheduleOccurrence.findFirst({
      where: { id: params.occurrenceId, arenaId: arena.id, sourceType: "ONLINE_BOOKING", status: "SCHEDULED", participants: { some: { playerId: auth.playerId } } },
      select: { id: true, title: true, startsAt: true, endsAt: true, occurrenceCourts: { select: { court: { select: { name: true } } } } }
    }));
    if (!booking) return NextResponse.json({ error: "A reserva ainda não está confirmada ou não pertence a esta conta." }, { status: 404 });
    const courtName = booking.occurrenceCourts.map((item) => item.court.name).join(", ") || "Quadra";
    const content = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Arena Padel Manager//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      `UID:arena-booking-${booking.id}@arena-padel-manager`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(booking.startsAt)}`, `DTEND:${icsDate(booking.endsAt)}`,
      `SUMMARY:${escapeIcs(`Reserva · ${arena.name}`)}`, `LOCATION:${escapeIcs(courtName)}`, `DESCRIPTION:${escapeIcs(`Reserva confirmada em ${courtName}.`)}`, "END:VEVENT", "END:VCALENDAR", ""
    ].join("\r\n");
    return new NextResponse(content, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename=reservacao-${booking.id}.ics`, "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Entre na sua conta de cliente para adicionar a reserva ao calendário." }, { status: 401 });
  }
}

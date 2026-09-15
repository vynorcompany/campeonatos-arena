import { PublicBookingPaymentChoice } from "@/components/public-booking-payment-choice";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

export const dynamic = "force-dynamic";

export default async function PublicBookingPaymentPage({ params }: { params: { arenaSlug: string; occurrenceId: string } }) {
  const arena = await prisma.arena.findUnique({ where: { slug: params.arenaSlug }, select: { id: true } });
  const booking = arena ? await withArenaTransaction(arena.id, (tx) => tx.scheduleOccurrence.findFirst({
    where: { id: params.occurrenceId, sourceType: "ONLINE_BOOKING", status: "PENDING_PAYMENT", arena: { slug: params.arenaSlug } },
    select: { startsAt: true, endsAt: true, occurrenceCourts: { select: { court: { select: { name: true } } } }, participants: { select: { amountCents: true }, take: 1 } }
  })) : null;
  const participant = booking?.participants[0];
  const dateTime = booking ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", hour: "2-digit", minute: "2-digit" }).format(booking.startsAt) : "Reserva selecionada";
  const duration = booking ? Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000) : 0;
  return <PublicBookingPaymentChoice arenaSlug={params.arenaSlug} occurrenceId={params.occurrenceId} summary={{ court: booking?.occurrenceCourts[0]?.court.name ?? "Quadra", dateTime, duration, amountCents: participant?.amountCents ?? 0 }} />;
}

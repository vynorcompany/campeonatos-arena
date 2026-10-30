import { PublicBookingPaymentChoice } from "@/components/public-booking-payment-choice";
import { viewStyles } from "@/components/public-booking-payment-choice.utilities";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ONLINE_BOOKING_PAYMENT_HOLD_MINUTES, onlineBookingHoldCutoff } from "@/lib/calendar/online-booking-hold";
import { withArenaTransaction } from "@/lib/rls";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";

export const dynamic = "force-dynamic";

export default async function PublicBookingPaymentPage(props: { params: Promise<{ arenaSlug: string; occurrenceId: string }> }) {
  const params = await props.params;
  const [arena, auth] = await Promise.all([
    prisma.arena.findUnique({ where: { slug: params.arenaSlug }, select: { id: true } }),
    getPublicPlayerAuth(params.arenaSlug),
  ]);
  const booking = arena && auth?.arenaId === arena.id ? await withArenaTransaction(arena.id, (tx) => tx.scheduleOccurrence.findFirst({
    where: { id: params.occurrenceId, arenaId: arena.id, sourceType: "ONLINE_BOOKING", status: "PENDING_PAYMENT", createdAt: { gt: onlineBookingHoldCutoff() }, participants: { some: { playerId: auth.playerId } } },
    select: { createdAt: true, startsAt: true, endsAt: true, serviceReservations: { select: { serviceName: true, priceCents: true } }, occurrenceCourts: { select: { court: { select: { name: true } } } }, participants: { where: { playerId: auth.playerId }, select: { amountCents: true }, take: 1 } }
  })) : null;
  if (!booking) return <main className={viewStyles.public_booking_payment_page}><section className={viewStyles.public_booking_payment_choice}><header><span>RESERVA ONLINE</span><h1>Reserva indisponível</h1><p>Entre na sua conta para consultar esta reserva. Se o prazo de 15 minutos terminou, escolha novamente um horário disponível. Caso já tenha pago, a arena verificará a confirmação ou o reembolso.</p></header><Link className={viewStyles.public_booking_payment_return} href={`/reservar/${params.arenaSlug}`}>Ver horários disponíveis</Link></section></main>;
  const participant = booking?.participants[0];
  const dateTime = booking ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(booking.startsAt) : "Reserva selecionada";
  const duration = booking ? Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000) : 0;
  const holdExpiresAt = new Date(booking.createdAt.getTime() + ONLINE_BOOKING_PAYMENT_HOLD_MINUTES * 60_000).toISOString();
  return <PublicBookingPaymentChoice arenaSlug={params.arenaSlug} occurrenceId={params.occurrenceId} holdExpiresAt={holdExpiresAt} summary={{ court: booking.occurrenceCourts[0]?.court.name ?? "Quadra", dateTime, duration, amountCents: participant?.amountCents ?? 0, services: booking.serviceReservations }} />;
}

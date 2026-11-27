import { PublicBookingPaymentChoice } from "@/components/public-booking-payment-choice";
import { viewStyles } from "@/components/public-booking-payment-choice.utilities";
import Link from "next/link";
import { getBookingPaymentSummary } from "@/lib/portal/support-query";

export const dynamic = "force-dynamic";

export default async function PublicBookingPaymentPage(props: { params: Promise<{ arenaSlug: string; occurrenceId: string }> }) {
  const params = await props.params;
  const booking=await getBookingPaymentSummary(params.arenaSlug,params.occurrenceId);
  if (!booking) return <main className={viewStyles.public_booking_payment_page}><section className={viewStyles.public_booking_payment_choice}><header><span>RESERVA ONLINE</span><h1>Reserva indisponível</h1><p>Entre na sua conta para consultar esta reserva. Se o prazo de 15 minutos terminou, escolha novamente um horário disponível. Caso já tenha pago, a arena verificará a confirmação ou o reembolso.</p></header><Link className={viewStyles.public_booking_payment_return} href={`/reservar/${params.arenaSlug}`}>Ver horários disponíveis</Link></section></main>;
  return <PublicBookingPaymentChoice arenaSlug={params.arenaSlug} occurrenceId={params.occurrenceId} holdExpiresAt={booking.holdExpiresAt} summary={booking.summary} />;
}

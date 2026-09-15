import { PublicBookingPaymentChoice } from "@/components/public-booking-payment-choice";

export const dynamic = "force-dynamic";

export default function PublicBookingPaymentPage({ params }: { params: { arenaSlug: string; occurrenceId: string } }) {
  return <PublicBookingPaymentChoice arenaSlug={params.arenaSlug} occurrenceId={params.occurrenceId} />;
}

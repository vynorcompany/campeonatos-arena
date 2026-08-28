import { PublicBookingContent } from "@/components/public-booking-content";

export const dynamic = "force-dynamic";

type PublicBookingPageProps = { params: { arenaSlug: string }; searchParams?: { data?: string } };

export default async function PublicBookingPage({ params, searchParams }: PublicBookingPageProps) {
  return <PublicBookingContent arenaSlug={params.arenaSlug} date={searchParams?.data} />;
}

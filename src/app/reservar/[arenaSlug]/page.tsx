import { PublicBookingContent } from "@/components/public-booking-content";

export const dynamic = "force-dynamic";

type PublicBookingPageProps = { params: Promise<{ arenaSlug: string }>; searchParams?: Promise<{ data?: string }> };

export default async function PublicBookingPage(props: PublicBookingPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  return <PublicBookingContent arenaSlug={params.arenaSlug} date={searchParams?.data} />;
}

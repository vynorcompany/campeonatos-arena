import PublicStandingsPage from "@/app/classificacao/[arenaSlug]/page";

export const dynamic = "force-dynamic";

export default async function AthleteBookingPage({ params, searchParams }: { params: Promise<{ arenaSlug: string }>; searchParams?: Promise<{ data?: string; weekday?: string }> }) {
  return PublicStandingsPage({ params, searchParams: Promise.resolve({ ...await searchParams, section: "booking" }) });
}

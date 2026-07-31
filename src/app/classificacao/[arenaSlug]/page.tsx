import { notFound } from "next/navigation";
import { PublicStandings } from "@/components/tournaments/public-standings";
import { getArenaPublicStandings } from "@/lib/services/public-standings";

export const dynamic = "force-dynamic";

export default async function PublicStandingsPage({
  params,
  searchParams,
}: {
  params: { arenaSlug: string };
  searchParams?: { view?: string };
}) {
  const data = await getArenaPublicStandings(
    params.arenaSlug,
    searchParams?.view,
  );
  if (!data) {
    notFound();
  }

  return <PublicStandings data={data} />;
}

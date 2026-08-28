import { notFound } from "next/navigation";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { getPublicLeaguePortal } from "@/lib/services/public-league-portal";
import { PublicStandings } from "@/components/tournaments/public-standings";
import { getArenaPublicStandings } from "@/lib/services/public-standings";

export const dynamic = "force-dynamic";

export default async function PublicStandingsPage({
  params,
  searchParams,
}: {
  params: { arenaSlug: string };
  searchParams?: {
    view?: string;
    tab?: string;
    league?: string;
    status?: string;
    data?: string;
    section?: string;
    leagueTab?: string;
  };
}) {
  const [data, currentClient] = await Promise.all([getArenaPublicStandings(params.arenaSlug, searchParams), getPublicPlayerAuth(params.arenaSlug)]);
  if (!data) {
    notFound();
  }

  const portal = currentClient ? await getPublicLeaguePortal(params.arenaSlug, currentClient.playerId) : null;
  const section = searchParams?.section === "booking" || searchParams?.section === "reservations" || searchParams?.section === "lessons" || searchParams?.section === "classes" ? searchParams.section : "leagues";
  const leagueTab = searchParams?.leagueTab === "ranking" || searchParams?.leagueTab === "rules" || searchParams?.leagueTab === "prizes" ? searchParams.leagueTab : "games";
  return <PublicStandings data={data} currentClient={currentClient} portal={portal} section={section} leagueTab={leagueTab} bookingDate={searchParams?.data} authForm={<PublicClientAuthForm arenaSlug={params.arenaSlug} returnTo={`/classificacao/${params.arenaSlug}?section=leagues&leagueTab=games&tab=games`} />} />;
}

import { notFound, redirect } from "next/navigation";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { getPublicLeaguePortal } from "@/lib/services/public-league-portal";
import { getPublicClientHome } from "@/lib/services/public-client-home";
import { PublicStandings } from "@/components/tournaments/public-standings";
import { getArenaPublicStandings, getPublicArenaShell } from "@/lib/services/public-standings";
import { prisma } from "@/lib/prisma";

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
    leagueCategory?: string;
    teacher?: string;
  };
}) {
  const alias = await prisma.arenaPublicSlug.findUnique({ where: { slug: params.arenaSlug }, include: { arena: { select: { slug: true } } } });
  if (alias && alias.arena.slug !== params.arenaSlug) redirect(`/classificacao/${alias.arena.slug}`);
  const section = searchParams?.section === "home" || searchParams?.section === "leagues" || searchParams?.section === "booking" || searchParams?.section === "reservations" || searchParams?.section === "lessons" || searchParams?.section === "classes" || searchParams?.section === "profile" || searchParams?.section === "teacher" ? searchParams.section : "home";
  const [data, currentClient] = await Promise.all([
    section === "leagues" ? await getArenaPublicStandings(params.arenaSlug, { ...searchParams, league: searchParams?.leagueCategory ?? searchParams?.league }) : null,
    getPublicPlayerAuth(params.arenaSlug),
  ]);
  const arena = data?.arena ?? await getPublicArenaShell(params.arenaSlug);
  if (!arena) {
    notFound();
  }

  const [portal, home] = currentClient ? await Promise.all([
    section !== "home" ? await getPublicLeaguePortal(params.arenaSlug, currentClient.playerId, searchParams?.leagueCategory) : null,
    section === "home" ? await getPublicClientHome(params.arenaSlug, currentClient.playerId) : null,
  ]) : [null, null];
  const leagueTab = searchParams?.leagueTab === "pairs" || searchParams?.leagueTab === "ranking" || searchParams?.leagueTab === "rules" || searchParams?.leagueTab === "prizes" ? searchParams.leagueTab : "games";
  const authReturnTo = `/classificacao/${params.arenaSlug}?section=${section}${searchParams?.data ? `&data=${encodeURIComponent(searchParams.data)}` : ""}`;
  return <PublicStandings data={data} arena={arena} currentClient={currentClient} portal={portal} home={home} section={section} leagueTab={leagueTab} leagueCategoryId={searchParams?.leagueCategory} bookingDate={searchParams?.data} teacherId={searchParams?.teacher} authForm={<PublicClientAuthForm arenaSlug={params.arenaSlug} returnTo={authReturnTo} />} />;
}

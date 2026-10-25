import { arenaBookingPath } from "@/lib/arena-booking-path";
import { notFound, redirect } from "next/navigation";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { getPublicPlayerContext } from "@/lib/auth/player-session";
import { getPublicLeaguePortal } from "@/lib/services/public-league-portal";
import { getPublicClientComandas, getPublicClientFinance, getPublicClientHome } from "@/lib/services/public-client-home";
import { getPublicDoublesRadar } from "@/lib/services/public-doubles-radar";
import { getPublicSuper12 } from "@/lib/services/public-super12";
import { getAthletePortalNotifications } from "@/lib/services/public-player-notifications";
import { PublicStandings } from "@/components/tournaments/public-standings";
import { getArenaPublicStandings, getPublicArenaShell } from "@/lib/services/public-standings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicStandingsPage(
  props: {
    params: Promise<{ arenaSlug: string }>;
    searchParams?: Promise<{
      view?: string;
      tab?: string;
      league?: string;
      status?: string;
      data?: string;
      section?: string;
      leagueTab?: string;
      leagueCategory?: string;
      weekday?: string;
      financeTab?: string;
      radarGender?: string;
      radarCategory?: string;
      athlete?: string;
      eventTab?: string;
      eventRadarView?: string;
      super12?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const directBooking = searchParams?.section === "booking-direct";
  const alias = await prisma.arenaPublicSlug.findUnique({ where: { slug: params.arenaSlug }, include: { arena: { select: { slug: true } } } });
  if (alias && alias.arena.slug !== params.arenaSlug) redirect(searchParams?.section === "booking" || directBooking ? arenaBookingPath(alias.arena.slug) : `/classificacao/${alias.arena.slug}`);
  const section = directBooking ? "booking" : searchParams?.section === "schedule" || searchParams?.section === "home" || searchParams?.section === "announcements" || searchParams?.section === "finance" || searchParams?.section === "comandas" || searchParams?.section === "leagues" || searchParams?.section === "booking" || searchParams?.section === "reservations" || searchParams?.section === "lessons" || searchParams?.section === "classes" || searchParams?.section === "profile" || searchParams?.section === "teacher" || searchParams?.section === "radar" ? searchParams.section : "home";
  const isSuper12 = section === "leagues" && searchParams?.eventTab === "super12";
  const [data, { currentClient, athleteIdentity }] = await Promise.all([
    section === "leagues" && !isSuper12 ? getArenaPublicStandings(params.arenaSlug, { ...searchParams, league: searchParams?.leagueCategory ?? searchParams?.league }) : null,
    getPublicPlayerContext(params.arenaSlug),
  ]);
  const arena = data?.arena ?? (await getPublicArenaShell(params.arenaSlug));
  if (!arena) {
    notFound();
  }

  const needsPortalData = section === "leagues" || section === "reservations" || section === "lessons" || section === "classes" || section === "teacher";
  const [portal, home, finance, comandas, radar, super12, notifications] = currentClient ? await Promise.all([
    needsPortalData && !isSuper12 ? getPublicLeaguePortal(params.arenaSlug, currentClient.playerId, searchParams?.leagueCategory) : null,
    section === "home" || section === "announcements" ? getPublicClientHome(params.arenaSlug, currentClient.playerId) : null,
    section === "finance" ? getPublicClientFinance(params.arenaSlug, currentClient.playerId) : null,
    section === "comandas" ? getPublicClientComandas(params.arenaSlug, currentClient.playerId) : null,
    section === "radar" ? getPublicDoublesRadar(params.arenaSlug, currentClient.playerId, { gender: searchParams?.radarGender, category: searchParams?.radarCategory, athleteId: searchParams?.athlete }) : null,
    isSuper12 ? getPublicSuper12(params.arenaSlug, currentClient.playerId, searchParams?.super12) : null,
    getAthletePortalNotifications(params.arenaSlug, currentClient.playerId),
  ]) : [null, null, null, null, null, null, []];
  const leagueTab = searchParams?.leagueTab === "pairs" || searchParams?.leagueTab === "ranking" || searchParams?.leagueTab === "rules" || searchParams?.leagueTab === "prizes" ? searchParams.leagueTab : "games";
  const authReturnTo = section === "booking" ? `${arenaBookingPath(params.arenaSlug)}${searchParams?.data ? `?data=${encodeURIComponent(searchParams.data)}` : ""}` : `/classificacao/${encodeURIComponent(params.arenaSlug)}?section=${section}${searchParams?.data ? `&data=${encodeURIComponent(searchParams.data)}` : ""}`;
  return <PublicStandings data={data} arena={arena} currentClient={currentClient} athleteArenas={athleteIdentity?.arenas ?? []} portal={portal} home={home} finance={finance} comandas={comandas} radar={radar} radarGender={searchParams?.radarGender} radarCategory={searchParams?.radarCategory} super12={super12} notifications={notifications} eventTab={searchParams?.eventTab === "super12" ? "super12" : searchParams?.eventTab === "radar" ? "radar" : "leagues"} eventRadarView={searchParams?.eventRadarView === "all" ? "all" : "region"} super12Id={searchParams?.super12} financeTab={searchParams?.financeTab === "history" ? "history" : "upcoming"} section={section} directBooking={directBooking} leagueTab={leagueTab} leagueCategoryId={searchParams?.leagueCategory} bookingDate={searchParams?.data} weekday={searchParams?.weekday} authForm={<PublicClientAuthForm arenaSlug={params.arenaSlug} returnTo={authReturnTo} />} />;
}

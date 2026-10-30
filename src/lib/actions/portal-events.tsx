"use server";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import {
  getPublicArenaShell,
  getArenaPublicStandings,
} from "@/lib/services/public-standings";
import { getPublicLeaguePortal } from "@/lib/services/public-league-portal";
import { getPublicSuper12 } from "@/lib/services/public-super12";
import { PortalTournamentTabs } from "@/components/portal/tournament-tabs";
import { PublicSuper12 } from "@/components/public-super12";
import { PublicEventRadar } from "@/components/public-event-radar";

export async function loadPortalEventPanelAction(
  arenaSlug: string,
  kind: "leagues" | "super12" | "radar",
  categoryId?: string,
  eventId?: string,
) {
  const auth = await requirePublicPlayerAuth(arenaSlug);
  if (!["leagues", "super12", "radar"].includes(kind))
    throw new Error("Menu inválido.");
  const arena = await getPublicArenaShell(arenaSlug);
  if (!arena?.athletePortalShowLeagues)
    throw new Error("Eventos indisponíveis nesta arena.");
  if (kind === "super12")
    return (
      <PublicSuper12
        arenaSlug={arenaSlug}
        data={await getPublicSuper12(arenaSlug, auth.playerId, eventId)}
      />
    );
  if (kind === "radar") return <PublicEventRadar embedded />;
  const [portal, data] = await Promise.all([
    getPublicLeaguePortal(arenaSlug, auth.playerId, categoryId),
    getArenaPublicStandings(arenaSlug, { league: categoryId }),
  ]);
  return (
    <PortalTournamentTabs
      arenaSlug={arenaSlug}
      playerName={auth.name}
      portal={portal}
      data={data}
    />
  );
}

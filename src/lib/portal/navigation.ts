export type PortalSection =
  | "home"
  | "announcements"
  | "finance"
  | "comandas"
  | "leagues"
  | "booking"
  | "reservations"
  | "lessons"
  | "classes"
  | "profile"
  | "radar"
  | "teacher";
export type LeagueTab = "games" | "pairs" | "ranking" | "rules" | "prizes";
export type EventTab = "leagues" | "super12" | "radar";

export function portalQuery(
  section: PortalSection,
  leagueTab?: LeagueTab,
  teacherId?: string,
  leagueCategoryId?: string,
  eventTab?: EventTab,
  super12Id?: string,
) {
  const query = new URLSearchParams({
    section,
    tab:
      leagueTab === "ranking"
        ? "ranking"
        : leagueTab === "rules"
          ? "rules"
          : leagueTab === "prizes"
            ? "portal"
            : "games",
  });
  if (leagueTab) query.set("leagueTab", leagueTab);
  if (eventTab) query.set("eventTab", eventTab);
  if (super12Id) query.set("super12", super12Id);
  if (teacherId) query.set("teacher", teacherId);
  if (leagueCategoryId) query.set("leagueCategory", leagueCategoryId);
  return `?${query.toString()}`;
}


import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./tournament-tabs.utilities";
import Link from "next/link";
import { LeagueIcon, type LeagueIconName } from "@/components/tournaments/league-icon";

const tabs = [
  { key: "overview", label: "Visão geral", icon: "grid" },
  { key: "registrations", label: "Inscrições", icon: "users" },
  { key: "groups", label: "Grupos", icon: "groups" },
  { key: "games", label: "Jogos", icon: "ball" },
  { key: "results", label: "Resultados", icon: "trophy" },
  { key: "history", label: "Histórico", icon: "history" },
] as const satisfies ReadonlyArray<{ key: string; label: string; icon: LeagueIconName }>;

export type TournamentTabKey = (typeof tabs)[number]["key"];

export function TournamentTabs({
  tournamentId,
  categoryId,
  activeTab,
}: {
  tournamentId: string;
  categoryId: string;
  activeTab: TournamentTabKey;
}) {
  return (
    <nav className={viewStyles.t_tabs} aria-label="Etapas da categoria">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/torneios/${tournamentId}/categorias/${categoryId}?tab=${tab.key}`}
          className={cx(`${viewStyles.t_tab} ${activeTab === tab.key ? viewStyles.t_tab_active : ""}`)}
        >
          <span className="t-tab-icon"><LeagueIcon name={tab.icon} /></span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

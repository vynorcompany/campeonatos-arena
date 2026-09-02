import Link from "next/link";

const tabs = [
  { key: "overview", label: "Visão geral", icon: "▦" },
  { key: "registrations", label: "Inscrições", icon: "♧" },
  { key: "groups", label: "Grupos", icon: "♧" },
  { key: "games", label: "Jogos", icon: "◉" },
  { key: "results", label: "Resultados", icon: "♕" },
  { key: "history", label: "Histórico", icon: "◷" },
] as const;

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
    <nav className="t-tabs" aria-label="Etapas da categoria">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/torneios/${tournamentId}/categorias/${categoryId}?tab=${tab.key}`}
          className={`t-tab ${activeTab === tab.key ? "t-tab-active" : ""}`}
        >
          <span className="t-tab-icon" aria-hidden="true">{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

import Link from "next/link";

const tabs = [
  { key: "overview", label: "Visão geral" },
  { key: "registrations", label: "Inscrições" },
  { key: "groups", label: "Grupos" },
  { key: "games", label: "Jogos" },
  { key: "results", label: "Resultados" },
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
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

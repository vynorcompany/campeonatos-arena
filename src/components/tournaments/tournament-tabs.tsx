import Link from "next/link";

const tabs = [
  { key: "categories", label: "Categorias" },
  { key: "registrations", label: "Inscrições" },
  { key: "pairs-groups", label: "Duplas e grupos" },
  { key: "games", label: "Tabela e jogos" },
  { key: "results", label: "Resultados" },
] as const;

export type TournamentTabKey = (typeof tabs)[number]["key"];

export function TournamentTabs({
  tournamentId,
  activeTab,
}: {
  tournamentId: string;
  activeTab: TournamentTabKey;
}) {
  return (
    <nav className="t-tabs" aria-label="Etapas do evento">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/torneios/${tournamentId}?tab=${tab.key}`}
          className={`t-tab ${activeTab === tab.key ? "t-tab-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

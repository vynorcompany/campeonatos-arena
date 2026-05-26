import Link from "next/link";

const tabs = [
  { key: "overview", label: "Visão geral" },
  { key: "categories", label: "Categorias" },
  { key: "participants", label: "Participantes" },
  { key: "pairs", label: "Duplas" },
  { key: "groups", label: "Grupos" },
  { key: "games", label: "Jogos" },
  { key: "bracket", label: "Chave" },
  { key: "results", label: "Resultados" },
  { key: "settings", label: "Configurações" }
] as const;

export type TournamentTabKey = (typeof tabs)[number]["key"];

export function TournamentTabs({ tournamentId, activeTab }: { tournamentId: string; activeTab: TournamentTabKey }) {
  return (
    <nav className="t-tabs" aria-label="Navegação do torneio">
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

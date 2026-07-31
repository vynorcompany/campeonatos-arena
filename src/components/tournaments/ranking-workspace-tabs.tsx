import Link from "next/link";

export type RankingWorkspaceTab =
  | "configuracao"
  | "pontuacao"
  | "classificacao"
  | "uso";

const tabs: Array<{ id: RankingWorkspaceTab; label: string }> = [
  { id: "configuracao", label: "Configuração" },
  { id: "pontuacao", label: "Pontuação" },
  { id: "classificacao", label: "Classificação" },
  { id: "uso", label: "Uso" },
];

export function isRankingWorkspaceTab(value: string | undefined): value is RankingWorkspaceTab {
  return tabs.some((tab) => tab.id === value);
}

export function RankingWorkspaceTabs({
  rankingId,
  activeTab,
}: {
  rankingId: string;
  activeTab: RankingWorkspaceTab;
}) {
  return (
    <nav className="section-actions" aria-label="Áreas do ranking">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/torneios/rankings/${rankingId}?tab=${tab.id}`}
          className={`button${tab.id === activeTab ? " button-primary" : ""}`}
          aria-current={tab.id === activeTab ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

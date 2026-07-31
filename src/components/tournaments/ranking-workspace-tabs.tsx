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
  cycleId,
  periodQuery = {},
}: {
  rankingId: string;
  activeTab: RankingWorkspaceTab;
  cycleId?: string;
  periodQuery?: Record<string, string>;
}) {
  return (
    <nav className="section-actions" aria-label="Áreas do ranking">
      {tabs.map((tab) => {
        const searchParams = new URLSearchParams({ tab: tab.id });
        if (cycleId) searchParams.set("cycleId", cycleId);
        for (const [key, value] of Object.entries(periodQuery)) {
          if (value) searchParams.set(key, value);
        }

        return (
          <Link
            key={tab.id}
            href={`/torneios/rankings/${rankingId}?${searchParams.toString()}`}
            className={`button${tab.id === activeTab ? " button-primary" : ""}`}
            aria-current={tab.id === activeTab ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

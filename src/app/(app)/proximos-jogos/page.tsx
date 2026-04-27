import { UpcomingMatchesShowcase } from "@/components/upcoming-matches-showcase";
import { SectionCard } from "@/components/section-card";
import { requireArenaAccess } from "@/lib/auth/session";
import { getArenaDashboard } from "@/lib/services/tournament";

const stageLabels: Record<string, string> = {
  GROUP: "Fase de grupos",
  QUARTERFINAL: "Quartas de final",
  SEMIFINAL: "Semifinais",
  FINAL: "Final"
};

function getCurrentStageKey(matches: Array<{ stage: string; winnerPairId: string | null }>) {
  const groupedMatches = matches.filter((match) => match.stage === "GROUP");
  const quarterfinals = matches.filter((match) => match.stage === "QUARTERFINAL");
  const semifinals = matches.filter((match) => match.stage === "SEMIFINAL");
  const final = matches.filter((match) => match.stage === "FINAL");

  const hasPending = (items: typeof matches) => items.length > 0 && items.some((match) => match.winnerPairId === null);

  if (hasPending(groupedMatches)) {
    return "GROUP";
  }

  if (hasPending(quarterfinals)) {
    return "QUARTERFINAL";
  }

  if (hasPending(semifinals)) {
    return "SEMIFINAL";
  }

  if (hasPending(final)) {
    return "FINAL";
  }

  return null;
}

export default async function UpcomingMatchesPage() {
  const auth = await requireArenaAccess();
  const { activeTournament } = await getArenaDashboard(auth.arenaId);

  if (!activeTournament) {
    return (
      <div className="stack-md">
        <header className="page-header page-header-showcase">
          <div className="stack-xs">
            <p className="eyebrow">Apresentação</p>
            <h1>Próximos jogos</h1>
            <p className="muted">Use esta aba como vitrine da arena para exibir a próxima sequência de confrontos.</p>
          </div>
        </header>

        <SectionCard title="Nenhum torneio em andamento">
          <p className="muted">Crie um torneio e gere os jogos para começar a apresentação.</p>
        </SectionCard>
      </div>
    );
  }

  const currentStageKey = getCurrentStageKey(activeTournament.matches);
  const pendingMatches = currentStageKey
    ? activeTournament.matches.filter((match) => match.stage === currentStageKey && match.winnerPairId === null)
    : [];

  const formattedMatches = pendingMatches.map((match, index) => ({
    id: match.id,
    label: match.label,
    stageLabel: stageLabels[match.stage] ?? "Confronto",
    groupName: match.group?.name ?? null,
    homePairName: match.homePair?.name ?? null,
    awayPairName: match.awayPair?.name ?? null,
    courtName: match.courtName ?? null,
    orderLabel: `Jogo ${index + 1}`
  }));

  const stageTitle = currentStageKey ? stageLabels[currentStageKey] : "Agenda pendente";
  const stageDescription = formattedMatches.length
    ? `${formattedMatches.length} confronto${formattedMatches.length === 1 ? "" : "s"} pronto${formattedMatches.length === 1 ? "" : "s"} para exibição.`
    : "Ainda não há confrontos pendentes na fase atual.";

  return (
    <div className="stack-md">
      <header className="page-header page-header-showcase">
        <div className="stack-xs">
          <p className="eyebrow">Apresentação</p>
          <h1>Próximos jogos</h1>
          <p className="muted">Uma tela em formato de slide para mostrar a próxima rodada com visual de arena.</p>
        </div>
      </header>

      <UpcomingMatchesShowcase
        tournamentName={activeTournament.name}
        stageTitle={stageTitle}
        stageDescription={stageDescription}
        matches={formattedMatches}
      />
    </div>
  );
}

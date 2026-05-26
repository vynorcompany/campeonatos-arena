import { MetricCard } from "@/components/tournaments/metric-card";

type TournamentSummaryCardsProps = {
  hasActive: boolean;
  activeName: string;
  players: number;
  matches: number;
  finished: number;
};

export function TournamentSummaryCards({ hasActive, activeName, players, matches, finished }: TournamentSummaryCardsProps) {
  return (
    <section className="t-metric-grid">
      <MetricCard label="Torneio atual" value={hasActive ? "1" : "0"} caption={activeName || "Nenhum em andamento"} />
      <MetricCard label="Jogadores inscritos" value={players} caption="No torneio ativo" />
      <MetricCard label="Jogos programados" value={matches} caption="Fase de grupos e mata-mata" />
      <MetricCard label="Torneios encerrados" value={finished} caption="No histórico da arena" />
    </section>
  );
}


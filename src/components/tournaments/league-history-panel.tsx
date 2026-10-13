import { viewStyles } from "./league-history-panel.utilities";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { reopenLeagueCycleAction } from "@/lib/actions/category-competition";

function monthLabel(referenceMonth: string) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${referenceMonth}-01T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function LeagueHistoryPanel({ cycles, successHref }: { successHref: string; cycles: Array<{ id: string; referenceMonth: string; status: string; completedMatches: number; matchCount: number; championPairId: string | null; championName: string | null; promotedPairId: string | null; relegatedPairId: string | null; canReopen: boolean }> }) {
  const closedCycles = cycles.filter((cycle) => cycle.status === "CLOSED");
  if (!closedCycles.length) return <section className={viewStyles.league_history_empty}><strong>Nenhum mês encerrado</strong><span>O histórico aparecerá aqui após o processamento do ciclo mensal.</span></section>;
  return <section className={viewStyles.league_history_panel} aria-labelledby="league-history-title"><header><div><p className={viewStyles.eyebrow}>Liga</p><h2 id="league-history-title">Histórico mensal</h2></div><span>{closedCycles.length} ciclo{closedCycles.length === 1 ? "" : "s"}</span></header><div className={viewStyles.league_history_list}>{closedCycles.map((cycle) => <article key={cycle.id}><strong>{monthLabel(cycle.referenceMonth)}</strong><span>{cycle.completedMatches}/{cycle.matchCount} jogos concluídos</span><small>Campeã: {cycle.championName ?? (cycle.championPairId ? "não identificada" : "não definida")}{cycle.promotedPairId ? " · acesso registrado" : ""}{cycle.relegatedPairId ? " · rebaixamento registrado" : ""}</small>{cycle.canReopen ? <SafeActionForm action={reopenLeagueCycleAction} successMessage="Ciclo reaberto. O calendário da Liga está disponível novamente." successHref={successHref} confirmKeyword="REABRIR" confirmPrompt="O mês seguinte vazio será removido e os jogos do mês reaberto serão gerados com as duplas atuais. Digite REABRIR para confirmar."><input type="hidden" name="cycleId" value={cycle.id} /><button className={viewStyles.reopen_button} type="submit">Reabrir ciclo</button></SafeActionForm> : null}</article>)}</div></section>;
}

"use client";
import { Modal } from "@/components/ui/modal";


import { useCallback, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { reopenLeagueCycleAction } from "@/lib/actions/category-competition";
import type { HistoricalStanding } from "@/lib/league/history";
import { viewStyles as styles } from "./league-history-panel.utilities";

type Cycle = {
  id: string;
  referenceMonth: string;
  status: string;
  completedMatches: number;
  matchCount: number;
  championPairId: string | null;
  championName: string | null;
  promotedPairId: string | null;
  promotedName: string | null;
  relegatedPairId: string | null;
  relegatedName: string | null;
  standings: HistoricalStanding[];
  canReopen: boolean;
};

function monthLabel(referenceMonth: string) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${referenceMonth}-01T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function LeagueHistoryPanel({ cycles, successHref }: { successHref: string; cycles: Cycle[] }) {
  const closedCycles = cycles.filter((cycle) => cycle.status === "CLOSED");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = closedCycles.find((cycle) => cycle.id === selectedId);
  const closeHistory = useCallback(() => setSelectedId(null), []);

  if (!closedCycles.length) return <section className={styles.empty}><strong>Nenhum mês encerrado</strong><span>O histórico aparecerá aqui após o processamento do ciclo mensal.</span></section>;

  return <section className={styles.panel} aria-labelledby="league-history-title">
    <header className={styles.panelHeader}><h2 id="league-history-title" className="tw:sr-only">Histórico mensal</h2><span>{closedCycles.length} ciclo{closedCycles.length === 1 ? "" : "s"}</span></header>
    <div className={styles.list}>{closedCycles.map((cycle) =>
      <button key={cycle.id} type="button" className={styles.month} onClick={() => setSelectedId(cycle.id)} aria-label={`Ver histórico de ${monthLabel(cycle.referenceMonth)}`}>
        <strong>{monthLabel(cycle.referenceMonth)}</strong>
        <span>{cycle.completedMatches}/{cycle.matchCount} jogos concluídos</span>
        <small>Campeã: {cycle.championName ?? "não definida"}</small>
        <span className={styles.view}>Ver mês <span aria-hidden="true">→</span></span>
      </button>
    )}</div>
    {selected ? <Modal title={`Histórico · ${monthLabel(selected.referenceMonth)}`} open onClose={closeHistory} width="tw:max-w-[800px]">
          <div className={styles.dialogBody}>
            <div className={styles.highlights}>
              <div><span>Campeã</span><strong>{selected.championName ?? "Não definida"}</strong></div>
              {selected.promotedPairId ? <div><span>Subiu de liga</span><strong>{selected.promotedName ?? "Dupla não identificada"}</strong></div> : null}
              {selected.relegatedPairId ? <div><span>Rebaixada</span><strong>{selected.relegatedName ?? "Dupla não identificada"}</strong></div> : null}
            </div>
            <div className={styles.tableHeader}><h3>Classificação final</h3><span>{selected.completedMatches}/{selected.matchCount} jogos concluídos</span></div>
            {selected.standings.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Pos.</th><th scope="col">Dupla</th><th scope="col">J</th><th scope="col">V</th><th scope="col">Saldo</th></tr></thead><tbody>{selected.standings.map((row, index) => <tr key={row.pairId}><td>{index + 1}º</td><th scope="row">{row.pairName}{row.pairId === selected.championPairId ? <span className={styles.badge}>Campeã</span> : null}{row.pairId === selected.promotedPairId ? <span className={styles.badge}>Acesso</span> : null}{row.pairId === selected.relegatedPairId ? <span className={styles.relegated}>Rebaixada</span> : null}</th><td>{row.played}</td><td>{row.victories}</td><td>{row.differential > 0 ? `+${row.differential}` : row.differential}</td></tr>)}</tbody></table></div> : <p className={styles.missing}>A classificação deste mês não está disponível no registro histórico.</p>}
            {selected.canReopen ? <SafeActionForm action={reopenLeagueCycleAction} successMessage="Ciclo reaberto. O calendário da Liga está disponível novamente." successHref={successHref} confirmKeyword="REABRIR" confirmPrompt="O mês seguinte vazio será removido e os jogos do mês reaberto serão gerados com as duplas atuais. Digite REABRIR para confirmar."><input type="hidden" name="cycleId" value={selected.id} /><button className={styles.reopen} type="submit">Reabrir ciclo</button></SafeActionForm> : null}
          </div>
    </Modal> : null}
  </section>;
}

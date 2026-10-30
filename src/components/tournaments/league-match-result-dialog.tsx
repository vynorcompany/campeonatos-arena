"use client";
import { Modal } from "@/components/ui/modal";

import { viewStyles } from "./league-match-result-dialog.utilities";

import { useActionState, useCallback, useState } from "react";
import { recordCategoryLeagueMatchResultAction } from "@/lib/actions/category-competition";
import { initialLeagueMatchResultActionState } from "@/lib/actions/league-match-result-state";

type Match = {
  id: string; label: string;
  homePair: { name: string } | null; awayPair: { name: string } | null;
  homeSet1: number | null; awaySet1: number | null; homeSet2: number | null; awaySet2: number | null; homeSet3: number | null; awaySet3: number | null;
};

const sets = [["homeSet1", "awaySet1", "Set 1"], ["homeSet2", "awaySet2", "Set 2"], ["homeSet3", "awaySet3", "Set 3"]] as const;

function LeagueMatchResultForm({ match, onClose }: { match: Match; onClose: () => void }) {
  const [state, formAction] = useActionState(
    recordCategoryLeagueMatchResultAction,
    initialLeagueMatchResultActionState,
  );

  return (
    <form action={formAction} className={viewStyles.stack_md}>
      {state.error ? <p className={viewStyles.form_error} role="alert">{state.error}</p> : null}
      <input type="hidden" name="matchId" value={match.id} />
      <div className={viewStyles.league_score_grid}>
        <span>Dupla</span>{sets.map(([, , label]) => <span key={label}>{label}</span>)}
        <strong>{match.homePair?.name ?? "A definir"}</strong>{sets.map(([home, , label]) => <input key={home} name={home} type="number" min="0" defaultValue={match[home] ?? ""} aria-label={`${label} de ${match.homePair?.name ?? "casa"}`} />)}
        <strong>{match.awayPair?.name ?? "A definir"}</strong>{sets.map(([, away, label]) => <input key={away} name={away} type="number" min="0" defaultValue={match[away] ?? ""} aria-label={`${label} de ${match.awayPair?.name ?? "visitante"}`} />)}
      </div>
      <p className={viewStyles.muted}>Informe os dois primeiros sets. O terceiro é usado apenas no desempate.</p>
      <div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={viewStyles.button} onClick={onClose}>Cancelar</button><button className={viewStyles.button_button_primary} type="submit">Salvar resultado</button></div>
    </form>
  );
}

export function LeagueMatchResultDialog({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" className={viewStyles.category_league_result_trigger} onClick={() => setOpen(true)}>
        {match.homeSet1 == null ? "Registrar sets" : `${match.homeSet1}–${match.awaySet1} · ${match.homeSet2}–${match.awaySet2}${match.homeSet3 != null ? ` · ${match.homeSet3}–${match.awaySet3}` : ""}`}
      </button>
      {open ? <Modal title={`Resultado de ${match.label}`} open onClose={closeDialog} width="tw:max-w-[640px]">
          <LeagueMatchResultForm match={match} onClose={() => setOpen(false)} />
      </Modal> : null}
    </>
  );
}


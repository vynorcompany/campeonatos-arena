"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { recordCategoryLeagueMatchResultAction } from "@/lib/actions/category-competition";
import { initialLeagueMatchResultActionState } from "@/lib/actions/league-match-result-state";

type Match = {
  id: string; label: string;
  homePair: { name: string } | null; awayPair: { name: string } | null;
  homeSet1: number | null; awaySet1: number | null; homeSet2: number | null; awaySet2: number | null; homeSet3: number | null; awaySet3: number | null;
};

export function LeagueMatchResultDialog({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    recordCategoryLeagueMatchResultAction,
    initialLeagueMatchResultActionState,
  );
  const sets = [["homeSet1", "awaySet1", "Set 1"], ["homeSet2", "awaySet2", "Set 2"], ["homeSet3", "awaySet3", "Set 3"]] as const;
  return (
    <>
      <button type="button" className="category-league-result-trigger" onClick={() => setOpen(true)}>
        {match.homeSet1 == null ? "Registrar sets" : `${match.homeSet1}–${match.awaySet1} · ${match.homeSet2}–${match.awaySet2}${match.homeSet3 != null ? ` · ${match.homeSet3}–${match.awaySet3}` : ""}`}
      </button>
      {open ? <div className="league-score-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
        <section className="league-score-dialog" role="dialog" aria-modal="true" aria-label={`Resultado de ${match.label}`} onMouseDown={(event) => event.stopPropagation()}>
          <header><div><p className="eyebrow">Liga</p><h3>{match.label}</h3></div><button type="button" className="button" onClick={() => setOpen(false)}>Fechar</button></header>
          <form action={formAction} className="stack-md">
            {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
            <input type="hidden" name="matchId" value={match.id} />
            <div className="league-score-grid">
              <span>Dupla</span>{sets.map(([, , label]) => <span key={label}>{label}</span>)}
              <strong>{match.homePair?.name ?? "A definir"}</strong>{sets.map(([home, , label]) => <input key={home} name={home} type="number" min="0" defaultValue={match[home] ?? ""} aria-label={`${label} de ${match.homePair?.name ?? "casa"}`} />)}
              <strong>{match.awayPair?.name ?? "A definir"}</strong>{sets.map(([, away, label]) => <input key={away} name={away} type="number" min="0" defaultValue={match[away] ?? ""} aria-label={`${label} de ${match.awayPair?.name ?? "visitante"}`} />)}
            </div>
            <p className="muted">Informe os dois primeiros sets. O terceiro é usado apenas no desempate.</p>
            <div className="field-inline"><button type="button" className="button" onClick={() => setOpen(false)}>Cancelar</button><button className="button button-primary" type="submit">Salvar resultado</button></div>
          </form>
        </section>
      </div> : null}
    </>
  );
}


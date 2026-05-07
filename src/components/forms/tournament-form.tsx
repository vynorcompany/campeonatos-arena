"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTournamentAction, type ActionState, updateTournamentAction } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

type TournamentFormProps = {
  mode?: "create" | "update";
  tournamentId?: string;
  defaultName?: string;
  defaultGroupCount?: number;
  defaultPairsPerGroup?: number;
  defaultRankingId?: string;
  rankings?: { id: string; name: string }[];
  submitLabel?: string;
  pendingLabel?: string;
};

export function TournamentForm({
  mode = "create",
  tournamentId,
  defaultName = "",
  defaultGroupCount = 4,
  defaultPairsPerGroup = 3,
  defaultRankingId = "",
  rankings = [],
  submitLabel = "Criar torneio",
  pendingLabel = "Criando..."
}: TournamentFormProps) {
  const action = mode === "update" ? updateTournamentAction : createTournamentAction;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="grid-form">
      {mode === "update" && tournamentId ? <input type="hidden" name="tournamentId" value={tournamentId} /> : null}

      <div className="field">
        <label htmlFor="name">Nome do torneio</label>
        <input id="name" name="name" type="text" placeholder="Ex.: Liga Interna de Abril" defaultValue={defaultName} required />
      </div>

      <div className="field">
        <label htmlFor="groupCount">Quantidade de grupos</label>
        <select id="groupCount" name="groupCount" defaultValue={String(defaultGroupCount)}>
          <option value="1">1 grupo - todos contra todos</option>
          <option value="2">2 grupos</option>
          <option value="3">3 grupos</option>
          <option value="4">4 grupos</option>
          <option value="5">5 grupos</option>
          <option value="6">6 grupos</option>
          <option value="7">7 grupos</option>
          <option value="8">8 grupos</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="pairsPerGroup">Base de duplas por grupo</label>
        <select id="pairsPerGroup" name="pairsPerGroup" defaultValue={String(defaultPairsPerGroup)}>
          <option value="2">2 duplas</option>
          <option value="3">3 duplas</option>
          <option value="4">4 duplas</option>
          <option value="5">5 duplas</option>
          <option value="6">6 duplas</option>
          <option value="7">7 duplas</option>
          <option value="8">8 duplas</option>
          <option value="9">9 duplas</option>
          <option value="10">10 duplas</option>
          <option value="11">11 duplas</option>
          <option value="12">12 duplas</option>
          <option value="13">13 duplas</option>
          <option value="14">14 duplas</option>
          <option value="15">15 duplas</option>
          <option value="16">16 duplas</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="rankingId">Ranking usado no torneio</label>
        <select id="rankingId" name="rankingId" defaultValue={defaultRankingId}>
          <option value="">Nenhum ranking vinculado</option>
          {rankings.map((ranking) => (
            <option key={ranking.id} value={ranking.id}>
              {ranking.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-tournament">
          {submitLabel}
        </label>
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTournamentAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

export function TournamentForm() {
  const [state, formAction] = useFormState(createTournamentAction, initialState);

  return (
    <form action={formAction} className="grid-form">
      <div className="field">
        <label htmlFor="name">Nome do torneio</label>
        <input id="name" name="name" type="text" placeholder="Ex.: Liga Interna de Abril" required />
      </div>

      <div className="field">
        <label htmlFor="groupCount">Quantidade de grupos</label>
        <select id="groupCount" name="groupCount" defaultValue="4">
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
        <label htmlFor="pairsPerGroup">Duplas por grupo</label>
        <select id="pairsPerGroup" name="pairsPerGroup" defaultValue="3">
          <option value="2">2 duplas</option>
          <option value="3">3 duplas</option>
          <option value="4">4 duplas</option>
          <option value="5">5 duplas</option>
          <option value="6">6 duplas</option>
          <option value="7">7 duplas</option>
          <option value="8">8 duplas</option>
        </select>
      </div>

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-tournament">
          Criar torneio
        </label>
        <SubmitButton label="Criar torneio" pendingLabel="Criando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}

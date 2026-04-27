"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createPlayerAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

export function PlayerForm() {
  const [state, formAction] = useFormState(createPlayerAction, initialState);

  return (
    <form action={formAction} className="grid-form">
      <div className="field">
        <label htmlFor="name">Nome do jogador</label>
        <input id="name" name="name" type="text" placeholder="Ex.: Pedro Martins" required />
      </div>

      <div className="field">
        <label htmlFor="points">Pontuação inicial</label>
        <input id="points" name="points" type="number" min="0" defaultValue="1000" required />
      </div>

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-player">
          Cadastrar jogador
        </label>
        <SubmitButton label="Cadastrar jogador" pendingLabel="Salvando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}

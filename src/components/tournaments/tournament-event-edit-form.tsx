"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  type ActionState,
  updateTournamentAction,
} from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null,
};

type TournamentEventEditFormProps = {
  tournament: {
    id: string;
    name: string;
    description: string;
  };
};

export function TournamentEventEditForm({
  tournament,
}: TournamentEventEditFormProps) {
  const [state, formAction] = useFormState(updateTournamentAction, initialState);

  return (
    <form action={formAction} className="grid-form">
      <input type="hidden" name="tournamentId" value={tournament.id} />
      <div className="field">
        <label htmlFor="event-name">Nome</label>
        <input
          id="event-name"
          name="name"
          defaultValue={tournament.name}
          required
        />
      </div>
      <div className="field form-full">
        <label htmlFor="event-description">Descrição</label>
        <textarea
          id="event-description"
          name="description"
          defaultValue={tournament.description}
        />
      </div>
      <div className="field field-submit form-full">
        <SubmitButton
          label="Salvar evento"
          pendingLabel="Salvando..."
          className="button button-primary"
        />
      </div>
      {state.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state.success ? (
        <p className="form-success form-full">{state.success}</p>
      ) : null}
    </form>
  );
}

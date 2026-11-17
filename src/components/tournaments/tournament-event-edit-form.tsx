"use client";
import { viewStyles } from "./tournament-event-edit-form.utilities";

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
  onCancel?: () => void;
  tournament: {
    id: string;
    name: string;
    description: string;
    rules: string;
  };
};

export function TournamentEventEditForm({
  tournament, onCancel,
}: TournamentEventEditFormProps) {
  const [state, formAction] = useFormState(updateTournamentAction, initialState);

  return (
    <form action={formAction} className={viewStyles.grid_form}>
      <input type="hidden" name="tournamentId" value={tournament.id} />
      <div className={viewStyles.field}>
        <label htmlFor="event-name">Nome</label>
        <input
          id="event-name"
          name="name"
          defaultValue={tournament.name}
          required
        />
      </div>
      <div className={viewStyles.field_form_full}>
        <label htmlFor="event-description">Descrição</label>
        <textarea
          id="event-description"
          name="description"
          rows={3}
          defaultValue={tournament.description}
        />
      </div>
      <div className={viewStyles.field_form_full}>
        <label htmlFor="event-rules">Regulamento</label>
        <textarea
          id="event-rules"
          name="rules"
          className={viewStyles.event_rules_editor}
          rows={6}
          defaultValue={tournament.rules}
          placeholder="Insira o regulamento que será exibido na página pública."
        />
      </div>
      <footer className={viewStyles.field_field_submit_form_full}>
        {onCancel ? <button type="button" className={viewStyles.button_secondary} onClick={onCancel}>Cancelar</button> : null}
        <SubmitButton
          label="Salvar evento"
          pendingLabel="Salvando..."
          className={viewStyles.button_button_primary}
        />
      </footer>
      {state.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state.success ? (
        <p className={viewStyles.form_success_form_full}>{state.success}</p>
      ) : null}
    </form>
  );
}

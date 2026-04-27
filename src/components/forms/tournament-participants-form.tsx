"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { syncEntriesStateAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

type TournamentParticipantsFormProps = {
  tournamentId: string;
  players: Array<{
    id: string;
    name: string;
    points: number;
    checked: boolean;
  }>;
};

export function TournamentParticipantsForm({ tournamentId, players }: TournamentParticipantsFormProps) {
  const [state, formAction] = useFormState(syncEntriesStateAction, initialState);

  return (
    <form action={formAction} className="stack-md">
      <input type="hidden" name="tournamentId" value={tournamentId} />

      <div className="participant-grid">
        {players.map((player) => (
          <label key={player.id} className="participant-option">
            <input type="checkbox" name="playerIds" value={player.id} defaultChecked={player.checked} />
            <div className="participant-copy">
              <strong>{player.name}</strong>
              <span>{player.points} pts</span>
            </div>
          </label>
        ))}
      </div>

      <div className="section-actions">
        <SubmitButton label="Salvar participantes" pendingLabel="Salvando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}

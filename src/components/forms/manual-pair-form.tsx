"use client";
import { viewStyles } from "./manual-pair-form.utilities";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTournamentPairAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

type ManualPairFormProps = {
  tournamentId: string;
  players: Array<{
    id: string;
    name: string;
    points: number;
  }>;
};

export function ManualPairForm({ tournamentId, players }: ManualPairFormProps) {
  const [state, formAction] = useFormState(createTournamentPairAction, initialState);
  const hasEnoughPlayers = players.length >= 2;

  return (
    <form action={formAction} className={viewStyles.grid_form}>
      <input type="hidden" name="tournamentId" value={tournamentId} />

      <div className={viewStyles.field}>
        <label htmlFor="playerAId">Jogador 1</label>
        <select id="playerAId" name="playerAId" defaultValue="" disabled={!hasEnoughPlayers} required>
          <option value="">Selecione</option>
          {players.map((player) => (
            <option key={`player-a-${player.id}`} value={player.id}>
              {player.name} ({player.points} pts)
            </option>
          ))}
        </select>
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="playerBId">Jogador 2</label>
        <select id="playerBId" name="playerBId" defaultValue="" disabled={!hasEnoughPlayers} required>
          <option value="">Selecione</option>
          {players.map((player) => (
            <option key={`player-b-${player.id}`} value={player.id}>
              {player.name} ({player.points} pts)
            </option>
          ))}
        </select>
      </div>

      <div className={viewStyles.field_field_submit}>
        <label className={viewStyles.sr_only} htmlFor="submit-pair">
          Criar dupla
        </label>
        <SubmitButton
          label="Salvar dupla"
          pendingLabel="Salvando..."
          className={viewStyles.button_button_primary}
        />
      </div>

      {!hasEnoughPlayers ? <p className={viewStyles.form_error_form_full}>É preciso ter pelo menos 2 jogadores livres para montar uma dupla.</p> : null}
      {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}
    </form>
  );
}

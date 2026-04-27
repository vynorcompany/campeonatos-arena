"use client";

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
    <form action={formAction} className="grid-form">
      <input type="hidden" name="tournamentId" value={tournamentId} />

      <div className="field">
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

      <div className="field">
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

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-pair">
          Criar dupla
        </label>
        <SubmitButton
          label="Salvar dupla"
          pendingLabel="Salvando..."
          className="button button-primary"
        />
      </div>

      {!hasEnoughPlayers ? <p className="form-error form-full">É preciso ter pelo menos 2 jogadores livres para montar uma dupla.</p> : null}
      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}

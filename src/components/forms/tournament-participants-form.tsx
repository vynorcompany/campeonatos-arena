"use client";

import { useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(() => new Set(players.filter((player) => player.checked).map((player) => player.id)));
  const normalizedSearch = normalizeSearch(search);
  const matchingPlayerIds = useMemo(() => {
    if (!normalizedSearch) {
      return new Set(players.map((player) => player.id));
    }

    return new Set(
      players
        .filter((player) => normalizeSearch(player.name).includes(normalizedSearch))
        .map((player) => player.id)
    );
  }, [normalizedSearch, players]);
  const visibleCount = matchingPlayerIds.size;
  const selectedCount = selectedPlayerIds.size;

  function togglePlayer(playerId: string, checked: boolean) {
    setSelectedPlayerIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(playerId);
      } else {
        next.delete(playerId);
      }

      return next;
    });
  }

  return (
    <form action={formAction} className="stack-md">
      <input type="hidden" name="tournamentId" value={tournamentId} />

      <div className="participant-toolbar">
        <div className="field participant-search-field">
          <label htmlFor="participant-search">Buscar jogador</label>
          <input
            id="participant-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite o nome do jogador"
          />
        </div>
        <div className="participant-count">
          <strong>{selectedCount}</strong>
          <span>selecionado{selectedCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="participant-grid">
        {players.map((player) => (
          <label key={player.id} className="participant-option" hidden={!matchingPlayerIds.has(player.id)}>
            <input
              type="checkbox"
              name="playerIds"
              value={player.id}
              checked={selectedPlayerIds.has(player.id)}
              onChange={(event) => togglePlayer(player.id, event.target.checked)}
            />
            <div className="participant-copy">
              <strong>{player.name}</strong>
              <span>{player.points} pts</span>
            </div>
          </label>
        ))}
      </div>

      {!visibleCount ? <p className="muted">Nenhum jogador encontrado para essa busca.</p> : null}

      <div className="section-actions">
        <SubmitButton label="Salvar participantes" pendingLabel="Salvando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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
  const rankedPlayers = useMemo(() => {
    if (!normalizedSearch) {
      return players;
    }

    return [...players]
      .map((player) => {
        const normalizedName = normalizeSearch(player.name);
        const index = normalizedName.indexOf(normalizedSearch);
        const isMatch = index >= 0;
        const startsWith = index === 0;

        return {
          player,
          isMatch,
          startsWith,
          index,
          lengthDelta: Math.abs(normalizedName.length - normalizedSearch.length)
        };
      })
      .sort((a, b) => {
        if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
        if (!a.isMatch && !b.isMatch) return a.player.name.localeCompare(b.player.name);
        if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
        if (a.index !== b.index) return a.index - b.index;
        if (a.lengthDelta !== b.lengthDelta) return a.lengthDelta - b.lengthDelta;
        return a.player.name.localeCompare(b.player.name);
      })
      .map((entry) => entry.player);
  }, [normalizedSearch, players]);

  const visibleCount = rankedPlayers.filter((player) =>
    !normalizedSearch || normalizeSearch(player.name).includes(normalizedSearch)
  ).length;
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
        {rankedPlayers.map((player) => (
          <label
            key={player.id}
            className="participant-option"
            hidden={!!normalizedSearch && !normalizeSearch(player.name).includes(normalizedSearch)}
          >
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

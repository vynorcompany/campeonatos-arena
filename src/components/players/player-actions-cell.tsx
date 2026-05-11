"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { archivePlayerAction, updatePlayerAction } from "@/lib/actions/tournament";

type PlayerActionsCellProps = {
  playerId: string;
  playerName: string;
  playerPoints: number;
  playerPhotoUrl: string;
  active: boolean;
};

export function PlayerActionsCell({ playerId, playerName, playerPoints, playerPhotoUrl, active }: PlayerActionsCellProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <form action={updatePlayerAction} className="player-name-edit-form">
        <input type="hidden" name="playerId" value={playerId} />
        <input type="hidden" name="points" value={playerPoints} />
        <input
          name="name"
          type="text"
          defaultValue={playerName}
          aria-label={`Nome de ${playerName}`}
          className="player-name-input"
          autoFocus
        />
        <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Foto de ${playerName}`} />
        <div className="player-inline-actions">
          <SubmitButton label="Salvar" pendingLabel="..." className="player-inline-text-button player-inline-text-button-save" />
          <button
            type="button"
            className="player-inline-text-button"
            onClick={() => setIsEditing(false)}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="player-name-cell">
      <span className="player-avatar" aria-hidden="true">
        {playerPhotoUrl ? <img src={playerPhotoUrl} alt="" /> : playerName.slice(0, 1).toUpperCase()}
      </span>
      <span className="player-name-label">{playerName}</span>

      <div className="player-name-tools">
        <button
          type="button"
          className="player-inline-icon-button"
          onClick={() => setIsEditing(true)}
          aria-label={`Editar ${playerName}`}
          title="Editar nome"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3.75 14.4V16.25H5.6L14.12 7.73L12.27 5.88L3.75 14.4Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11.62 6.53L13.47 8.38"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.93 4.95L12.16 3.72C12.5 3.39 12.95 3.2 13.42 3.2C13.89 3.2 14.34 3.39 14.68 3.72L16.28 5.32C16.61 5.66 16.8 6.11 16.8 6.58C16.8 7.05 16.61 7.5 16.28 7.84L15.05 9.07"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {active ? (
          <form
            action={archivePlayerAction}
            onSubmit={(event) => {
              const typed = window.prompt(`Para remover ${playerName}, digite EXCLUIR.`);
              if ((typed ?? "").trim().toUpperCase() !== "EXCLUIR") {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="playerId" value={playerId} />
            <button
              type="submit"
              className="player-trash-button"
              aria-label={`Excluir ${playerName}`}
              title="Remover jogador"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4.75 5.75H15.25"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M7.25 5.75V4.9C7.25 4.28 7.75 3.78 8.37 3.78H11.63C12.25 3.78 12.75 4.28 12.75 4.9V5.75"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.35 7.35V14.2C6.35 15.06 7.04 15.75 7.9 15.75H12.1C12.96 15.75 13.65 15.06 13.65 14.2V7.35"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.7 8.95V12.75"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M11.3 8.95V12.75"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

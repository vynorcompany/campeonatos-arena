"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { archivePlayerAction, deleteAthleteAction, updatePlayerAction } from "@/lib/actions/tournament";

type PlayerActionsCellProps = {
  playerId: string;
  playerName: string;
  playerPoints: number;
  playerPhotoUrl: string;
  playerClass: string;
  playerGender: string;
  playerPhone: string;
  playerCpf: string;
  playerBirthDate: string | null;
  active: boolean;
  deletionRestriction: string | null;
};

export function PlayerActionsCell({
  playerId,
  playerName,
  playerPoints,
  playerPhotoUrl,
  playerClass,
  playerGender,
  playerPhone,
  playerCpf,
  playerBirthDate,
  active,
  deletionRestriction
}: PlayerActionsCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (isEditing) {
    return (
      <form action={updatePlayerAction} className="player-name-edit-form">
        <input type="hidden" name="playerId" value={playerId} />
        <input type="hidden" name="points" value={playerPoints} />
        <input
          name="class"
          type="text"
          defaultValue={playerClass}
          aria-label={`Classe de ${playerName}`}
          className="player-name-input"
        />
        <input
          name="gender"
          type="text"
          defaultValue={playerGender}
          aria-label={`Gênero de ${playerName}`}
          className="player-name-input"
        />
        <input
          name="name"
          type="text"
          defaultValue={playerName}
          aria-label={`Nome de ${playerName}`}
          className="player-name-input"
          autoFocus
        />
        <input name="phone" type="tel" defaultValue={playerPhone} aria-label={`Telefone de ${playerName}`} required />
        <input name="cpf" inputMode="numeric" defaultValue={playerCpf} aria-label={`CPF de ${playerName}`} />
        <input name="birthDate" type="date" defaultValue={playerBirthDate ? playerBirthDate.slice(0, 10) : ""} aria-label={`Nascimento de ${playerName}`} />
        <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Foto de ${playerName}`} />
        <div className="player-inline-actions">
          <SubmitButton label="Salvar" pendingLabel="..." className="player-inline-text-button player-inline-text-button-save" />
          <button type="button" className="player-inline-text-button" onClick={() => setIsEditing(false)}>
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
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-label={`Ações de ${playerName}`}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          title="Ações"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="4.5" r="1.1" fill="currentColor" />
            <circle cx="10" cy="10" r="1.1" fill="currentColor" />
            <circle cx="10" cy="15.5" r="1.1" fill="currentColor" />
          </svg>
        </button>

        {isMenuOpen ? (
          <div className="player-action-menu" role="menu" aria-label={`Ações de ${playerName}`}>
            <button
              type="button"
              className="player-action-menu-item"
              role="menuitem"
              onClick={() => {
                setIsEditing(true);
                setIsMenuOpen(false);
              }}
            >
              Editar
            </button>

            <form action={archivePlayerAction}>
              <input type="hidden" name="playerId" value={playerId} />
              <button
                type="submit"
                className="player-action-menu-item"
                role="menuitem"
                disabled={!active}
                title={active ? undefined : "Este atleta já está inativo."}
              >
                Inativar
              </button>
            </form>

            {deletionRestriction ? (
              <div className="player-action-menu-delete-block">
                <button type="button" className="player-action-menu-item player-action-menu-danger" disabled aria-disabled="true">
                  Excluir
                </button>
                <p>{deletionRestriction}</p>
              </div>
            ) : (
              <SafeActionForm
                action={deleteAthleteAction}
                className="player-action-menu-form"
                confirmKeyword="EXCLUIR"
                confirmPrompt={`Digite EXCLUIR para remover ${playerName} permanentemente.`}
                successMessage="Atleta excluído."
              >
                <input type="hidden" name="playerId" value={playerId} />
                <button type="submit" className="player-action-menu-item player-action-menu-danger" role="menuitem">
                  Excluir
                </button>
              </SafeActionForm>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

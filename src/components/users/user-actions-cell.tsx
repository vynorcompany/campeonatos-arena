"use client";
import { viewStyles } from "./user-actions-cell.utilities";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { removeArenaUserAction, updateArenaUserAction } from "@/lib/actions/user";
import { sendArenaUserRecoveryAction } from "@/lib/actions/account-access";
import type { ArenaRole } from "@/types/auth";

const roleLabels: Record<ArenaRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
  VIEWER: "Viewer"
};

type UserActionsCellProps = {
  userId: string;
  name: string;
  email: string;
  role: ArenaRole;
  viewPermissions: string[];
  editPermissions: string[];
  profileId: string | null;
  profiles: { id: string; name: string }[];
  isCurrentUser: boolean;
};

export function UserActionsCell({
  userId,
  name,
  email,
  role,
  viewPermissions,
  editPermissions,
  profileId,
  profiles,
  isCurrentUser
}: UserActionsCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  if (isEditing) {
    return (
      <SafeActionForm action={updateArenaUserAction} className={viewStyles.entity_edit_form} successMessage="Usuário atualizado.">
        <input type="hidden" name="userId" value={userId} />
        <div className={viewStyles.entity_edit_grid_entity_edit_grid_user}>
          <input name="name" type="text" defaultValue={name} aria-label="Nome do usuário" autoFocus />
          <input name="email" type="email" defaultValue={email} aria-label="E-mail do usuário" />
          <input type="hidden" name="arenaRole" value={role} />
          <select name="permissionProfileId" defaultValue={profileId ?? ""} aria-label="Perfil de usuário" required>
            <option value="" disabled>Selecione o perfil</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
        </div>
        <div className={viewStyles.player_inline_actions}>
          <SubmitButton label="Salvar" pendingLabel="..." className={viewStyles.player_inline_text_button_player_inline_text_button_save} />
          <button type="button" className={viewStyles.player_inline_text_button} onClick={() => setIsEditing(false)}>
            Cancelar
          </button>
        </div>
      </SafeActionForm>
    );
  }

  return (
    <div className={viewStyles.entity_actions_cell}>
      <div className={viewStyles.user_row_actions}>
        <span className={viewStyles.pill}>{roleLabels[role]}</span>
        <button
          type="button"
          className={viewStyles.player_inline_icon_button}
          onClick={() => setIsEditing(true)}
          aria-label={`Editar ${name}`}
          title="Editar usuário"
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
          </svg>
        </button>

        {!isCurrentUser ? (
          <SafeActionForm action={removeArenaUserAction} successMessage="Usuário removido da arena." confirmKeyword="REMOVER" confirmPrompt={`Remover ${name} desta arena? O usuário não será excluído do sistema. Digite REMOVER para continuar.`}>
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              className={viewStyles.player_trash_button}
              aria-label={`Remover ${name}`}
              title="Remover acesso"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4.75 5.75H15.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
                <path d="M8.7 8.95V12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M11.3 8.95V12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </SafeActionForm>
        ) : null}
      </div>
      <SafeActionForm action={sendArenaUserRecoveryAction} className={viewStyles.inline_form_user_password_form} successMessage="Link de recuperação enviado ao e-mail do usuário.">
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton label="Enviar recuperação" pendingLabel="Enviando..." className={viewStyles.button} />
      </SafeActionForm>
    </div>
  );
}

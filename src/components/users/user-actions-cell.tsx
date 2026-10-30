"use client";
import { viewStyles } from "./user-actions-cell.utilities";

import { Modal } from "@/components/ui/modal";
import { SettingsDialogButton } from "@/components/ui/settings-dialog-button";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { useCallback, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { removeArenaUserAction, updateArenaUserAction } from "@/lib/actions/user";
import { UserRecoveryForm } from "@/components/users/user-recovery-form";
import type { ArenaRole } from "@/types/auth";


type UserActionsCellProps = {
  userId: string;
  name: string;
  email: string;
  role: ArenaRole;
  viewPermissions: string[];
  editPermissions: string[];
  profileId: string | null;
  profiles: { id: string; name: string; optionLabel?: string }[];
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
  const closeEditing = useCallback(() => setIsEditing(false), []);
  if (isEditing) {
    return (
      <Modal title={`Editar ${name}`} open onClose={closeEditing}>
        <SafeActionForm action={updateArenaUserAction} className="tw:grid tw:min-w-0 tw:gap-4" successMessage="Usuário atualizado." onSuccess={closeEditing}>
          <input type="hidden" name="userId" value={userId} /><input type="hidden" name="arenaRole" value={role} />
          <label className={ui.field}>Nome e sobrenome<input name="name" type="text" defaultValue={name} required /></label>
          <label className={ui.field}>E-mail<input name="email" type="email" defaultValue={email} required /></label>
          <label className={ui.field}>Perfil de usuário<select name="permissionProfileId" defaultValue={profileId ?? ""} required><option value="" disabled>Selecione o perfil</option>{profiles.map(profile => <option key={profile.id} value={profile.id} title={profile.name}>{profile.optionLabel ?? profile.name}</option>)}</select></label>
          <footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-4"><button type="button" className={ui.secondary} onClick={closeEditing}>Cancelar</button><SubmitButton label="Salvar usuário" pendingLabel="Salvando..." className={ui.primary} /></footer>
        </SafeActionForm>
      </Modal>
    );
  }

  return (
    <div className={viewStyles.entity_actions_cell}>
      <div className={viewStyles.user_row_actions}>
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
      <SettingsDialogButton label="Recuperar acesso" title={`Recuperar acesso de ${name}`} secondary><UserRecoveryForm userId={userId} /></SettingsDialogButton>
    </div>
  );
}

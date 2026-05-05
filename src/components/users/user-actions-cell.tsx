"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { PermissionMatrix } from "@/components/users/permission-matrix";
import { removeArenaUserAction, resetArenaUserPasswordAction, updateArenaUserAction } from "@/lib/actions/user";
import { defaultPermissionsForRole } from "@/lib/permissions";
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
  isCurrentUser: boolean;
};

export function UserActionsCell({
  userId,
  name,
  email,
  role,
  viewPermissions,
  editPermissions,
  isCurrentUser
}: UserActionsCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const defaults = defaultPermissionsForRole(role);
  const effectiveViewPermissions = viewPermissions.length ? viewPermissions : defaults.viewPermissions;
  const effectiveEditPermissions = editPermissions.length ? editPermissions : defaults.editPermissions;

  if (isEditing) {
    return (
      <SafeActionForm action={updateArenaUserAction} className="entity-edit-form" successMessage="Usuário atualizado.">
        <input type="hidden" name="userId" value={userId} />
        <div className="entity-edit-grid entity-edit-grid-user">
          <input name="name" type="text" defaultValue={name} aria-label="Nome do usuário" autoFocus />
          <input name="email" type="email" defaultValue={email} aria-label="E-mail do usuário" />
          <select name="arenaRole" defaultValue={role} aria-label="Papel do usuário">
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Staff</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        <PermissionMatrix viewPermissions={effectiveViewPermissions} editPermissions={effectiveEditPermissions} />
        <div className="player-inline-actions">
          <SubmitButton label="Salvar" pendingLabel="..." className="player-inline-text-button player-inline-text-button-save" />
          <button type="button" className="player-inline-text-button" onClick={() => setIsEditing(false)}>
            Cancelar
          </button>
        </div>
      </SafeActionForm>
    );
  }

  return (
    <div className="entity-actions-cell">
      <div className="user-row-actions">
        <span className="pill">{roleLabels[role]}</span>
        <button
          type="button"
          className="player-inline-icon-button"
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
          <SafeActionForm action={removeArenaUserAction} successMessage="Usuário removido da arena.">
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              className="player-trash-button"
              aria-label={`Remover ${name}`}
              title="Remover acesso"
              onClick={(event) => {
                if (!window.confirm(`Remover ${name} desta arena? O usuário não será excluído do sistema.`)) {
                  event.preventDefault();
                }
              }}
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
      <SafeActionForm action={resetArenaUserPasswordAction} className="inline-form user-password-form" successMessage="Senha redefinida.">
        <input type="hidden" name="userId" value={userId} />
        <input name="password" type="password" minLength={10} placeholder="Nova senha temporária" required />
        <SubmitButton label="Redefinir senha" pendingLabel="..." className="button" />
      </SafeActionForm>
    </div>
  );
}

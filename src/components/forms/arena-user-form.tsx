"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { PermissionMatrix } from "@/components/users/permission-matrix";
import { createArenaUserAction, type UserActionState } from "@/lib/actions/user";
import { defaultPermissionsForRole } from "@/lib/permissions";

const initialState: UserActionState = {
  error: null,
  success: null
};

export function ArenaUserForm() {
  const [state, formAction] = useFormState(createArenaUserAction, initialState);

  return (
    <form action={formAction} className="grid-form">
      <div className="field">
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" type="text" placeholder="Ex.: Marina Alves" required />
      </div>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" placeholder="marina@arena.com" required />
      </div>

      <div className="field">
        <label htmlFor="password">Senha temporária</label>
        <input id="password" name="password" type="password" placeholder="Senha inicial" required />
      </div>

      <div className="field">
        <label htmlFor="arenaRole">Papel na arena</label>
        <select id="arenaRole" name="arenaRole" defaultValue="STAFF">
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>

      <div className="form-full">
        <PermissionMatrix {...defaultPermissionsForRole("STAFF")} />
      </div>

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-user">
          Criar usuário
        </label>
        <SubmitButton label="Salvar usuário" pendingLabel="Salvando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}

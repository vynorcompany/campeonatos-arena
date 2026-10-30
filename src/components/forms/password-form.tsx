"use client";
import { viewStyles } from "./password-form.utilities";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateOwnPasswordAction, type UserActionState } from "@/lib/actions/user";

const initialState: UserActionState = {
  error: null,
  success: null
};

export function PasswordForm() {
  const [state, formAction] = useActionState(updateOwnPasswordAction, initialState);

  return (
    <form action={formAction} className={viewStyles.grid_form}>
      <div className={viewStyles.field}>
        <label htmlFor="currentPassword">Senha atual</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="newPassword">Nova senha</label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="confirmPassword">Confirmar nova senha</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
      </div>

      <div className={viewStyles.field_field_submit}>
        <label className={viewStyles.sr_only} htmlFor="submit-password">
          Alterar senha
        </label>
        <SubmitButton label="Alterar senha" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
      </div>

      {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}
    </form>
  );
}

"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateOwnPasswordAction, type UserActionState } from "@/lib/actions/user";

const initialState: UserActionState = {
  error: null,
  success: null
};

export function PasswordForm() {
  const [state, formAction] = useFormState(updateOwnPasswordAction, initialState);

  return (
    <form action={formAction} className="grid-form">
      <div className="field">
        <label htmlFor="currentPassword">Senha atual</label>
        <input id="currentPassword" name="currentPassword" type="password" required />
      </div>

      <div className="field">
        <label htmlFor="newPassword">Nova senha</label>
        <input id="newPassword" name="newPassword" type="password" required />
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirmar nova senha</label>
        <input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-password">
          Alterar senha
        </label>
        <SubmitButton label="Alterar senha" pendingLabel="Salvando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}

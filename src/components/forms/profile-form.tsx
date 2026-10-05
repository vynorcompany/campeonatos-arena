"use client";
import { viewStyles } from "./profile-form.utilities";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateOwnProfileAction, type UserActionState } from "@/lib/actions/user";

const initialState: UserActionState = {
  error: null,
  success: null
};

type ProfileFormProps = {
  userName: string;
  userEmail: string;
};

export function ProfileForm({ userName, userEmail }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateOwnProfileAction, initialState);

  return (
    <form action={formAction} className={viewStyles.grid_form}>
      <div className={viewStyles.field}>
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" type="text" defaultValue={userName} required />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" defaultValue={userEmail} disabled />
      </div>

      <div className={viewStyles.field_field_submit}>
        <label className={viewStyles.sr_only} htmlFor="submit-profile">
          Salvar perfil
        </label>
        <SubmitButton label="Salvar perfil" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
      </div>

      {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}
    </form>
  );
}

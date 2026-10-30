"use client";
import { viewStyles } from "./profile-form.utilities";

import { useActionState } from "react";
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
  const [state, formAction] = useActionState(updateOwnProfileAction, initialState);

  return (
    <form action={formAction} className={viewStyles.grid_form}>
      <div className={viewStyles.field}>
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" type="text" defaultValue={userName} required />
      </div>

      <div className={viewStyles.field}>
        <span id="profile-email-label">E-mail</span>
        <p aria-labelledby="profile-email-label" className="tw:m-0 tw:min-h-[42px] tw:min-w-0 tw:rounded-[7px] tw:border tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-2 tw:font-normal tw:text-[var(--ink)] tw:[overflow-wrap:anywhere]">{userEmail}</p>
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

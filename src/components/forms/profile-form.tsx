"use client";

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
    <form action={formAction} className="grid-form">
      <div className="field">
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" type="text" defaultValue={userName} required />
      </div>

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" defaultValue={userEmail} disabled />
      </div>

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-profile">
          Salvar perfil
        </label>
        <SubmitButton label="Salvar perfil" pendingLabel="Salvando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}

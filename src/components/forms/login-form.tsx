"use client";

import { useFormState } from "react-dom";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: LoginState = {
  error: null
};

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form action={formAction} className="stack-md">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="voce@suaarena.com" required />
      </div>

      <div className="field">
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" placeholder="Sua senha" required />
      </div>

      {state?.error ? <p className="form-error">{state.error}</p> : null}

      <SubmitButton label="Entrar" pendingLabel="Validando..." className="button button-primary button-block" />
    </form>
  );
}

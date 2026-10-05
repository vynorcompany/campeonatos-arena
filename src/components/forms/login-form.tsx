"use client";
import { viewStyles } from "./login-form.utilities";

import { useFormState } from "react-dom";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import Link from "next/link";

const initialState: LoginState = {
  error: null
};

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form action={formAction} className={viewStyles.stack_md_login_form}>
      <div className={viewStyles.field}>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" placeholder="voce@suaarena.com" required />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" required />
        <Link className={viewStyles.login_forgot_link} href="/recuperar-senha">Esqueci minha senha</Link>
      </div>

      {state?.error ? <p className={viewStyles.form_error}>{state.error}</p> : null}

      <SubmitButton label="Entrar" pendingLabel="Validando..." className={viewStyles.button_button_primary_button_block} />
    </form>
  );
}

"use client";

import { useFormState } from "react-dom";
import { loginGlobalAthleteAction, type PublicClientAuthState } from "@/lib/actions/player-auth";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: PublicClientAuthState = { error: null };

export function GlobalAthleteAuthForm() {
  const [state, action] = useFormState(loginGlobalAthleteAction, initialState);
  return <section className="public-client-auth"><header><span>CONTA DO ATLETA</span><h2>Entre no Portal do Atleta</h2><p>Um único acesso para suas arenas, eventos, reservas e pagamentos.</p></header><form action={action}><label className="field">Telefone<input name="phone" inputMode="tel" autoComplete="tel" required /></label><label className="field">Senha<input name="password" type="password" autoComplete="current-password" required /></label><SubmitButton label="Entrar" pendingLabel="Entrando..." className="button button-primary" /></form>{state?.error ? <p className="form-error">{state.error}</p> : null}<p className="muted">Ainda não tem conta? Faça seu primeiro cadastro pelo link da sua arena.</p></section>;
}

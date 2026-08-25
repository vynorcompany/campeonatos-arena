"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { loginPublicClientAction, registerPublicClientAction, type PublicClientAuthState } from "@/lib/actions/player-auth";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: PublicClientAuthState = { error: null };

export function PublicClientAuthForm({ arenaSlug, returnTo }: { arenaSlug: string; returnTo?: string }) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [loginState, loginAction] = useFormState(loginPublicClientAction, initialState);
  const [registerState, registerAction] = useFormState(registerPublicClientAction, initialState);
  const state = mode === "LOGIN" ? loginState : registerState;

  return <section className="public-client-auth"><header><span>ÁREA DO CLIENTE</span><h2>{mode === "LOGIN" ? "Entre para acessar" : "Crie sua conta"}</h2><p>Use seu telefone para manter suas reservas, aulas e pagamentos em um único cadastro.</p></header><div className="public-client-auth-tabs"><button type="button" className={mode === "LOGIN" ? "active" : ""} onClick={() => setMode("LOGIN")}>Entrar</button><button type="button" className={mode === "REGISTER" ? "active" : ""} onClick={() => setMode("REGISTER")}>Criar conta</button></div>{mode === "LOGIN" ? <form action={loginAction}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="returnTo" value={returnTo ?? ""} /><label className="field">Telefone<input name="phone" inputMode="tel" autoComplete="tel" required /></label><label className="field">Senha<input name="password" type="password" autoComplete="current-password" required /></label><SubmitButton label="Entrar" pendingLabel="Entrando..." className="button button-primary" /></form> : <form action={registerAction}><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="returnTo" value={returnTo ?? ""} /><label className="field">Seu nome<input name="name" autoComplete="name" required /></label><label className="field">Telefone<input name="phone" inputMode="tel" autoComplete="tel" required /></label><label className="field">Crie uma senha<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label><label className="field">Repita a senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label><SubmitButton label="Criar conta" pendingLabel="Criando conta..." className="button button-primary" /></form>}{state?.error ? <p className="form-error">{state.error}</p> : null}</section>;
}

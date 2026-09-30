"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { acceptArenaInviteAction, completePasswordResetAction, requestPasswordResetAction, type AccountAccessState } from "@/lib/actions/account-access";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: AccountAccessState = { error: null, success: null };

function FormFeedback({ state }: { state: AccountAccessState }) {
  return <>{state.error ? <p className="form-error">{state.error}</p> : null}{state.success ? <p className="form-success">{state.success} <Link href="/login">Ir para o login</Link></p> : null}</>;
}

export function RequestPasswordResetForm() {
  const [state, action] = useFormState(requestPasswordResetAction, initialState);
  return <form action={action} className="stack-md login-form"><label className="field">E-mail cadastrado<input name="email" type="email" autoComplete="email" required /></label><FormFeedback state={state} /><SubmitButton label="Enviar link de recuperação" pendingLabel="Enviando..." className="button button-primary button-block" /></form>;
}

export function CompletePasswordResetForm({ token }: { token: string }) {
  const [state, action] = useFormState(completePasswordResetAction, initialState);
  return <form action={action} className="stack-md login-form"><input type="hidden" name="token" value={token} /><label className="field">Nova senha<input name="password" type="password" minLength={10} autoComplete="new-password" required /></label><label className="field">Confirmar nova senha<input name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></label><FormFeedback state={state} /><SubmitButton label="Redefinir senha" pendingLabel="Salvando..." className="button button-primary button-block" /></form>;
}

export function AcceptInviteForm({ token, existingUser }: { token: string; existingUser: boolean }) {
  const [state, action] = useFormState(acceptArenaInviteAction, initialState);
  return <form action={action} className="stack-md login-form"><input type="hidden" name="token" value={token} />{!existingUser ? <><label className="field">Crie sua senha<input name="password" type="password" minLength={10} autoComplete="new-password" required /></label><label className="field">Confirmar senha<input name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></label></> : <p className="muted">Sua conta já existe. Aceite o convite e entre com a senha que utiliza normalmente.</p>}<FormFeedback state={state} /><SubmitButton label={existingUser ? "Aceitar convite" : "Criar acesso"} pendingLabel="Concluindo..." className="button button-primary button-block" /></form>;
}

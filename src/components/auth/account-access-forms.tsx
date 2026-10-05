"use client";
import { viewStyles } from "./account-access-forms.utilities";

import Link from "next/link";
import { useFormState } from "react-dom";
import { acceptArenaInviteAction, completePasswordResetAction, requestPasswordResetAction, type AccountAccessState } from "@/lib/actions/account-access";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: AccountAccessState = { error: null, success: null };

function FormFeedback({ state }: { state: AccountAccessState }) {
  return <>{state.error ? <p className={viewStyles.form_error}>{state.error}</p> : null}{state.success ? <p className={viewStyles.form_success}>{state.success} <Link href="/login">Ir para o login</Link></p> : null}</>;
}

export function RequestPasswordResetForm() {
  const [state, action] = useFormState(requestPasswordResetAction, initialState);
  return <form action={action} className={viewStyles.stack_md_login_form}><label className={viewStyles.field}>E-mail cadastrado<input name="email" type="email" autoComplete="email" required /></label><FormFeedback state={state} /><SubmitButton label="Enviar link de recuperação" pendingLabel="Enviando..." className={viewStyles.button_button_primary_button_block} /></form>;
}

export function CompletePasswordResetForm({ token }: { token: string }) {
  const [state, action] = useFormState(completePasswordResetAction, initialState);
  return <form action={action} className={viewStyles.stack_md_login_form}><input type="hidden" name="token" value={token} /><label className={viewStyles.field}>Nova senha<input name="password" type="password" minLength={10} autoComplete="new-password" required /></label><label className={viewStyles.field}>Confirmar nova senha<input name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></label><FormFeedback state={state} /><SubmitButton label="Redefinir senha" pendingLabel="Salvando..." className={viewStyles.button_button_primary_button_block} /></form>;
}

export function AcceptInviteForm({ token, existingUser }: { token: string; existingUser: boolean }) {
  const [state, action] = useFormState(acceptArenaInviteAction, initialState);
  return <form action={action} className={viewStyles.stack_md_login_form}><input type="hidden" name="token" value={token} />{!existingUser ? <><label className={viewStyles.field}>Crie sua senha<input name="password" type="password" minLength={10} autoComplete="new-password" required /></label><label className={viewStyles.field}>Confirmar senha<input name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></label></> : <p className={viewStyles.muted}>Sua conta já existe. Aceite o convite e entre com a senha que utiliza normalmente.</p>}<FormFeedback state={state} /><SubmitButton label={existingUser ? "Aceitar convite" : "Criar acesso"} pendingLabel="Concluindo..." className={viewStyles.button_button_primary_button_block} /></form>;
}

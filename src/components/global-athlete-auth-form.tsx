"use client";
import { viewStyles } from "./global-athlete-auth-form.utilities";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { confirmGlobalPublicPasswordResetAction, loginGlobalAthleteAction, requestGlobalPublicPasswordResetAction, type PublicClientAuthState } from "@/lib/actions/player-auth";
import { ArenaLegalLinks } from "@/components/legal/arena-legal-links";
import { BotTrap } from "@/components/forms/bot-trap";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: PublicClientAuthState = { error: null };

export function GlobalAthleteAuthForm() {
  const [state, action] = useFormState(loginGlobalAthleteAction, initialState);
  const [requestState, requestAction] = useFormState(requestGlobalPublicPasswordResetAction, initialState);
  const [confirmState, confirmAction] = useFormState(confirmGlobalPublicPasswordResetAction, initialState);
  const [mode, setMode] = useState<"LOGIN" | "REQUEST" | "CONFIRM">("LOGIN");
  const [requestPhone, setRequestPhone] = useState("");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  useEffect(() => { if (requestState.requested) setMode("CONFIRM"); }, [requestState]);
  useEffect(() => { if (confirmState.notice) { setSuccessNotice(confirmState.notice); setMode("LOGIN"); } }, [confirmState]);
  const currentState = mode === "LOGIN" ? state : mode === "REQUEST" ? requestState : confirmState;
  const notice = mode === "CONFIRM" ? requestState.notice : mode === "LOGIN" ? successNotice : requestState.notice;

  return <section className={viewStyles.public_client_auth}>
    <header><span>CONTA DO ATLETA</span><h2>{mode === "LOGIN" ? "Entre no Portal do Atleta" : mode === "REQUEST" ? "Recupere sua senha" : "Crie uma nova senha"}</h2><p>{mode === "LOGIN" ? "Um único acesso para suas arenas, eventos, reservas e pagamentos." : "Enviaremos um código para o WhatsApp cadastrado."}</p></header>
    {mode === "LOGIN" ? <form action={action}><BotTrap/>
      <label className={viewStyles.field}>Telefone<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
      <label className={viewStyles.field}>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
      <button type="button" className={viewStyles.public_client_auth_forgot} onClick={() => { setSuccessNotice(null); setMode("REQUEST"); }}>Perdi minha senha</button>
      <SubmitButton label="Entrar" pendingLabel="Entrando..." className={viewStyles.button_button_primary} />
    </form> : mode === "REQUEST" ? <form action={requestAction}><BotTrap/>
      <label className={viewStyles.field}>Telefone cadastrado<input name="phone" inputMode="tel" autoComplete="tel" value={requestPhone} onChange={(event) => setRequestPhone(event.currentTarget.value)} required /></label>
      <div className={viewStyles.public_client_auth_actions}><button type="button" className={viewStyles.button_button_small} onClick={() => setMode("LOGIN")}>Voltar</button><SubmitButton label="Enviar código" pendingLabel="Enviando..." className={viewStyles.button_button_primary} /></div>
    </form> : <form action={confirmAction}><BotTrap/>
      <label className={viewStyles.field}>Telefone cadastrado<input name="phone" inputMode="tel" autoComplete="tel" defaultValue={requestState.phone ?? ""} required /></label>
      <label className={viewStyles.field}>Código de 6 dígitos<input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
      <label className={viewStyles.field}>Nova senha<input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className={viewStyles.field}>Repita a nova senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <div className={viewStyles.public_client_auth_actions}><button type="button" className={viewStyles.button_button_small} onClick={() => setMode("LOGIN")}>Voltar</button><SubmitButton label="Salvar nova senha" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div>
    </form>}
    {currentState.error ? <p className={viewStyles.form_error} role="alert">{currentState.error}</p> : notice ? <p className="form-message form-message-success" role="status">{notice}</p> : null}
    {mode === "LOGIN" ? <p className={viewStyles.muted}>Ainda não tem conta? Faça seu primeiro cadastro pelo link da sua arena.</p> : null}
    <div className="tw:mt-4 tw:border-t tw:border-[var(--line)] tw:pt-4"><ArenaLegalLinks/></div>
  </section>;
}

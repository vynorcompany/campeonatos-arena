"use client";
import { PortalRecoveryChoice } from "@/components/portal/portal-recovery-choice";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { viewStyles } from "./global-athlete-auth-form.utilities";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { confirmGlobalPublicPasswordResetAction, loginGlobalAthleteAction, requestGlobalPublicPasswordResetAction, type PublicClientAuthState } from "@/lib/actions/player-auth";
import { ArenaLegalLinks } from "@/components/legal/arena-legal-links";
import { BotTrap } from "@/components/forms/bot-trap";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: PublicClientAuthState = { error: null };

export function GlobalAthleteAuthForm({ arenaSlug, arenas = [] }: { arenaSlug?: string; arenas?: { name: string; slug: string }[] }) {
  const [state, action] = useFormState(loginGlobalAthleteAction, initialState);
  const [requestState, requestAction] = useFormState(requestGlobalPublicPasswordResetAction, initialState);
  const [confirmState, confirmAction] = useFormState(confirmGlobalPublicPasswordResetAction, initialState);
  const [mode, setMode] = useState<"LOGIN" | "RECOVERY" | "REQUEST" | "CONFIRM" | "REGISTER">("LOGIN");
  const [showFeedback, setShowFeedback] = useState(false);
  const [registrationArena, setRegistrationArena] = useState(arenaSlug ?? "");
  const [arenaLinkError, setArenaLinkError] = useState("");
  const [requestPhone, setRequestPhone] = useState("");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  useEffect(() => { if (requestState.requested) setMode("CONFIRM"); }, [requestState]);
  useEffect(() => { if (confirmState.notice) { setSuccessNotice(confirmState.notice); setShowFeedback(false); setMode("LOGIN"); } }, [confirmState]);
  const currentState = mode === "LOGIN" ? state : mode === "REQUEST" ? requestState : confirmState;
  const notice = mode === "CONFIRM" ? requestState.notice : mode === "LOGIN" ? successNotice : requestState.notice;

  if (mode === "REGISTER") return <div className="tw:grid tw:min-w-0 tw:gap-4">
    {registrationArena ? <PublicClientAuthForm key={registrationArena} arenaSlug={registrationArena} initialMode="REGISTER" /> : <section className={viewStyles.public_client_auth}>
      <header><h2>Crie sua conta</h2></header>
      <form onSubmit={(event) => {
        event.preventDefault();
        const slug = String(new FormData(event.currentTarget).get("arenaSlug") ?? "");
        if (arenas.some(arena => arena.slug === slug)) { setArenaLinkError(""); setRegistrationArena(slug); }
        else setArenaLinkError("Selecione a arena onde você joga.");
      }}>
        <label className={viewStyles.field}>Arena<select name="arenaSlug" required defaultValue=""><option value="" disabled>Selecione sua arena</option>{arenas.map(arena => <option key={arena.slug} value={arena.slug}>{arena.name}</option>)}</select></label>
        {arenaLinkError ? <p role="alert" className={viewStyles.form_error}>{arenaLinkError}</p> : null}
        <button type="submit" className={viewStyles.button_button_primary}>Continuar</button>
      </form>
    </section>}
    <button type="button" className={viewStyles.public_client_auth_forgot} onClick={() => { setRegistrationArena(arenaSlug ?? ""); setMode("LOGIN"); }}>Voltar para entrar</button>
  </div>;

  return <section className={viewStyles.public_client_auth}>
    <header><h2>{mode === "LOGIN" ? "Entre no VX4" : mode === "REQUEST" || mode === "RECOVERY" ? "Recupere sua senha" : "Crie uma nova senha"}</h2>{mode === "REQUEST" || mode === "CONFIRM" ? <p>{mode === "CONFIRM" ? "Digite o código recebido pelo WhatsApp do VX4 (Vynor Company)." : "Você receberá um código pelo WhatsApp do VX4 (Vynor Company)."}</p> : null}</header>
    {mode === "RECOVERY" ? <PortalRecoveryChoice onWhatsApp={() => { setShowFeedback(false); setMode("REQUEST"); }} onBack={() => { setShowFeedback(false); setMode("LOGIN"); }}/> : mode === "LOGIN" ? <form key={mode} action={action} onSubmit={() => setShowFeedback(true)}><BotTrap/>
      <label className={viewStyles.field}>Telefone<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
      <label className={viewStyles.field}>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
      <button type="button" className={viewStyles.public_client_auth_forgot} onClick={() => { setSuccessNotice(null); setShowFeedback(false); setMode("RECOVERY"); }}>Recuperar senha</button>
      <SubmitButton label="Entrar" pendingLabel="Entrando..." className={viewStyles.button_button_primary} />
    </form> : mode === "REQUEST" ? <form key={mode} action={requestAction} onSubmit={() => setShowFeedback(true)}><BotTrap/>
      <label className={viewStyles.field}>Telefone cadastrado<input name="phone" inputMode="tel" autoComplete="tel" value={requestPhone} onChange={(event) => setRequestPhone(event.currentTarget.value)} required /></label>
      <div className={viewStyles.public_client_auth_actions}><button type="button" className={viewStyles.button_button_small} onClick={() => { setShowFeedback(false); setMode("RECOVERY"); }}>Voltar</button><SubmitButton label="Enviar código" pendingLabel="Enviando..." className={viewStyles.button_button_primary} /></div>
    </form> : <form key={mode} action={confirmAction} onSubmit={() => setShowFeedback(true)}><BotTrap/>
      <label className={viewStyles.field}>Telefone cadastrado<input name="phone" inputMode="tel" autoComplete="tel" defaultValue={requestState.phone ?? ""} required /></label>
      <label className={viewStyles.field}>Código de 6 dígitos<input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
      <label className={viewStyles.field}>Nova senha<input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className={viewStyles.field}>Repita a nova senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <div className={viewStyles.public_client_auth_actions}><button type="button" className={viewStyles.button_button_small} onClick={() => { setShowFeedback(false); setMode("RECOVERY"); }}>Voltar</button><SubmitButton label="Salvar nova senha" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div>
    </form>}
    {showFeedback && currentState.error ? <p className={viewStyles.form_error} role="alert">{currentState.error}</p> : (mode === "LOGIN" ? successNotice : showFeedback && notice) ? <p className="form-message form-message-success" role="status">{notice}</p> : null}
    {mode === "LOGIN" ? <button type="button" className={viewStyles.button_button_small} onClick={() => { setShowFeedback(false); setSuccessNotice(null); setMode("REGISTER"); }}>Criar conta</button> : null}
    <div className="tw:mt-4 tw:border-t tw:border-[var(--line)] tw:pt-4"><ArenaLegalLinks showCookieNotice={false}/></div>
  </section>;
}

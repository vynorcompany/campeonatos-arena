"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-client-auth-form.utilities";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { confirmPublicClientRegistrationAction, confirmPublicPasswordResetAction, loginPublicClientAction, registerPublicClientAction, requestPublicPasswordResetAction, type PublicClientAuthState } from "@/lib/actions/player-auth";
import Link from "next/link";
import { legalVersion } from "@/lib/legal/version";
import { ArenaLegalLinks } from "@/components/legal/arena-legal-links";
import { BotTrap } from "@/components/forms/bot-trap";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: PublicClientAuthState = { error: null };

export function PublicClientAuthForm({ arenaSlug, returnTo }: { arenaSlug: string; returnTo?: string }) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "REGISTER_CONFIRM" | "RESET_REQUEST" | "RESET_CONFIRM">("LOGIN");
  const [loginState, loginAction] = useFormState(loginPublicClientAction, initialState);
  const [registerState, registerAction] = useFormState(registerPublicClientAction, initialState);
  const [registerConfirmState, registerConfirmAction] = useFormState(confirmPublicClientRegistrationAction, initialState);
  const [resetRequestState, resetRequestAction] = useFormState(requestPublicPasswordResetAction, initialState);
  const [resetConfirmState, resetConfirmAction] = useFormState(confirmPublicPasswordResetAction, initialState);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [requestPhone, setRequestPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registration, setRegistration] = useState({ name: "", phone: "", password: "", confirmPassword: "" });
  const updateRegistration = (key: keyof typeof registration, value: string) => setRegistration((current) => ({ ...current, [key]: value }));
  useEffect(() => { if (registerState.requested) setMode("REGISTER_CONFIRM"); }, [registerState]);
  useEffect(() => { if (resetRequestState.requested) setMode("RESET_CONFIRM"); }, [resetRequestState]);
  useEffect(() => { if (resetConfirmState.notice) { setSuccessNotice(resetConfirmState.notice); setMode("LOGIN"); } }, [resetConfirmState]);
  const state = mode === "LOGIN" ? loginState : mode === "REGISTER" ? registerState : mode === "REGISTER_CONFIRM" ? registerConfirmState : mode === "RESET_REQUEST" ? resetRequestState : resetConfirmState;
  const notice = mode === "REGISTER_CONFIRM" ? registerState.notice : mode === "RESET_CONFIRM" ? resetRequestState.notice : mode === "LOGIN" ? successNotice : null;

  return <section className={viewStyles.public_client_auth}>
    <header><span>ÁREA DO CLIENTE</span><h2>{mode === "LOGIN" ? "Entre para acessar" : mode === "REGISTER" ? "Crie sua conta" : mode === "REGISTER_CONFIRM" ? "Confirme seu telefone" : mode === "RESET_REQUEST" ? "Recupere sua senha" : "Crie uma nova senha"}</h2><p>{mode === "REGISTER_CONFIRM" ? "Digite o código recebido pelo WhatsApp para concluir seu cadastro." : mode.startsWith("RESET") ? "Enviaremos um código de confirmação para o WhatsApp cadastrado." : "Use seu telefone para manter suas reservas, aulas e pagamentos em um único cadastro."}</p></header>
    {!mode.startsWith("RESET") ? <div className={viewStyles.public_client_auth_tabs}><button type="button" className={cx(mode === "LOGIN" ? "active" : "")} onClick={() => setMode("LOGIN")}>Entrar</button><button type="button" className={cx(mode.startsWith("REGISTER") ? "active" : "")} onClick={() => setMode("REGISTER")}>Criar conta</button></div> : null}
    {mode === "LOGIN" ? <form action={loginAction}><BotTrap/>
      <input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="returnTo" value={returnTo ?? ""} />
      <label className={viewStyles.field}>Telefone<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
      <label className={viewStyles.field}>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
      <button type="button" className={viewStyles.public_client_auth_forgot} onClick={() => { setSuccessNotice(null); setMode("RESET_REQUEST"); }}>Perdi minha senha</button>
      <SubmitButton label="Entrar" pendingLabel="Entrando..." className={viewStyles.button_button_primary} />
    </form> : mode === "REGISTER" ? <form action={registerAction}><BotTrap/><input type="hidden" name="legalVersion" value={legalVersion}/>
      <input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="returnTo" value={returnTo ?? ""} />
      <label className={viewStyles.field}>Nome e sobrenome<input name="name" autoComplete="name" placeholder="Ex.: Maria Silva" value={registration.name} onChange={(event) => updateRegistration("name", event.currentTarget.value)} required /></label>
      <label className={viewStyles.field}>Telefone<input name="phone" inputMode="tel" autoComplete="tel" value={registration.phone} onChange={(event) => updateRegistration("phone", event.currentTarget.value)} required /></label>
      <label className={viewStyles.field}>Crie uma senha<input name="password" type="password" autoComplete="new-password" minLength={8} value={registration.password} onChange={(event) => updateRegistration("password", event.currentTarget.value)} required /></label>
      <label className={viewStyles.field}>Repita a senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} value={registration.confirmPassword} onChange={(event) => updateRegistration("confirmPassword", event.currentTarget.value)} required /></label>
      <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">Nome, telefone e senha são necessários para seu acesso. As informações de perfil são opcionais. Não informe dados de terceiros sem autorização.</p>
      <label className="tw:flex tw:items-start tw:gap-3 tw:text-xs tw:leading-relaxed"><input name="termsAccepted" type="checkbox" required checked={termsAccepted} onChange={event => setTermsAccepted(event.currentTarget.checked)} className="tw:mt-0.5 tw:size-5 tw:shrink-0 tw:accent-[#175a40]"/><span>Concordo com os <Link href={`/classificacao/${encodeURIComponent(arenaSlug)}/legal/termos`} target="_blank" rel="noopener noreferrer" className="tw:font-semibold tw:underline">Termos de Uso</Link> e estou ciente da <Link href={`/classificacao/${encodeURIComponent(arenaSlug)}/legal/privacidade`} target="_blank" rel="noopener noreferrer" className="tw:font-semibold tw:underline">Política de Privacidade</Link>.</span></label>
      <SubmitButton label="Criar conta" pendingLabel="Criando conta..." className={viewStyles.button_button_primary} />
    </form> : mode === "REGISTER_CONFIRM" ? <form action={registerConfirmAction}><BotTrap/><input type="hidden" name="legalVersion" value={legalVersion}/><input type="hidden" name="termsAccepted" value={termsAccepted ? "on" : ""}/>
      <input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="returnTo" value={returnTo ?? ""} />
      <input type="hidden" name="name" value={registration.name} /><input type="hidden" name="phone" value={registration.phone} />
      <input type="hidden" name="password" value={registration.password} /><input type="hidden" name="confirmPassword" value={registration.confirmPassword} />
      <label className={viewStyles.field}>Código de 6 dígitos<input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required /></label>
      <div className={viewStyles.public_client_auth_actions}><button type="button" className={viewStyles.button_button_small} onClick={() => setMode("REGISTER")}>Voltar</button><SubmitButton label="Confirmar cadastro" pendingLabel="Confirmando..." className={viewStyles.button_button_primary} /></div>
    </form> : mode === "RESET_REQUEST" ? <form action={resetRequestAction}><BotTrap/>
      <input type="hidden" name="arenaSlug" value={arenaSlug} />
      <label className={viewStyles.field}>Telefone cadastrado<input name="phone" inputMode="tel" autoComplete="tel" value={requestPhone} onChange={(event) => setRequestPhone(event.currentTarget.value)} required /></label>
      <div className={viewStyles.public_client_auth_actions}><button type="button" className={viewStyles.button_button_small} onClick={() => setMode("LOGIN")}>Voltar</button><SubmitButton label="Enviar código" pendingLabel="Enviando..." className={viewStyles.button_button_primary} /></div>
    </form> : <form action={resetConfirmAction}><BotTrap/>
      <input type="hidden" name="arenaSlug" value={arenaSlug} />
      <label className={viewStyles.field}>Telefone cadastrado<input name="phone" inputMode="tel" autoComplete="tel" defaultValue={resetRequestState.phone ?? ""} required /></label>
      <label className={viewStyles.field}>Código de 6 dígitos<input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
      <label className={viewStyles.field}>Nova senha<input name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className={viewStyles.field}>Repita a nova senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <div className={viewStyles.public_client_auth_actions}><button type="button" className={viewStyles.button_button_small} onClick={() => setMode("LOGIN")}>Voltar</button><SubmitButton label="Salvar nova senha" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div>
    </form>}
    {state.error ? <p className={viewStyles.form_error} role="alert">{state.error}</p> : notice ? <p className="form-message form-message-success" role="status">{notice}</p> : null}
    <div className="tw:mt-4 tw:border-t tw:border-[var(--line)] tw:pt-4"><ArenaLegalLinks arenaSlug={arenaSlug}/></div>
  </section>;
}

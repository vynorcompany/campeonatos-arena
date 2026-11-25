"use client";
import { useFormState } from "react-dom";
import Link from "next/link";
import { EmailInput } from "@/components/forms/email-input";
import { BotTrap } from "@/components/forms/bot-trap";
import { SubmitButton } from "@/components/forms/submit-button";
import { requestAthleteEmailVerificationAction, confirmAthleteEmailAction, requestAthleteEmailPasswordResetAction, completeAthleteEmailPasswordResetAction, type AthleteEmailAccessState } from "@/lib/actions/athlete-email-access";

const initial: AthleteEmailAccessState = { error: null };
const field = "tw:min-h-10 tw:w-full tw:min-w-0 tw:rounded-[5px] tw:border tw:border-[var(--portal-line,#cbd4df)] tw:bg-[var(--portal-surface,white)] tw:px-3 tw:py-2 tw:text-sm tw:font-normal tw:text-[var(--portal-ink,#202c3c)] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983]";
const label = "tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-normal";
const button = "tw:inline-flex tw:min-h-9 tw:w-fit tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-[5px] tw:border-0 tw:bg-[#087443] tw:px-4 tw:py-2 tw:text-sm tw:font-normal tw:text-white tw:hover:bg-[#065b34] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:disabled:opacity-60";
function Feedback({ state }: { state: AthleteEmailAccessState }) { return <>{state.error ? <p role="alert" className="tw:m-0 tw:text-sm tw:text-[#a02119] tw:dark:text-[#ffb9ab]">{state.error}</p> : null}{state.success ? <p role="status" className="tw:m-0 tw:text-sm tw:text-[#087443] tw:dark:text-[#79d7a8]">{state.success}</p> : null}</>; }

export function AthleteRecoveryEmailSettings({ recoveryEmail, contactEmail }: { recoveryEmail?: string | null; contactEmail?: string }) {
  const [state, action] = useFormState(requestAthleteEmailVerificationAction, initial);
  return <section aria-label="Recuperação de acesso" className="tw:mt-6 tw:grid tw:min-w-0 tw:gap-3 tw:border-t tw:border-[var(--portal-line,#cbd4df)] tw:pt-5">
    <h2 className="tw:m-0 tw:text-sm tw:font-medium">Recuperação de acesso</h2>
    <p className="tw:m-0 tw:text-xs">{recoveryEmail ? `E-mail confirmado: ${recoveryEmail}` : "Nenhum e-mail de recuperação confirmado."}</p>
    <form action={action} className="tw:grid tw:min-w-0 tw:gap-3 tw:sm:grid-cols-2"><BotTrap/>
      <label className={label}>E-mail de recuperação<EmailInput className={field} name="email" defaultValue={recoveryEmail ?? contactEmail ?? ""} required/></label>
      <label className={label}>Senha atual<input className={field} name="currentPassword" type="password" autoComplete="current-password" required minLength={8} maxLength={128}/></label>
      <div className="tw:col-span-full"><SubmitButton label="Enviar confirmação por e-mail" pendingLabel="Enviando..." className={button}/></div>
      <div className="tw:col-span-full"><Feedback state={state}/></div>
    </form>
  </section>;
}

export function AthleteEmailPasswordRequestForm() {
  const [state, action] = useFormState(requestAthleteEmailPasswordResetAction, initial);
  return <form action={action} className="tw:grid tw:min-w-0 tw:gap-4"><BotTrap/><label className={label}>E-mail confirmado<EmailInput className={field} name="email" required/></label><Feedback state={state}/><SubmitButton label="Enviar link de recuperação" pendingLabel="Enviando..." className={button}/></form>;
}
export function AthleteEmailConfirmationForm({ token }: { token: string }) {
  const [state, action] = useFormState(confirmAthleteEmailAction, initial);
  return <form action={action} className="tw:grid tw:min-w-0 tw:gap-4"><BotTrap/><input type="hidden" name="token" value={token}/><Feedback state={state}/>{!state.success ? <SubmitButton label="Confirmar e-mail de recuperação" pendingLabel="Confirmando..." className={button}/> : <Link href="/portal" className="tw:text-sm tw:text-[#174983]">Voltar ao Portal</Link>}</form>;
}
export function AthleteEmailPasswordResetForm({ token }: { token: string }) {
  const [state, action] = useFormState(completeAthleteEmailPasswordResetAction, initial);
  return <form action={action} className="tw:grid tw:min-w-0 tw:gap-4"><BotTrap/><input type="hidden" name="token" value={token}/>{!state.success ? <><label className={label}>Nova senha<input className={field} name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128}/></label><label className={label}>Repita a nova senha<input className={field} name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128}/></label></> : null}<Feedback state={state}/>{!state.success ? <SubmitButton label="Salvar nova senha" pendingLabel="Salvando..." className={button}/> : <Link href="/portal" className="tw:text-sm tw:text-[#174983]">Entrar no Portal</Link>}</form>;
}

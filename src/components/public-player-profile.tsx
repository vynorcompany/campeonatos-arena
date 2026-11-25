"use client";

import { AthleteRecoveryEmailSettings } from "@/components/auth/athlete-email-access-forms";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmailInput } from "@/components/forms/email-input";
import { AvatarCropField } from "@/components/avatar-crop-field";
import { formatBrazilianPhone } from "@/lib/phone";
import { updatePublicPlayerProfileAction, type PublicProfileActionState } from "@/lib/actions/public-player-profile";

const initialState: PublicProfileActionState = { error: null, success: null };
const padelCategories = ["Iniciante", "7ª categoria", "6ª categoria", "5ª categoria", "4ª categoria", "3ª categoria", "2ª categoria", "1ª categoria", "Profissional"];
const field = "tw:min-h-10 tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--portal-line,#cbd4df)] tw:bg-[var(--portal-surface,white)] tw:px-3 tw:py-2 tw:text-sm tw:font-normal tw:text-[var(--portal-ink,#202c3c)] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:focus-visible:outline-[#a5caff]";
const label = "tw:grid tw:min-w-0 tw:gap-1.5 tw:text-xs tw:font-normal";

type Player = { recoveryEmail?: string | null; name: string; phone: string; email: string; bio: string; birthDate: string; photoUrl: string; gender: string; padelCategories: string[]; padelSide: string };

export function PublicPlayerProfile({ arenaSlug, player, financialStatus = null }: { arenaSlug: string; player: Player; financialStatus?: "healthy" | "open" | null }) {
  const [state, action] = useFormState(updatePublicPlayerProfileAction, initialState);
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState(player.padelCategories);
  const categoryOptions = Array.from(new Set([...padelCategories, ...player.padelCategories]));
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <section aria-label="Dados do perfil" className="tw:min-w-0 tw:text-[var(--portal-ink)]">
    <form action={action} className="tw:grid tw:min-w-0 tw:gap-6">
      <input type="hidden" name="arenaSlug" value={arenaSlug}/>
      <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-x-6 tw:gap-y-3 tw:border-b tw:border-[var(--portal-line)] tw:pb-5">
        <AvatarCropField appearance="profile" showHints={false} currentPhotoUrl={player.photoUrl} name={player.name}/>
        {financialStatus ? <span role="status" className={`tw:inline-flex tw:items-center tw:gap-1.5 tw:text-xs tw:font-normal ${financialStatus === "healthy" ? "tw:text-[#087443] tw:dark:text-[#79d7a8]" : "tw:text-[#9c382d] tw:dark:text-[#ffb9ab]"}`}><span aria-hidden="true" className="tw:size-1.5 tw:rounded-full tw:bg-current"/>{financialStatus === "healthy" ? "Tudo em dia" : "Débitos em aberto"}</span> : null}
      </header>
      <div className="tw:grid tw:min-w-0 tw:gap-6 tw:min-[900px]:grid-cols-[1.12fr_1fr] tw:min-[900px]:gap-8">
        <fieldset className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0">
          <legend className="tw:mb-4 tw:p-0 tw:text-sm tw:font-medium">Dados pessoais</legend>
          <div className="tw:grid tw:min-w-0 tw:grid-cols-1 tw:min-[400px]:grid-cols-2 tw:gap-x-3 tw:gap-y-4">
            <label className={`${label} tw:col-span-full`}>Nome<input className={field} name="name" autoComplete="name" minLength={3} defaultValue={player.name} required onBlur={event => { event.target.value = event.target.value.trim().replace(/\s+/g, " "); }}/></label>
            <label className={label}>Telefone<input className={`${field} tw:text-[var(--portal-muted)]`} name="phone" type="tel" inputMode="tel" autoComplete="tel" value={formatBrazilianPhone(player.phone) || player.phone} readOnly required/></label>
            <label className={label}>Data de nascimento<input className={field} name="birthDate" type="date" autoComplete="bday" max={today} defaultValue={player.birthDate}/></label>
            <label className={`${label} tw:col-span-full`} htmlFor="portal-profile-email">E-mail<EmailInput errorClassName="tw:dark:text-[#ffb9ab]" id="portal-profile-email" className={field} name="email" defaultValue={player.email}/></label>
          </div>
        </fieldset>
        <fieldset className="tw:m-0 tw:min-w-0 tw:border-0 tw:border-t tw:border-[var(--portal-line)] tw:p-0 tw:pt-5 tw:min-[900px]:border-t-0 tw:min-[900px]:border-l tw:min-[900px]:pl-8 tw:min-[900px]:pt-0">
          <legend className="tw:mb-4 tw:p-0 tw:text-sm tw:font-medium">Seu jogo de padel</legend>
          <div className="tw:grid tw:min-w-0 tw:grid-cols-1 tw:min-[400px]:grid-cols-2 tw:gap-x-3 tw:gap-y-4 tw:min-[900px]:grid-cols-1">
            <label className={label}>Gênero<select className={field} name="gender" autoComplete="sex" defaultValue={player.gender}><option value="">Selecione</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option><option value="Outro">Outro</option></select></label>
            <label className={label}>Lado de jogo<select className={field} name="padelSide" defaultValue={player.padelSide}><option value="">Ainda não informado</option><option value="RIGHT">Direita</option><option value="LEFT">Esquerda</option><option value="BOTH">Jogo dos dois lados</option></select></label>
            <div className="tw:col-span-full tw:grid tw:min-w-0 tw:gap-1.5"><span id="portal-profile-categories" className="tw:text-xs">Categorias de padel</span><details className="tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)]" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary aria-labelledby="portal-profile-categories portal-profile-category-value" className="tw:min-h-10 tw:cursor-pointer tw:break-words tw:px-3 tw:py-2.5 tw:text-sm tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:focus-visible:outline-[#a5caff]"><span id="portal-profile-category-value">{selectedCategories.length ? selectedCategories.join(" · ") : "Selecionar categorias"}</span></summary><div className="tw:grid tw:max-h-64 tw:grid-cols-1 tw:gap-1 tw:overflow-y-auto tw:border-t tw:border-[var(--portal-line)] tw:p-2" role="group" aria-label="Categorias de padel">{categoryOptions.map(category => <label key={category} className="tw:flex tw:min-h-9 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded tw:px-2 tw:text-sm"><input type="checkbox" name="padelCategory" value={category} checked={selectedCategories.includes(category)} onChange={event => setSelectedCategories(current => event.target.checked ? [...current, category] : current.filter(item => item !== category))} className="tw:size-4 tw:shrink-0 tw:accent-[#174983]"/><span>{category}</span></label>)}</div></details></div>
          </div>
        </fieldset>
      </div>
      <label className={label}>Bio<textarea className={`${field} tw:min-h-20 tw:resize-y`} name="bio" defaultValue={player.bio} maxLength={800} rows={3}/></label>
      <div className="tw:flex tw:justify-end tw:border-t tw:border-[var(--portal-line)] tw:pt-4"><SubmitButton label="Salvar perfil" pendingLabel="Salvando…" className="tw:inline-flex tw:min-h-9 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:bg-[#087443] tw:px-4 tw:py-2 tw:text-xs tw:font-normal tw:text-white tw:hover:bg-[#065b34] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:disabled:opacity-60 tw:dark:focus-visible:outline-[#a5caff]"/></div>
      {state.error ? <p role="alert" className="tw:m-0 tw:text-sm tw:text-[#a02119] tw:dark:text-[#ffb9ab]">{state.error}</p> : null}
      {state.success ? <p role="status" className="tw:m-0 tw:text-sm tw:text-[#087443] tw:dark:text-[#79d7a8]">{state.success}</p> : null}
    </form>
    <AthleteRecoveryEmailSettings recoveryEmail={player.recoveryEmail} contactEmail={player.email}/>
  </section>;
}

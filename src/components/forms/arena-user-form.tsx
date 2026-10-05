"use client";
import { viewStyles } from "./arena-user-form.utilities";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { inviteArenaUserAction, type AccountAccessState } from "@/lib/actions/account-access";

const initialState: AccountAccessState = {
  error: null,
  success: null
};

export function ArenaUserForm({ profiles }: { profiles: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(inviteArenaUserAction, initialState);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  useEffect(() => {
    setInvitationUrl(state.invitationUrl ? new URL(state.invitationUrl, window.location.origin).href : "");
    setCopyMessage("");
  }, [state]);
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("Selecione o link abaixo e copie manualmente.");
    }
  }

  return (
    <form action={formAction} className={viewStyles.grid_form}>
      <div className={viewStyles.field}>
        <label htmlFor="name">Nome e sobrenome</label>
        <input id="name" name="name" type="text" placeholder="Ex.: Marina Alves" required />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" placeholder="marina@arena.com" required />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="permissionProfileId">Perfil de usuário</label>
        <select id="permissionProfileId" name="permissionProfileId" required defaultValue="">
          <option value="" disabled>Selecione o perfil</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
      </div>

      <div className={viewStyles.field_field_submit}>
        <label className={viewStyles.sr_only} htmlFor="submit-user">
          Criar convite
        </label>
        <SubmitButton label="Criar convite" pendingLabel="Criando..." className={viewStyles.button_button_primary} />
      </div>

      {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? <p role="status" className={viewStyles.form_success_form_full}>{state.success}</p> : null}
      {invitationUrl ? <div className={`${viewStyles.field} tw:col-span-full tw:min-w-0`}>
        <label htmlFor="user-invitation-link">Link de convite</label>
        <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:gap-2">
          <input id="user-invitation-link" className="tw:min-w-0 tw:flex-1 tw:basis-60" type="text" readOnly value={invitationUrl} onFocus={event => event.currentTarget.select()} />
          <button type="button" className={viewStyles.button_button_primary} onClick={copyInvite}>Copiar link</button>
        </div>
        {copyMessage ? <p role="status" className="tw:m-0 tw:text-sm">{copyMessage}</p> : null}
      </div> : null}
    </form>
  );
}

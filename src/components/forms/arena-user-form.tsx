"use client";
import { viewStyles } from "./arena-user-form.utilities";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { inviteArenaUserAction, type AccountAccessState } from "@/lib/actions/account-access";

const initialState: AccountAccessState = {
  error: null,
  success: null
};

export function ArenaUserForm({ profiles }: { profiles: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(inviteArenaUserAction, initialState);

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
          Enviar convite
        </label>
        <SubmitButton label="Enviar convite" pendingLabel="Enviando..." className={viewStyles.button_button_primary} />
      </div>

      {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}
    </form>
  );
}

"use client";
import { viewStyles } from "./arena-profile-form.utilities";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateArenaProfileAction } from "@/lib/actions/arena";
import type { ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

type ArenaProfileFormProps = {
  arena: {
    name: string;
    legalName: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
};

export function ArenaProfileForm({ arena }: ArenaProfileFormProps) {
  const [state, formAction] = useFormState(updateArenaProfileAction, initialState);

  return (
    <form action={formAction} className={viewStyles.grid_form_arena_profile_form}>
      <div className={viewStyles.field}>
        <label htmlFor="arena-name">Nome da arena</label>
        <input id="arena-name" name="name" type="text" defaultValue={arena.name} required />
      </div>
      <div className={viewStyles.field}>
        <label htmlFor="arena-legal-name">Razão social</label>
        <input id="arena-legal-name" name="legalName" type="text" defaultValue={arena.legalName} />
      </div>
      <div className={viewStyles.field}>
        <label htmlFor="arena-cnpj">CNPJ</label>
        <input id="arena-cnpj" name="cnpj" type="text" defaultValue={arena.cnpj} />
      </div>
      <div className={viewStyles.field}>
        <label htmlFor="arena-phone">Telefone</label>
        <input id="arena-phone" name="phone" type="text" defaultValue={arena.phone} />
      </div>
      <div className={viewStyles.field}>
        <label htmlFor="arena-email">E-mail</label>
        <input id="arena-email" name="email" type="email" defaultValue={arena.email} />
      </div>
      <div className={viewStyles.field_form_full}>
        <label htmlFor="arena-address">Endereço</label>
        <input id="arena-address" name="address" type="text" defaultValue={arena.address} />
      </div>
      <div className={viewStyles.field}>
        <label htmlFor="arena-city">Cidade</label>
        <input id="arena-city" name="city" type="text" defaultValue={arena.city} />
      </div>
      <div className={viewStyles.field}>
        <label htmlFor="arena-state">Estado</label>
        <input id="arena-state" name="state" type="text" defaultValue={arena.state} />
      </div>
      <div className={viewStyles.field}>
        <label htmlFor="arena-zip-code">CEP</label>
        <input id="arena-zip-code" name="zipCode" type="text" defaultValue={arena.zipCode} />
      </div>
      <div className={viewStyles.field}>
        <label htmlFor="arena-logo">Logo</label>
        <input id="arena-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
      </div>

      <div className={viewStyles.field_field_submit}>
        <SubmitButton label="Salvar arena" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
      </div>

      {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}
    </form>
  );
}

"use client";
import { ClientIdentityFields } from "./client-identity-fields";
import { PhoneInput } from "./phone-input";
import { ClientComandaPermission } from "./client-comanda-permission";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";

import { viewStyles } from "./player-form.utilities";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createPlayerAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = {
  error: null,
  success: null
};

export function PlayerForm({ guardians = [] }: { guardians?: { id:string; name:string }[] }) {
  const [state, formAction] = useFormState(createPlayerAction, initialState);

  return (
    <form action={formAction} className={viewStyles.grid_form_client_create_form}>
      {guardians.length ? <label className={viewStyles.field}>Responsável financeiro (opcional)<SmartEntitySelect createKind="client" label="Cliente" name="guardianId" defaultValue=""><option value="">Cadastro independente</option>{guardians.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</SmartEntitySelect></label> : null}
      <ClientIdentityFields fieldClassName={viewStyles.field}/>

      <input name="points" type="hidden" value="1000" />

      <div className={viewStyles.field}>
        <label htmlFor="class">Classe</label>
        <input id="class" name="class" type="text" placeholder="Ex.: B" />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="gender">Gênero</label>
        <select id="gender" name="gender" defaultValue="">
          <option value="">Não informar</option>
          <option value="Feminino">Feminino</option>
          <option value="Masculino">Masculino</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="phone">Telefone</label>
        <PhoneInput id="phone" name="phone" required />
      </div>

      <div className={viewStyles.field}>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" />
      </div>



      <div className={viewStyles.field}>
        <label htmlFor="birthDate">Nascimento</label>
        <input id="birthDate" name="birthDate" type="date" />
      </div>

      <div className={viewStyles.field_form_full}><label htmlFor="addressStreet">Endereço para boleto</label><input id="addressStreet" name="addressStreet" placeholder="Rua / avenida" /></div>
      <div className={viewStyles.field}><label htmlFor="addressNumber">Número</label><input id="addressNumber" name="addressNumber" placeholder="Ex.: 120 ou S/N" /></div>
      <div className={viewStyles.field}><label htmlFor="addressNeighborhood">Bairro</label><input id="addressNeighborhood" name="addressNeighborhood" /></div>
      <div className={viewStyles.field}><label htmlFor="addressZipCode">CEP</label><input id="addressZipCode" name="addressZipCode" inputMode="numeric" /></div>
      <div className={viewStyles.field}><label htmlFor="addressCity">Cidade</label><input id="addressCity" name="addressCity" /></div>
      <div className={viewStyles.field}><label htmlFor="addressState">UF</label><input id="addressState" name="addressState" maxLength={2} placeholder="SP" /></div>

      <div className={viewStyles.field_form_full}>
        <label htmlFor="photo">Foto do atleta</label>
        <input id="photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp" />
      </div>

      <label className={viewStyles.control_toggle}>
        <input name="isTeacher" type="checkbox" />
        <span aria-hidden="true" />
        <em>É professor</em>
      </label>

      <ClientComandaPermission/>
      <div className={viewStyles.field_field_submit}>
        <label className={viewStyles.sr_only} htmlFor="submit-player">
          Cadastrar atleta
        </label>
        <SubmitButton label="Cadastrar atleta" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
      </div>

      {state?.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}
      {state?.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}
    </form>
  );
}

"use client";
import { ClientIdentityFields } from "./client-identity-fields";
import { PhoneInput } from "./phone-input";
import { ClientComandaPermission } from "./client-comanda-permission";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { viewStyles } from "./player-form.utilities";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { createPlayerAction, type ActionState } from "@/lib/actions/tournament";
const initialState: ActionState = { error: null, success: null };
export function PlayerForm({ guardians = [], onCancel }: { guardians?: { id:string; name:string }[]; onCancel?:()=>void }) {
  const [state, formAction] = useFormState(createPlayerAction, initialState);
  return <form action={formAction} className={viewStyles.form}>
    <div className={viewStyles.body}>
      <div className={viewStyles.fields}>
        {guardians.length ? <label className={viewStyles.field}>Responsável financeiro (opcional)<SmartEntitySelect createKind="client" label="Cliente" name="guardianId" defaultValue=""><option value="">Cadastro independente</option>{guardians.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</SmartEntitySelect></label> : null}
        <ClientIdentityFields fieldClassName={viewStyles.field} nameClassName="tw:col-span-2 tw:row-start-2 tw:viewport-700:col-span-1 tw:viewport-700:row-auto" documentClassName="tw:col-start-3 tw:row-start-2 tw:viewport-700:col-auto tw:viewport-700:row-auto"/>
        <input name="points" type="hidden" value="1000" />
        <label className={`${viewStyles.field} tw:row-start-3 tw:col-start-1 tw:viewport-700:row-auto tw:viewport-700:col-auto`}>Telefone<PhoneInput name="phone" required /></label>
        <label className={`${viewStyles.field} tw:row-start-3 tw:col-start-2 tw:viewport-700:row-auto tw:viewport-700:col-auto`}>E-mail<input name="email" type="email" autoComplete="email" /></label>
        <label className={`${viewStyles.field} tw:row-start-3 tw:col-start-3 tw:viewport-700:row-auto tw:viewport-700:col-auto`}>Nascimento<input name="birthDate" type="date" /></label>
        <label className={`${viewStyles.field} tw:row-start-4 tw:col-start-1 tw:viewport-700:row-auto tw:viewport-700:col-auto`}>Gênero<select name="gender" defaultValue=""><option value="">Não informar</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option><option value="Outro">Outro</option></select></label>
        <label className={`${viewStyles.field} tw:row-start-4 tw:col-start-2 tw:viewport-700:row-auto tw:viewport-700:col-auto`}>Classe<input name="class" type="text" placeholder="Ex.: B" /></label>
      </div>
      <fieldset className={viewStyles.group}><legend className={viewStyles.legend}>Endereço</legend><div className={viewStyles.fields}>
        <label className={`${viewStyles.field} tw:col-span-2 tw:viewport-700:col-span-1`}>Endereço para boleto<input name="addressStreet" placeholder="Rua / avenida" autoComplete="street-address" /></label>
        <label className={viewStyles.field}>Número<input name="addressNumber" placeholder="Ex.: 120 ou S/N" /></label>
        <label className={viewStyles.field}>Bairro<input name="addressNeighborhood" /></label>
        <label className={viewStyles.field}>CEP<input name="addressZipCode" inputMode="numeric" autoComplete="postal-code" /></label>
        <label className={viewStyles.field}>Cidade<input name="addressCity" autoComplete="address-level2" /></label>
        <label className={viewStyles.field}>UF<input name="addressState" maxLength={2} placeholder="PR" autoComplete="address-level1" /></label>
      </div></fieldset>
      <div className={viewStyles.permissions}>
        <ClientComandaPermission/>
        <label className="tw:flex tw:w-fit tw:items-center tw:gap-2 tw:text-sm"><input name="isTeacher" type="checkbox" className="tw:size-4 tw:accent-[#1e5ea8]"/>É professor</label>
        <label className={viewStyles.field}>Foto do atleta<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" /></label>
      </div>
      {state?.error ? <p role="alert" className={viewStyles.error}>{state.error}</p> : null}
      {state?.success ? <p role="status" className={viewStyles.success}>{state.success}</p> : null}
    </div>
    <footer className={viewStyles.footer}>{onCancel?<button type="button" className={viewStyles.secondary} onClick={onCancel}>Cancelar</button>:null}<SubmitButton label="Cadastrar cliente" pendingLabel="Salvando..." className={viewStyles.primary}/></footer>
  </form>;
}

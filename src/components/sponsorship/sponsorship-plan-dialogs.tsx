"use client";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { PlanDueOptions } from "./plan-due-options";
import { viewStyles } from "./sponsorship-plan-dialogs.utilities";

import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";

import { Modal } from "@/components/ui/modal";

type Action = (formData: FormData) => Promise<unknown>;

const planTypes = ["Mensal", "Evento", "Liga", "Permuta"];

function Dialog({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  const closeRef = useRef(close);
  closeRef.current = close;
  const onClose = useCallback(() => closeRef.current(), []);
  return <Modal open title={title} onClose={onClose} width="tw:max-w-[640px]" tone="management">{children}</Modal>;
}

export function CreateSponsorshipPlanButton({ action, courts = [] }: { action: Action; courts?: { id:string; name:string }[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("SPONSORSHIP");
  return <>
    <button type="button" className={viewStyles.button_button_primary} onClick={() => setOpen(true)}>Criar plano</button>
    {open ? <Dialog title="Criar plano" close={() => setOpen(false)}>
      <SafeActionForm action={action} className={viewStyles.grid_form_sponsorship_dialog_form} resetOnSuccess successMessage="Plano criado." onSuccess={() => setOpen(false)}>
        <label className={viewStyles.field}>Finalidade<select name="kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="SPONSORSHIP">Patrocínio</option><option value="FIXED_COURT">Reserva fixa de quadra</option></select></label>
        <PlanDueOptions/>
        {kind === "FIXED_COURT" ? <label className={viewStyles.field}>Créditos de reserva por ciclo<input name="reservationCredits" type="number" min="1" max="99" defaultValue="4" required/><small>Quantidade liberada após o pagamento mensal.</small></label> : null}
        {kind==="FIXED_COURT" ? <label className="tw:col-span-full tw:flex tw:items-center tw:gap-2 tw:text-xs"><input name="prorateFifthWeek" type="checkbox"/>Calcular proporcional em meses com cinco semanas<small className="tw:text-[var(--muted)]">Base mensal: quatro semanas.</small></label> : null}
        <label className={viewStyles.field}>Nome do plano<input name="name" required placeholder={kind==="FIXED_COURT"?"Ex.: Quadra semanal":"Ex.: Patrocinador ouro"} /></label>
        {kind==="SPONSORSHIP"?<label className={viewStyles.field}>Tipo<select name="sponsorshipType" defaultValue="Mensal">{planTypes.map((type) => <option key={type}>{type}</option>)}</select></label>:<input type="hidden" name="sponsorshipType" value="Mensal"/>}
        <label className={viewStyles.field}>Valor mensal<CurrencyInput name="monthlyAmount" defaultValue="0,00" required /></label>
        {kind==="SPONSORSHIP" ? <fieldset className={viewStyles.sponsor_benefit_options_form_full}><legend>Saldo gerado a cada ciclo</legend><label>Reservas<input name="reservationCredits" type="number" min="0" defaultValue="0" /></label><label>Aulas<input name="lessonCredits" type="number" min="0" defaultValue="0" /></label></fieldset> : null}
        <footer className={viewStyles.sponsorship_dialog_actions_form_full}><button type="button" className={viewStyles.button} onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Salvar plano" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></footer>
      </SafeActionForm>
    </Dialog> : null}
  </>;
}

export function AddSponsorToPlanButton({ action, planId, clients = [], monthlyAmount = "0,00", dueDay = 10, banks=[], methods=["PIX","Dinheiro","Cartão de débito","Cartão de crédito","Boleto"] }: { banks?:{id:string;name:string}[];methods?:string[];action: Action; planId: string; clients?: { id: string; name: string; phone: string }[]; monthlyAmount?: string; dueDay?: number }) {
  const [open, setOpen] = useState(false);
  const [paymentMethod,setPaymentMethod]=useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const matchingClients = useMemo(() => clientQuery.trim() ? clients.filter((client) => `${client.name} ${client.phone}`.toLocaleLowerCase("pt-BR").includes(clientQuery.toLocaleLowerCase("pt-BR"))).slice(0, 8) : [], [clientQuery, clients]);
  return <>
    <button type="button" className={viewStyles.button_button_primary_button_small} onClick={() => setOpen(true)}>Inserir empresa</button>
    {open ? <Dialog title="Inserir empresa" close={() => setOpen(false)}>
      <SafeActionForm action={action} className={viewStyles.grid_form_sponsorship_dialog_form} resetOnSuccess successMessage="Empresa inserida e lançamentos a receber gerados." onSuccess={() => setOpen(false)}>
        <input type="hidden" name="sponsorshipPlanId" value={planId} />
        <label className={viewStyles.field_form_full}>Empresa<input name="name" required placeholder="Nome da empresa" autoFocus /></label>
        <label className={viewStyles.field_form_full}>Cliente vinculado<SmartEntitySelect name="clientId" createKind="client" label="Cliente vinculado" value={clientId} onChange={e=>setClientId(e.target.value)} required={paymentMethod.toLowerCase()==="boleto"}><option value="">Sem cliente vinculado</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name}</option>)}</SmartEntitySelect></label>
        <label className={viewStyles.field}>Forma de pagamento<select name="paymentMethod" required value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="">Selecione</option>{[...new Set([...methods,"Boleto"])].map(name=><option key={name}>{name}</option>)}</select></label>{paymentMethod.toLowerCase()==="boleto"?<label className={viewStyles.field}>Conta do boleto<select name="bankAccountId" required><option value="">Selecione</option>{banks.map(bank=><option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></label>:null}
        <label className={viewStyles.field_form_full}>Logo <small>PNG, JPG ou WebP</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></label>
        <label className={viewStyles.field}>Data de início<input name="startedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label className={viewStyles.field}>Número de parcelas<input name="installments" type="number" min="1" max="60" defaultValue="12" required /></label>
        <label className={viewStyles.field}>Dia de vencimento<input name="dueDay" type="number" min="1" max="28" defaultValue={dueDay} required /></label>
        <label className={viewStyles.field}>Valor mensal<CurrencyInput name="monthlyAmount" defaultValue={monthlyAmount} required /></label>
        <label className={viewStyles.field}>Desconto<input name="discount" inputMode="decimal" defaultValue="0" /></label>
        <label className={viewStyles.field}>Desconto em<select name="discountMode" defaultValue="AMOUNT"><option value="AMOUNT">R$</option><option value="PERCENTAGE">%</option></select></label>
        <label className={viewStyles.field_form_full}>Aplicar desconto<select name="discountApplication" defaultValue="ONE_TIME"><option value="ONE_TIME">Primeira mensalidade</option><option value="RECURRING">Todas as mensalidades</option></select></label>
        <footer className={viewStyles.sponsorship_dialog_actions_form_full}><button type="button" className={viewStyles.button} onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Adicionar empresa" pendingLabel="Adicionando..." className={viewStyles.button_button_primary} /></footer>
      </SafeActionForm>
    </Dialog> : null}
  </>;
}

export function EditSponsorButton({ action, sponsor, plan }: { action: Action; sponsor: { id: string; name: string; logoUrl: string; displayOrder: number }; plan: { name: string; sponsorshipType: string; monthlyAmount: string; reservationCredits: number; lessonCredits: number } }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={viewStyles.button_button_small} onClick={() => setOpen(true)}>Editar</button>
    {open ? <Dialog title="Editar empresa" close={() => setOpen(false)}><SafeActionForm action={action} className={viewStyles.grid_form_sponsorship_dialog_form} successMessage="Empresa atualizada." onSuccess={() => setOpen(false)}>
      <input type="hidden" name="sponsorId" value={sponsor.id} /><input type="hidden" name="subtitle" value={plan.name} /><input type="hidden" name="sponsorshipType" value={plan.sponsorshipType} /><input type="hidden" name="monthlyAmount" value={plan.monthlyAmount} /><input type="hidden" name="reservationCredits" value={plan.reservationCredits} /><input type="hidden" name="lessonCredits" value={plan.lessonCredits} /><input type="hidden" name="displayOrder" value={sponsor.displayOrder} />
      <label className={viewStyles.field_form_full}>Nome da empresa<input name="name" defaultValue={sponsor.name} required /></label><label className={viewStyles.field_form_full}>Nova logo <small>Deixe vazio para manter a atual.</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></label><footer className={viewStyles.sponsorship_dialog_actions_form_full}><button type="button" className={viewStyles.button} onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Salvar empresa" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></footer>
    </SafeActionForm></Dialog> : null}
  </>;
}

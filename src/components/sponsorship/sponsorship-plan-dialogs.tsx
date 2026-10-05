"use client";
import { viewStyles } from "./sponsorship-plan-dialogs.utilities";

import { useMemo, useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";

type Action = (formData: FormData) => Promise<unknown>;

const planTypes = ["Mensal", "Evento", "Liga", "Permuta"];

function Dialog({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  return <div className={viewStyles.sponsorship_dialog_backdrop} onMouseDown={close}>
    <section className={viewStyles.sponsorship_dialog} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
      <header><h2>{title}</h2><button type="button" className={viewStyles.button_button_small} onClick={close}>Fechar</button></header>
      {children}
    </section>
  </div>;
}

export function CreateSponsorshipPlanButton({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={viewStyles.button_button_primary} onClick={() => setOpen(true)}>Criar plano</button>
    {open ? <Dialog title="Criar plano de patrocínio" close={() => setOpen(false)}>
      <SafeActionForm action={action} className={viewStyles.grid_form_sponsorship_dialog_form} resetOnSuccess successMessage="Plano criado." onSuccess={() => setOpen(false)}>
        <label className={viewStyles.field}>Nome do plano<input name="name" required placeholder="Ex.: Patrocinador ouro" /></label>
        <label className={viewStyles.field}>Tipo<select name="sponsorshipType" defaultValue="Mensal">{planTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className={viewStyles.field}>Valor mensal<CurrencyInput name="monthlyAmount" defaultValue="0,00" required /></label>
        <fieldset className={viewStyles.sponsor_benefit_options_form_full}><legend>Saldo gerado a cada ciclo</legend><label>Reservas<input name="reservationCredits" type="number" min="0" defaultValue="0" /></label><label>Aulas<input name="lessonCredits" type="number" min="0" defaultValue="0" /></label></fieldset>
        <footer className={viewStyles.sponsorship_dialog_actions_form_full}><button type="button" className={viewStyles.button} onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Salvar plano" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></footer>
      </SafeActionForm>
    </Dialog> : null}
  </>;
}

export function AddSponsorToPlanButton({ action, planId, clients = [], monthlyAmount = "0,00" }: { action: Action; planId: string; clients?: { id: string; name: string; phone: string }[]; monthlyAmount?: string }) {
  const [open, setOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const matchingClients = useMemo(() => clientQuery.trim() ? clients.filter((client) => `${client.name} ${client.phone}`.toLocaleLowerCase("pt-BR").includes(clientQuery.toLocaleLowerCase("pt-BR"))).slice(0, 8) : [], [clientQuery, clients]);
  return <>
    <button type="button" className={viewStyles.button_button_primary_button_small} onClick={() => setOpen(true)}>Inserir empresa</button>
    {open ? <Dialog title="Inserir empresa no plano" close={() => setOpen(false)}>
      <SafeActionForm action={action} className={viewStyles.grid_form_sponsorship_dialog_form} resetOnSuccess successMessage="Empresa inserida e lançamentos a receber gerados." onSuccess={() => setOpen(false)}>
        <input type="hidden" name="sponsorshipPlanId" value={planId} />
        <label className={viewStyles.field_form_full}>Empresa<input name="name" required placeholder="Nome da empresa" autoFocus /></label>
        <input type="hidden" name="clientId" value={clientId} /><label className={viewStyles.field_form_full_sponsor_client_search}>Cliente vinculado <input value={clientQuery} autoComplete="off" onChange={(event) => { setClientQuery(event.currentTarget.value); setClientId(""); }} placeholder="Digite para pesquisar um cliente" />{clientQuery && !clientId ? <div className={viewStyles.sponsor_client_options}><button type="button" onClick={() => { setClientId(""); setClientQuery(""); }}>Sem cliente vinculado</button>{matchingClients.map((client) => <button type="button" key={client.id} onClick={() => { setClientId(client.id); setClientQuery(client.name); }}><strong>{client.name}</strong><small>{client.phone || "Sem telefone"}</small></button>)}{!matchingClients.length ? <span>Nenhum cliente encontrado.</span> : null}</div> : null}<small>Quando selecionado, o lançamento será emitido no nome do cliente.</small></label>
        <label className={viewStyles.field_form_full}>Logo <small>PNG, JPG, WebP ou SVG</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></label>
        <label className={viewStyles.field}>Data de início<input name="startedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label className={viewStyles.field}>Número de parcelas<input name="installments" type="number" min="1" max="60" defaultValue="12" required /></label>
        <label className={viewStyles.field}>Dia de vencimento<input name="dueDay" type="number" min="1" max="28" defaultValue="10" required /></label>
        <label className={viewStyles.field}>Valor mensal<CurrencyInput name="monthlyAmount" defaultValue={monthlyAmount} required /></label>
        <label className={viewStyles.field}>Desconto<input name="discount" inputMode="decimal" defaultValue="0" /></label>
        <label className={viewStyles.field}>Desconto em<select name="discountMode" defaultValue="AMOUNT"><option value="AMOUNT">R$</option><option value="PERCENTAGE">%</option></select></label>
        <label className={viewStyles.field_form_full}>Aplicar desconto<select name="discountApplication" defaultValue="ONE_TIME"><option value="ONE_TIME">Somente na primeira mensalidade</option><option value="RECURRING">Em todas as mensalidades</option></select></label>
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
      <label className={viewStyles.field_form_full}>Nome da empresa<input name="name" defaultValue={sponsor.name} required /></label><label className={viewStyles.field_form_full}>Nova logo <small>Deixe vazio para manter a atual.</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></label><footer className={viewStyles.sponsorship_dialog_actions_form_full}><button type="button" className={viewStyles.button} onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Salvar empresa" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></footer>
    </SafeActionForm></Dialog> : null}
  </>;
}

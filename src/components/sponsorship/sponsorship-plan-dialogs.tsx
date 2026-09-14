"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";

type Action = (formData: FormData) => Promise<unknown>;

const planTypes = ["Mensal", "Evento", "Liga", "Permuta"];

function Dialog({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  return <div className="sponsorship-dialog-backdrop" onMouseDown={close}>
    <section className="sponsorship-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
      <header><h2>{title}</h2><button type="button" className="button button-small" onClick={close}>Fechar</button></header>
      {children}
    </section>
  </div>;
}

export function CreateSponsorshipPlanButton({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="button button-primary" onClick={() => setOpen(true)}>Criar plano</button>
    {open ? <Dialog title="Criar plano de patrocínio" close={() => setOpen(false)}>
      <SafeActionForm action={action} className="grid-form sponsorship-dialog-form" resetOnSuccess successMessage="Plano criado." onSuccess={() => setOpen(false)}>
        <label className="field">Nome do plano<input name="name" required placeholder="Ex.: Patrocinador ouro" /></label>
        <label className="field">Tipo<select name="sponsorshipType" defaultValue="Mensal">{planTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="field">Valor mensal<CurrencyInput name="monthlyAmount" defaultValue="0,00" required /></label>
        <fieldset className="sponsor-benefit-options form-full"><legend>Saldo gerado a cada ciclo</legend><label>Reservas<input name="reservationCredits" type="number" min="0" defaultValue="0" /></label><label>Aulas<input name="lessonCredits" type="number" min="0" defaultValue="0" /></label></fieldset>
        <footer className="sponsorship-dialog-actions form-full"><button type="button" className="button" onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Salvar plano" pendingLabel="Salvando..." className="button button-primary" /></footer>
      </SafeActionForm>
    </Dialog> : null}
  </>;
}

export function AddSponsorToPlanButton({ action, planId, order }: { action: Action; planId: string; order: number }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="button button-small" onClick={() => setOpen(true)}>Inserir empresa</button>
    {open ? <Dialog title="Inserir empresa no plano" close={() => setOpen(false)}>
      <SafeActionForm action={action} className="grid-form sponsorship-dialog-form" resetOnSuccess successMessage="Empresa adicionada ao plano." onSuccess={() => setOpen(false)}>
        <input type="hidden" name="sponsorshipPlanId" value={planId} /><input type="hidden" name="displayOrder" value={order} /><input type="hidden" name="subtitle" value="" /><input type="hidden" name="sponsorshipType" value="" /><input type="hidden" name="monthlyAmount" value="0" /><input type="hidden" name="reservationCredits" value="0" /><input type="hidden" name="lessonCredits" value="0" />
        <label className="field form-full">Empresa<input name="name" required placeholder="Nome da empresa" autoFocus /></label>
        <label className="field form-full">Logo <small>PNG, JPG, WebP ou SVG</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></label>
        <footer className="sponsorship-dialog-actions form-full"><button type="button" className="button" onClick={() => setOpen(false)}>Cancelar</button><SubmitButton label="Adicionar empresa" pendingLabel="Adicionando..." className="button button-primary" /></footer>
      </SafeActionForm>
    </Dialog> : null}
  </>;
}

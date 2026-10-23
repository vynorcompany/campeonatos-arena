"use client";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { sharedUtilities } from "@/components/ui/shared.utilities";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MoneyInput } from "@/components/forms/money-input";
import { formatMoneyInput } from "@/lib/format-money-input";
import { saveServiceAction } from "@/lib/actions/services";
export type Service = { id: string; name: string; priceCents: number; showOnAgenda: boolean; showOnComandas: boolean };
export function ServiceDialog({ service }: { service?: Service }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <><button className={service ? ui.secondary : ui.primary} type="button" aria-label={service ? `Editar serviço ${service.name}` : "Novo serviço"} onClick={() => setOpen(true)}>{service ? "Editar" : "Novo serviço"}</button>
    <Modal title={service ? "Editar serviço" : "Novo serviço"} open={open} onClose={close} width="tw:max-w-[520px]">
      <SafeActionForm action={saveServiceAction} onSuccess={close} successMessage="Serviço salvo." className="tw:grid tw:min-w-0 tw:gap-3 tw:[&_input:not([type=checkbox])]:h-9! tw:[&_input:not([type=checkbox])]:min-h-9! tw:[&_input]:rounded-md!">
        {service ? <input type="hidden" name="id" value={service.id} /> : null}
        <label className={ui.field}>Nome do serviço<input name="name" required maxLength={120} defaultValue={service?.name} /></label>
        <label className={ui.field}>Valor por atleta (R$)<MoneyInput name="price" required defaultValue={formatMoneyInput(service?.priceCents ?? 0)} /></label>
        <label className={sharedUtilities.controlToggle}><input type="checkbox" name="showOnAgenda" defaultChecked={service?.showOnAgenda ?? true} /><span aria-hidden="true" /><strong>Exibir na grade de horários</strong></label>
        <label className={sharedUtilities.controlToggle}><input type="checkbox" name="showOnComandas" defaultChecked={service?.showOnComandas ?? true} /><span aria-hidden="true" /><strong>Exibir nas comandas</strong></label>
        <footer className="tw:flex tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar serviço" pendingLabel="Salvando…" className={ui.primary} /></footer>
      </SafeActionForm>
    </Modal></>;
}

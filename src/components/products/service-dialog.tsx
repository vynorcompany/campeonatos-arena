"use client";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { ToggleSwitch } from "@/components/forms/toggle-switch";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MoneyInput } from "@/components/forms/money-input";
import { formatMoneyInput } from "@/lib/format-money-input";
import { saveServiceAction, manageServiceAction } from "@/lib/actions/services";
export type Service = { id: string; active?: boolean; serviceHourly?: boolean; name: string; sku?: string; priceCents: number; showOnAgenda: boolean; showOnComandas: boolean; showOnPortalBooking?: boolean; bookingConcurrentLimit?: number };
export function ServiceDialog({ service }: { service?: Service }) {
  const [open, setOpen] = useState(false);
  const [agenda, setAgenda] = useState(service?.showOnAgenda ?? true);
  const [comandas, setComandas] = useState(service?.showOnComandas ?? true);
  const [portal, setPortal] = useState(service?.showOnPortalBooking ?? false);
  const [limit, setLimit] = useState(String(service?.bookingConcurrentLimit ?? 1));
  const [hourly, setHourly] = useState(service?.serviceHourly ?? false);
  const close = useCallback(() => setOpen(false), []);
  return <><button className={service ? ui.secondary : ui.primary} type="button" aria-label={service ? `Editar serviço ${service.name}` : "Novo serviço"} onClick={() => { setAgenda(service?.showOnAgenda ?? true); setComandas(service?.showOnComandas ?? true); setPortal(service?.showOnPortalBooking ?? false); setLimit(String(service?.bookingConcurrentLimit ?? 1)); setHourly(service?.serviceHourly ?? false); setOpen(true); }}>{service ? "Editar" : "Novo serviço"}</button>
    <Modal title={service ? "Editar serviço" : "Novo serviço"} open={open} onClose={close} width="tw:max-w-[620px]" fixedSize>
      <div className="tw:min-h-0 tw:overflow-y-auto tw:space-y-3">{service ? <div className="tw:flex tw:flex-wrap tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3">{([['duplicate', 'Duplicar'], ...(service.sku?.startsWith("ARENA-SERVICE:") ? [] : [[service.active === false ? 'activate' : 'deactivate', service.active === false ? 'Ativar' : 'Inativar'], ['delete', 'Excluir']])] as string[][]).map(([operation, label]) => <SafeActionForm key={operation} action={manageServiceAction} onSuccess={close} successMessage="Serviço atualizado." confirmKeyword={operation === 'delete' ? 'EXCLUIR' : undefined} confirmPrompt={`Excluir ${service.name}?`}><input type="hidden" name="id" value={service.id}/><input type="hidden" name="operation" value={operation}/><SubmitButton label={label} pendingLabel="Aguarde…" className={`${ui.secondary} ${operation === 'delete' ? 'tw:text-red-700!' : ''}`}/></SafeActionForm>)}</div> : null}<SafeActionForm action={saveServiceAction} onSuccess={close} successMessage="Serviço salvo." className="tw:grid tw:min-h-0 tw:min-w-0 tw:content-start tw:overflow-y-auto tw:gap-3 tw:[&_input:not([type=checkbox])]:h-9! tw:[&_input:not([type=checkbox])]:min-h-9! tw:[&_input]:rounded-md!">
        {service ? <input type="hidden" name="id" value={service.id} /> : null}
        <label className={ui.field}>Nome do serviço<input name="name" readOnly={service?.sku?.startsWith("ARENA-SERVICE:")} required maxLength={120} defaultValue={service?.name} /></label>
        <input type="hidden" name="serviceHourly" value={hourly ? "on" : ""}/>{!service?.sku?.startsWith("ARENA-SERVICE:") ? <ToggleSwitch compact label="Cobrar por hora" checked={hourly} onCheckedChange={setHourly}/> : null}
        <label className={ui.field}>{hourly ? "Valor por hora (R$)" : "Valor do serviço (R$)"}<MoneyInput name="price" required defaultValue={formatMoneyInput(service?.priceCents ?? 0)} /></label>
        <section className="tw:grid tw:gap-1 tw:border-y tw:border-[var(--line)] tw:py-2" aria-label="Onde o serviço aparece">
          <input type="hidden" name="showOnAgenda" value={agenda ? "on" : ""}/><ToggleSwitch compact label="Exibir na grade de horários" checked={agenda} onCheckedChange={setAgenda}/>
          <input type="hidden" name="showOnComandas" value={comandas ? "on" : ""}/><ToggleSwitch compact label="Exibir nas comandas" checked={comandas} onCheckedChange={setComandas}/>
          <input type="hidden" name="showOnPortalBooking" value={portal ? "on" : ""}/><ToggleSwitch compact label="Exibir no Portal de Reservas" checked={portal} onCheckedChange={setPortal}/>
        </section>
        {portal ? <label className={ui.field}>Limite de reservas simultâneas<input name="bookingConcurrentLimit" type="number" min="1" max="1000" required value={limit} onChange={event => setLimit(event.currentTarget.value)}/><small>Quantidade disponível para locação no mesmo horário, entre todas as quadras.</small></label> : <input type="hidden" name="bookingConcurrentLimit" value={limit}/>}
        <footer className="tw:flex tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar serviço" pendingLabel="Salvando…" className={ui.primary} /></footer>
      </SafeActionForm></div>
    </Modal></>;
}

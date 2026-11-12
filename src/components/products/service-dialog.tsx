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
import { ServiceAvailabilityFields } from "./service-availability-fields";
import { ActionIcon, actionIconButton } from "@/components/ui/action-icon";
import { ServiceEditorSection } from "./service-editor-section";
import { readServiceBookingRules } from "@/lib/calendar/service-booking-rules";
export type Service = { id: string; active?: boolean; serviceHourly?: boolean; name: string; sku?: string; priceCents: number; showOnAgenda: boolean; showOnComandas: boolean; showOnPortalBooking?: boolean; bookingConcurrentLimit?: number; bookingRules?: unknown };
export function ServiceDialog({ service, courts = [] }: { service?: Service; courts?: { id: string; name: string }[] }) {
  const [rules, setRules] = useState(() => readServiceBookingRules(service?.bookingRules));
  const [open, setOpen] = useState(false);
  const [agenda, setAgenda] = useState(service?.showOnAgenda ?? true);
  const [comandas, setComandas] = useState(service?.showOnComandas ?? true);
  const [portal, setPortal] = useState(service?.showOnPortalBooking ?? false);
  const [limit, setLimit] = useState(String(service?.bookingConcurrentLimit ?? 1));
  const [hourly, setHourly] = useState(service?.serviceHourly ?? false);
  const close = useCallback(() => setOpen(false), []);
  return <><button className={service ? actionIconButton : ui.primary} title={service ? `Editar ${service.name}` : undefined} type="button" aria-label={service ? `Editar serviço ${service.name}` : "Novo serviço"} onClick={() => { setAgenda(service?.showOnAgenda ?? true); setComandas(service?.showOnComandas ?? true); setPortal(service?.showOnPortalBooking ?? false); setLimit(String(service?.bookingConcurrentLimit ?? 1)); setHourly(service?.serviceHourly ?? false); setRules(readServiceBookingRules(service?.bookingRules)); setOpen(true); }}>{service ? <ActionIcon name="edit"/> : "Novo serviço"}</button>
    <Modal title={service ? "Editar serviço" : "Novo serviço"} open={open} onClose={close} width="tw:max-w-[940px]" heightClassName="tw:h-[min(700px,calc(var(--workspace-viewport-height,100dvh)_-_32px))]!" fixedSize tone="management">
      <div className="tw:flex tw:h-full tw:min-h-0 tw:min-w-0 tw:flex-col tw:gap-3">{service ? <details className="tw:shrink-0 tw:text-xs"><summary className="tw:w-fit tw:cursor-pointer tw:text-[#526781]">Ações do serviço</summary><div className="tw:flex tw:flex-wrap tw:gap-2 tw:pt-2">{([['duplicate', 'Duplicar'], ...(service.sku?.startsWith("ARENA-SERVICE:") ? [] : [[service.active === false ? 'activate' : 'deactivate', service.active === false ? 'Ativar' : 'Inativar'], ['delete', 'Excluir']])] as string[][]).map(([operation, label]) => <SafeActionForm key={operation} action={manageServiceAction} onSuccess={close} successMessage="Serviço atualizado." confirmKeyword={operation === 'delete' ? 'EXCLUIR' : undefined} confirmPrompt={`Excluir ${service.name}?`}><input type="hidden" name="id" value={service.id}/><input type="hidden" name="operation" value={operation}/><SubmitButton label={label} pendingLabel="Aguarde…" className={operation === 'delete' ? ui.danger : ui.secondary}/></SafeActionForm>)}</div></details> : null}<SafeActionForm action={saveServiceAction} onSuccess={close} successMessage="Serviço salvo." className="tw:flex tw:flex-1 tw:min-h-0 tw:min-w-0 tw:flex-col tw:gap-3 tw:[&_input:not([type=checkbox])]:h-9! tw:[&_input:not([type=checkbox])]:min-h-9! tw:[&_input]:rounded-md!">
        {service ? <input type="hidden" name="id" value={service.id} /> : null}<div className="tw:grid tw:min-h-0 tw:flex-1 tw:content-start tw:gap-5 tw:overflow-y-auto tw:overscroll-contain tw:pr-1 tw:md:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)]"><div className="tw:grid tw:min-w-0 tw:content-start tw:gap-4"><ServiceEditorSection title="Dados do serviço">
        <label className={ui.field}>Nome do serviço<input name="name" readOnly={service?.sku?.startsWith("ARENA-SERVICE:")} required maxLength={120} defaultValue={service?.name} /></label>
        </ServiceEditorSection><ServiceEditorSection title="Cobrança"><input type="hidden" name="serviceHourly" value={hourly ? "on" : ""}/>{!service?.sku?.startsWith("ARENA-SERVICE:") ? <ToggleSwitch compact label="Cobrar por hora" checked={hourly} onCheckedChange={setHourly}/> : null}
        <label className={`${ui.field} tw:max-w-[240px] tw:[&_input]:font-medium! tw:[&_input]:text-[#087443]!`}>{service?.sku?.startsWith("ARENA-SERVICE:") ? "Valor por atleta (R$)" : hourly ? "Valor por hora (R$)" : "Valor do serviço (R$)"}<MoneyInput name="price" required defaultValue={formatMoneyInput(service?.priceCents ?? 0)} /></label>
        </ServiceEditorSection></div><div className="tw:grid tw:min-w-0 tw:content-start tw:gap-4"><ServiceEditorSection title="Disponibilidade"><section className="tw:grid tw:gap-1 tw:[&>label]:justify-between tw:[&>label]:border-b tw:[&>label]:border-[#e6edf5] tw:[&>label]:py-2" aria-label="Onde o serviço aparece">
          <input type="hidden" name="showOnAgenda" value={agenda ? "on" : ""}/><ToggleSwitch compact label="Exibir na grade de horários" checked={agenda} onCheckedChange={setAgenda}/>
          <input type="hidden" name="showOnComandas" value={comandas ? "on" : ""}/><ToggleSwitch compact label="Exibir nas comandas" checked={comandas} onCheckedChange={setComandas}/>
          <input type="hidden" name="showOnPortalBooking" value={portal ? "on" : ""}/><ToggleSwitch compact label="Exibir no Portal de Reservas" checked={portal} onCheckedChange={setPortal}/>
        </section>
        {portal ? <label className={ui.field}>Limite de reservas simultâneas<input name="bookingConcurrentLimit" type="number" min="1" max="1000" required value={limit} onChange={event => setLimit(event.currentTarget.value)}/><small>Quantidade disponível para locação no mesmo horário, entre todas as quadras.</small></label> : <input type="hidden" name="bookingConcurrentLimit" value={limit}/>}
        <input type="hidden" name="bookingRules" value={JSON.stringify(rules)} />
        </ServiceEditorSection></div>{portal ? <fieldset className="tw:col-span-full tw:m-0 tw:grid tw:min-w-0 tw:items-start tw:gap-3 tw:border-0 tw:border-t tw:border-[#d8e3ef] tw:px-0 tw:pt-3 tw:md:grid-cols-2">
          <legend className="tw:text-sm tw:font-medium">Condições de reserva</legend>
          <label className={ui.field}>Duração mínima com este serviço<select value={rules.minimumMinutes ?? ""} onChange={event => setRules(value => ({ ...value, minimumMinutes: event.target.value ? Number(event.target.value) : null }))}><option value="">Usar durações da quadra</option>{Array.from({ length: 48 }, (_, index) => (index + 1) * 15).map(minutes => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select><small>Permite períodos menores que o mínimo da quadra, respeitando o intervalo da grade.</small></label>
          <div className={ui.field}><span>Quadras permitidas</span><div className="tw:flex tw:flex-wrap tw:gap-3">{courts.map(court => <label key={court.id} className="tw:flex tw:items-center tw:gap-2 tw:text-sm"><input type="checkbox" checked={rules.courtIds.includes(court.id)} onChange={event => setRules(value => ({ ...value, courtIds: event.target.checked ? [...value.courtIds, court.id] : value.courtIds.filter(id => id !== court.id) }))}/>{court.name}</label>)}</div><small>Nenhuma selecionada: todas as quadras.</small></div>
          <div className="tw:min-w-0 tw:md:col-start-2 tw:md:row-span-2 tw:md:row-start-1"><ServiceAvailabilityFields rules={rules} onChange={setRules}/></div>
        </fieldset> : null}
        </div><footer className="tw:mt-auto tw:flex tw:shrink-0 tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar serviço" pendingLabel="Salvando…" className={ui.primary} /></footer>
      </SafeActionForm></div>
    </Modal></>;
}

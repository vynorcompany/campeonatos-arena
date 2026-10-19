import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { updateStandardServicePriceAction } from "@/lib/actions/standard-service-prices";
import { STANDARD_SERVICES, type StandardServicePrices } from "@/lib/calendar/standard-services";
import { sharedUtilities } from "@/components/ui/shared.utilities";

export function StandardServicePriceSettings({ prices, canEdit }: { prices: StandardServicePrices; canEdit: boolean }) {
  return <div className={ui.page}><div className={ui.toolbar}><p>Valores por atleta usados na grade de horários.</p></div>
    <div className={ui.list}><div className={`${ui.head} ${canEdit ? "tw:grid-cols-[minmax(0,1fr)_180px_110px]" : "tw:grid-cols-[minmax(0,1fr)_180px]"}`}><span>Serviço</span><span>Valor por atleta</span>{canEdit ? <span>Ações</span> : null}</div>
      {STANDARD_SERVICES.map((service) => canEdit ? <SafeActionForm key={service.code} action={updateStandardServicePriceAction} successMessage={`Valor de ${service.name} atualizado.`} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_180px_110px] tw:items-end tw:viewport-620:grid-cols-1`}>
        <input type="hidden" name="serviceCode" value={service.code} />
        <div className="tw:min-w-0 tw:self-center"><strong className="tw:text-sm">{service.name}</strong><p className="tw:mt-1 tw:text-xs tw:text-[color:var(--muted)]">{prices[service.code] === undefined ? "Valor ainda não configurado" : "Serviço fixo · por atleta"}</p></div>
        <label className={`${sharedUtilities.field} tw:min-w-0`}>Valor por atleta (R$)<MoneyInput name="price" required aria-label={`Valor de ${service.name}`} defaultValue={prices[service.code] === undefined ? "" : formatMoneyInput(prices[service.code]!)} className="tw:w-full tw:min-w-0" /></label>
        <SubmitButton label="Salvar valor" pendingLabel="Salvando..." className={ui.primary} />
      </SafeActionForm> : <div key={service.code} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_180px] tw:viewport-620:grid-cols-1`}><div className="tw:min-w-0"><strong className="tw:text-sm">{service.name}</strong></div><span className="tw:text-sm">{prices[service.code] === undefined ? "Não configurado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(prices[service.code]! / 100)}</span></div>)}
    </div>
  </div>;
}

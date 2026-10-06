import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { updateStandardServicePriceAction } from "@/lib/actions/standard-service-prices";
import { STANDARD_SERVICES, type StandardServicePrices } from "@/lib/calendar/standard-services";
import { sharedUtilities } from "@/components/ui/shared.utilities";

export function StandardServicePriceSettings({ prices }: { prices: StandardServicePrices }) {
  return <SectionCard title="Serviços padrão" description="Valores por atleta usados na grade de horários. O nome desses serviços é fixo.">
    <div className="tw:grid tw:gap-3">
      {STANDARD_SERVICES.map((service) => <SafeActionForm key={service.code} action={updateStandardServicePriceAction} successMessage={`Valor de ${service.name} atualizado.`} className="tw:grid tw:grid-cols-[minmax(0,1fr)_minmax(100px,180px)_auto] tw:items-end tw:gap-3 tw:viewport-620:grid-cols-1">
        <input type="hidden" name="serviceCode" value={service.code} />
        <div className="tw:min-w-0 tw:self-center"><strong className="tw:text-sm">{service.name}</strong><p className="tw:mt-1 tw:text-xs tw:text-[color:var(--muted)]">{prices[service.code] === undefined ? "Valor ainda não configurado" : "Serviço fixo · por atleta"}</p></div>
        <label className={`${sharedUtilities.field} tw:min-w-0`}>Valor por atleta (R$)<MoneyInput name="price" required aria-label={`Valor de ${service.name}`} defaultValue={prices[service.code] === undefined ? "" : formatMoneyInput(prices[service.code]!)} className="tw:w-full tw:min-w-0" /></label>
        <SubmitButton label="Salvar valor" pendingLabel="Salvando..." className={sharedUtilities.buttonButtonPrimary} />
      </SafeActionForm>)}
    </div>
  </SectionCard>;
}

import { ServiceDialog, type Service } from "./service-dialog";
import type { ReactNode } from "react";
import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MoneyInput } from "@/components/forms/money-input";
import { formatMoneyInput } from "@/lib/format-money-input";
import { updateStandardServicePriceAction } from "@/lib/actions/standard-service-prices";
import { STANDARD_SERVICES, type StandardServicePrices } from "@/lib/calendar/standard-services";
import { sharedUtilities } from "@/components/ui/shared.utilities";

export function StandardServicePriceSettings({ prices, canEdit, children, services = [] }: { services?: Service[]; prices: StandardServicePrices; canEdit: boolean; children?: ReactNode }) {
  return <div className={ui.page}><WorkspaceHeading eyebrow="SERVIÇOS · TABELA DE VALORES" title="Serviços" description="Valores por atleta e disponibilidade na grade e nas comandas.">{children}</WorkspaceHeading>
    <div className={ui.list}><div className={`${ui.head} ${canEdit ? "tw:grid-cols-[minmax(0,1fr)_150px_120px]" : "tw:grid-cols-[minmax(0,1fr)_180px]"}`}><span>Serviço</span><span>Valor por atleta</span>{canEdit ? <span>Ações</span> : null}</div>
      {STANDARD_SERVICES.map((service) => {
        const configured = services.find(item => item.sku === `ARENA-SERVICE:${service.code}`);
        if (configured) return <div key={service.code} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_150px_120px] tw:viewport-620:grid-cols-1`}><div><strong>{service.name}</strong><small>{configured.showOnAgenda ? "Grade" : "Fora da grade"} · {configured.showOnComandas ? "Comandas" : "Fora das comandas"}</small></div><span className="tw:text-sm">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(configured.priceCents / 100)}</span>{canEdit ? <ServiceDialog service={configured} /> : null}</div>;
        return canEdit ? <SafeActionForm key={service.code} action={updateStandardServicePriceAction} successMessage={`Valor de ${service.name} atualizado.`} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_150px_120px] tw:items-center tw:viewport-1120:grid-cols-[minmax(0,1fr)_180px] tw:viewport-1120:[&>button]:col-start-2 tw:viewport-620:grid-cols-1 tw:viewport-620:[&>button]:col-start-1`}>
        <input type="hidden" name="serviceCode" value={service.code} />
        <div className="tw:min-w-0 tw:self-center"><strong className="tw:text-sm">{service.name}</strong><p className="tw:mt-1 tw:text-xs tw:text-[color:var(--muted)]">{prices[service.code] === undefined ? "Valor ainda não configurado" : "Serviço fixo · por atleta"}</p></div>
        <label className={`${ui.field} tw:min-w-0`}>Valor por atleta (R$)<MoneyInput name="price" required aria-label={`Valor de ${service.name}`} defaultValue={prices[service.code] === undefined ? "" : formatMoneyInput(prices[service.code]!)} className="tw:h-9! tw:min-h-9! tw:w-full tw:min-w-0 tw:text-[13px]!" /></label>
        <SubmitButton label="Salvar valor" pendingLabel="Salvando..." className={`${ui.primary} tw:self-end tw:h-9!`} />
      </SafeActionForm> : <div key={service.code} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_180px] tw:viewport-620:grid-cols-1`}><div className="tw:min-w-0"><strong className="tw:text-sm">{service.name}</strong></div><span className="tw:text-sm">{prices[service.code] === undefined ? "Não configurado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(prices[service.code]! / 100)}</span></div>; })}
    </div>
  </div>;
}

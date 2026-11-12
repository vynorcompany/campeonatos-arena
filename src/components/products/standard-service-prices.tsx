import { serviceMatchesSearch } from "@/lib/calendar/service-search";
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
const columns = "tw:grid-cols-[minmax(160px,1fr)_minmax(150px,1fr)_160px_110px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto]";
const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
export function StandardServicePriceSettings({ prices, canEdit, children, services = [], courts = [], query = "" }: { query?: string; courts?: { id: string; name: string }[]; services?: Service[]; prices: StandardServicePrices; canEdit: boolean; children?: ReactNode }) {
  const rows = [
    ...STANDARD_SERVICES.map(standard => ({ name: standard.name, standard, product: services.find(item => item.sku === `ARENA-SERVICE:${standard.code}`) })),
    ...services.filter(service => !service.sku?.startsWith("ARENA-SERVICE:")).map(product => ({ name: product.name, standard: undefined, product })),
  ].filter(row => serviceMatchesSearch(row.name, query)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return <div className={ui.page}>
    <WorkspaceHeading title="Serviços">{children}</WorkspaceHeading>
    <section className={ui.list} aria-label="Lista de serviços">
      <div className={`${ui.head} ${columns}`}><span>Serviço</span><span>Disponibilidade</span><span>Valor / cobrança</span><span className="tw:text-right">Ações</span></div>
      {rows.map(({ name, standard, product }) => {
        if (!product && standard) return canEdit ? <SafeActionForm key={standard.code} action={updateStandardServicePriceAction} successMessage={`Valor de ${name} atualizado.`} className={`${ui.row} ${columns}`}>
          <input type="hidden" name="serviceCode" value={standard.code}/>
          <div><strong>{name}</strong><small>Competição · por atleta</small></div>
          <span className="tw:text-xs tw:text-[#526781]">{prices[standard.code] === undefined ? "Valor não configurado" : "Grade · Comandas"}</span>
          {canEdit ? <><label className={`${ui.field} tw:viewport-760:col-span-full`}>Valor por atleta (R$)<MoneyInput name="price" required aria-label={`Valor de ${name}`} defaultValue={prices[standard.code] === undefined ? "" : formatMoneyInput(prices[standard.code]!)} /></label><div className="tw:flex tw:justify-end tw:viewport-760:col-span-full"><SubmitButton label="Salvar valor" pendingLabel="Salvando..." className={ui.primary}/></div></> : <span className="tw:text-sm">{prices[standard.code] === undefined ? "Não configurado" : currency(prices[standard.code]!)}</span>}
        </SafeActionForm> : <article key={standard.code} className={`${ui.row} ${columns}`}><div><strong>{name}</strong><small>Competição · por atleta</small></div><span className="tw:text-xs">Grade · Comandas</span><span className="tw:text-sm">{prices[standard.code] === undefined ? "Não configurado" : currency(prices[standard.code]!)}</span></article>;
        if (!product) return null;
        return <article key={product.id} className={`${ui.row} ${columns}`}>
          <div><strong>{name}</strong><small>{!product.active ? "Inativo" : standard ? "Competição" : "Serviço"}</small></div>
          <div className="tw:flex tw:flex-wrap tw:gap-1.5 tw:viewport-760:col-span-full tw:viewport-760:row-start-2">{[product.showOnAgenda && "Grade",product.showOnComandas && "Comandas",product.showOnPortalBooking && "Portal"].filter(Boolean).map(label => <span key={String(label)} className="tw:rounded tw:bg-[#eef3f9] tw:px-1.5 tw:py-0.5 tw:text-[11px] tw:text-[#344b65]">{label}</span>)}</div>
          <span className="tw:text-[13px] tw:font-medium tw:tabular-nums tw:viewport-760:col-start-1"><span className="tw:text-[#087443]">{currency(product.priceCents)}</span><small>{standard ? "por atleta" : product.serviceHourly ? "por hora" : "por serviço"}</small></span>
          <div className="tw:flex tw:justify-end tw:viewport-760:col-start-2">{canEdit ? <ServiceDialog service={product} courts={courts}/> : null}</div>
        </article>;
      })}
      {!rows.length ? <p className={ui.empty}>Nenhum serviço encontrado.</p> : null}
    </section>
  </div>;
}

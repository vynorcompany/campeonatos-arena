"use client";
import { InstallmentEditor, defaultInstallmentRows } from "@/components/finance/installment-editor";
import type { CardInstallmentOverride } from "@/lib/finance/card-installments";

export type CommandInstallments = { installmentCount?: number; firstDueDate?: string; installmentUnit?: boolean; installmentRows?: CardInstallmentOverride[] };
export const isCreditCard = (method: string) => /^(cartao de credito|credito|credit_card)$/i.test(method.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

export function CardInstallmentOptions({ payment, totalCents, onChange, onAmountChange }: { payment: CommandInstallments; totalCents: number; onChange: (patch: CommandInstallments) => void; onAmountChange: (cents: number) => void }) {
  return <div className="tw:col-span-full tw:grid tw:min-w-0 tw:gap-2 tw:border-t tw:border-[#d3dfec] tw:pt-2 tw:text-[13px]">
    <label className="tw:flex tw:w-fit tw:items-center tw:gap-2"><input type="checkbox" checked={payment.installmentCount !== undefined} onChange={event => onChange({ installmentRows: undefined, installmentCount: event.target.checked ? 3 : undefined, firstDueDate: event.target.checked ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()) : undefined, installmentUnit: false })}/>Parcelar no cartão</label>
    {payment.installmentCount !== undefined ? <div className="tw:grid tw:min-w-0 tw:gap-3 tw:min-[900px]:grid-cols-[180px_minmax(0,1fr)]">
      <div className="tw:grid tw:grid-cols-1 tw:items-end tw:gap-2 tw:min-[600px]:grid-cols-2 tw:min-[900px]:grid-cols-1 tw:content-start">
        <label className="tw:grid tw:min-w-0 tw:gap-1">Parcelas<input aria-label="Parcelas no cartão" type="number" min="2" max="36" value={payment.installmentCount} onChange={event => { const count = Number(event.target.value); onChange({ installmentRows: undefined, installmentCount: count });  }}/></label>
        <label className="tw:grid tw:min-w-0 tw:gap-1">Primeiro vencimento<input aria-label="Primeiro vencimento do cartão" type="date" value={payment.firstDueDate ?? ""} onChange={event => onChange({ installmentRows: undefined, firstDueDate: event.target.value })}/></label>
      </div>
      <InstallmentEditor totalCents={totalCents} rows={payment.installmentRows ?? defaultInstallmentRows(totalCents,payment.installmentCount,payment.firstDueDate ?? "")} onChange={installmentRows => onChange({installmentRows,installmentUnit:false})}/>
      <small className="tw:col-span-full tw:text-xs tw:leading-relaxed tw:text-[#42536a]">As parcelas dos itens entram em Contas a Receber nos respectivos meses. Reservas e outros débitos devem ser quitados em outra forma.</small>
    </div> : null}
  </div>;
}

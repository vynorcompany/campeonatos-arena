"use client";
import { useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";
import { InstallmentPreview } from "@/components/finance/installment-preview";

export type CommandInstallments = { installmentCount?: number; firstDueDate?: string; installmentUnit?: boolean };
export const isCreditCard = (method: string) => /^(cartao de credito|credito|credit_card)$/i.test(method.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

export function CardInstallmentOptions({ payment, totalCents, onChange, onAmountChange }: { payment: CommandInstallments; totalCents: number; onChange: (patch: CommandInstallments) => void; onAmountChange: (cents: number) => void }) {
  const [unit, setUnit] = useState(0);
  return <div className="tw:col-span-full tw:grid tw:min-w-0 tw:gap-2 tw:border-t tw:border-[#d3dfec] tw:pt-2 tw:text-[13px]">
    <label className="tw:flex tw:w-fit tw:items-center tw:gap-2"><input type="checkbox" checked={payment.installmentCount !== undefined} onChange={event => onChange({ installmentCount: event.target.checked ? 3 : undefined, firstDueDate: event.target.checked ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()) : undefined, installmentUnit: false })}/>Parcelar no cartão</label>
    {payment.installmentCount !== undefined ? <>
      <div className="tw:grid tw:grid-cols-1 tw:items-end tw:gap-2 tw:min-[600px]:grid-cols-2">
        <label className="tw:grid tw:min-w-0 tw:gap-1">Parcelas<input aria-label="Parcelas no cartão" type="number" min="2" max="36" value={payment.installmentCount} onChange={event => { const count = Number(event.target.value); onChange({ installmentCount: count }); if (payment.installmentUnit && Number.isSafeInteger(count)) onAmountChange(unit * count); }}/></label>
        <label className="tw:grid tw:min-w-0 tw:gap-1">Primeiro vencimento<input aria-label="Primeiro vencimento do cartão" type="date" value={payment.firstDueDate ?? ""} onChange={event => onChange({ firstDueDate: event.target.value })}/></label>
      </div>
      <label className="tw:flex tw:w-fit tw:items-center tw:gap-2"><input type="checkbox" checked={Boolean(payment.installmentUnit)} onChange={event => { onChange({ installmentUnit: event.target.checked }); const value = Math.round(totalCents / Math.max(2,payment.installmentCount!)); setUnit(value); if (event.target.checked) onAmountChange(value * payment.installmentCount!); }}/>Informar valor por parcela</label>
      {payment.installmentUnit ? <label className="tw:grid tw:max-w-48 tw:gap-1">Valor da parcela<CurrencyInput aria-label="Valor da parcela no cartão" valueCents={unit} onValueCentsChange={value => { setUnit(value); onAmountChange(value * payment.installmentCount!); }}/></label> : null}
      <InstallmentPreview totalCents={totalCents} count={payment.installmentCount} firstDueDate={payment.firstDueDate ?? ""}/>
      <small className="tw:text-xs tw:leading-relaxed tw:text-[#42536a]">As parcelas dos itens entram em Contas a Receber nos respectivos meses. Reservas e outros débitos devem ser quitados em outra forma.</small>
    </> : null}
  </div>;
}

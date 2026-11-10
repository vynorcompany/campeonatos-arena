"use client";
import { useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";
import { cardInstallmentSchedule, type CardInstallmentOverride } from "@/lib/finance/card-installments";

export function defaultInstallmentRows(total: number, count: number, date: string): CardInstallmentOverride[] {
  try { return cardInstallmentSchedule(total, count, new Date(`${date}T12:00:00Z`)).map(row => ({ amountCents: row.amountCents, dueDate: row.dueDate.toISOString().slice(0, 10) })); }
  catch {
    if (!Number.isSafeInteger(count) || count < 2 || count > 36 || total < 0 || !Number.isSafeInteger(total)) return [];
    const dates = cardInstallmentSchedule(count,count,new Date(`${date || new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date())}T12:00:00Z`));
    return dates.map((row,index)=>({dueDate:row.dueDate.toISOString().slice(0,10),amountCents:Math.floor(total/count)+(index<total%count?1:0)}));
  }
}

export function useInstallmentDraft(total: number, count: number, date: string) {
  const signature = `${total}:${count}:${date}`;
  const [draft, setDraft] = useState<{ signature: string; rows: CardInstallmentOverride[] }>();
  return { rows: draft?.signature === signature ? draft.rows : defaultInstallmentRows(total, count, date), setRows: (rows: CardInstallmentOverride[]) => setDraft({ signature, rows }) };
}

export function InstallmentEditor({ rows, totalCents, onChange, name }: { rows: CardInstallmentOverride[]; totalCents: number; onChange: (rows: CardInstallmentOverride[]) => void; name?: string }) {
  if (!rows.length) return null;
  const difference = totalCents - rows.reduce((sum, row) => sum + row.amountCents, 0);
  const money = (value: number) => (Math.abs(value) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const change = (index: number, patch: Partial<CardInstallmentOverride>) => onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  return <div className="tw:grid tw:min-w-0 tw:gap-2">
    {name ? <input type="hidden" name={name} value={JSON.stringify(rows)}/> : null}
    <div className="tw:grid tw:grid-cols-[2.5rem_minmax(0,1fr)] tw:min-[640px]:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,.85fr)] tw:gap-2 tw:text-xs tw:text-[#42536a]" aria-hidden="true"><span>Nº</span><span><span className="tw:min-[640px]:hidden">Vencimento / valor</span><span className="tw:hidden tw:min-[640px]:inline">Vencimento</span></span><span className="tw:hidden tw:min-[640px]:inline">Valor</span></div>
    <ol aria-label="Parcelas personalizadas" className="tw:m-0 tw:grid tw:max-h-64 tw:list-none tw:gap-2 tw:overflow-y-auto tw:p-0 tw:pr-1">
      {rows.map((row, index) => <li key={index} className="tw:grid tw:min-w-0 tw:grid-cols-[2.5rem_minmax(0,1fr)] tw:min-[640px]:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,.85fr)] tw:items-center tw:gap-2 tw:text-xs tw:tabular-nums">
        <span className="tw:row-span-2 tw:min-[640px]:row-span-1">{index + 1}/{rows.length}</span>
        <input aria-label={`Vencimento da parcela ${index + 1}`} type="date" required value={row.dueDate} onChange={event => change(index, { dueDate: event.target.value })} className="tw:col-start-2 tw:min-[640px]:col-start-auto tw:h-9 tw:w-full tw:min-w-0 tw:rounded tw:border tw:border-[#b8c9dc] tw:bg-white tw:px-2 tw:text-xs tw:text-[#202c3c]"/>
        <CurrencyInput aria-label={`Valor da parcela ${index + 1}`} required valueCents={row.amountCents} onValueCentsChange={value => change(index, { amountCents: value })} className="tw:col-start-2 tw:min-[640px]:col-start-auto tw:h-9 tw:w-full tw:min-w-0 tw:rounded tw:border tw:border-[#b8c9dc] tw:bg-white tw:px-2 tw:text-xs tw:text-[#202c3c]"/>
      </li>)}
    </ol>
    {difference ? <div role="status" className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:text-xs tw:text-[#a52a22]"><span>{difference > 0 ? "Falta distribuir" : "Excede o total em"} {money(difference)}</span>{rows.at(-1)!.amountCents + difference > 0 ? <button type="button" className="tw:cursor-pointer tw:rounded tw:border tw:border-[#b8c9dc] tw:bg-white tw:px-2 tw:py-1 tw:text-[#174983]" onClick={() => change(rows.length - 1, { amountCents: rows.at(-1)!.amountCents + difference })}>Ajustar última parcela</button> : null}</div> : <span className="tw:text-xs tw:text-[#08643d]">Total conferido · {money(totalCents)}</span>}
  </div>;
}

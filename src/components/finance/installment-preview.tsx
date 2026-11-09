import { cardInstallmentSchedule } from "@/lib/finance/card-installments";

export function InstallmentPreview({ totalCents, count, firstDueDate }: { totalCents: number; count: number; firstDueDate: string }) {
  let rows;
  try { rows = cardInstallmentSchedule(totalCents, count, new Date(`${firstDueDate}T12:00:00Z`)); }
  catch { return null; }
  return <ol aria-label="Resumo do parcelamento" className="tw:m-0 tw:grid tw:max-h-40 tw:list-none tw:gap-1 tw:overflow-y-auto tw:rounded-md tw:bg-[#f2f6fa] tw:p-2 tw:text-xs tw:text-[#263d54]">
    {rows.map(row => <li key={row.number} className="tw:grid tw:grid-cols-[3rem_1fr_auto] tw:items-center tw:gap-2 tw:tabular-nums">
      <span>{row.number}/{count}</span>
      <time dateTime={row.dueDate.toISOString().slice(0, 10)} title={row.dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}>{row.dueDate.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })}</time>
      <span>{(row.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
    </li>)}
  </ol>;
}

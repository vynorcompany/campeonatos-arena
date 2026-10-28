"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-finance-entry-list.utilities";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { startPublicFinancialEntryPaymentAction } from "@/lib/actions/public-finance-payment";

type Entry = { id: string; description: string; detail: string; amount: string; amountCents: number; dueDate: string; status: string; urgency: string; paymentUrl?: string | null };
type OpenComanda = { id: string; code: string; amount: string };

export function PublicFinanceEntryList({ arenaSlug, overdue, open, comandas, paymentEnabled = true }: { paymentEnabled?: boolean; arenaSlug: string; overdue: Entry[]; open: Entry[]; comandas: OpenComanda[] }) {
  const entries = useMemo(() => [...overdue, ...open], [overdue, open]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const selectedEntries = useMemo(() => entries.filter((entry) => selected.includes(entry.id)), [entries, selected]);
  const total = selectedEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total / 100);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const pay = () => startTransition(async () => {
    try {
      setMessage("");
      if (selectedEntries.length === 1 && selectedEntries[0]?.paymentUrl) {
        window.location.assign(selectedEntries[0].paymentUrl);
        return;
      }
      const data = new FormData();
      data.set("arenaSlug", arenaSlug);
      selected.forEach((id) => data.append("entryId", id));
      const result = await startPublicFinancialEntryPaymentAction(data);
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível abrir o pagamento.");
    }
  });
  if (!paymentEnabled) return <section className="tw:grid tw:gap-3"><p className="tw:rounded-xl tw:border tw:border-[#c7d1df] tw:bg-[#f5f7fa] tw:p-4 tw:text-sm tw:leading-relaxed tw:text-[#16263d] tw:dark:border-[#384961] tw:dark:bg-[#17273d] tw:dark:text-[#edf2fa]">O pagamento pelo Portal está desativado nesta arena. Para quitar seus lançamentos, procure a recepção.</p>{entries.map(entry => <article key={entry.id} className="tw:flex tw:min-w-0 tw:items-start tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-[#c7d1df] tw:bg-white tw:p-4 tw:text-[#16263d] tw:dark:border-[#384961] tw:dark:bg-[#17273d] tw:dark:text-[#edf2fa]"><div className="tw:min-w-0"><strong className="tw:block tw:break-words tw:text-sm">{entry.description}</strong><small className="tw:mt-1 tw:block tw:text-xs">{entry.status === "overdue" ? "Venceu em" : "Vence em"} {entry.dueDate}</small><p className="tw:mb-0 tw:break-words tw:text-xs tw:leading-relaxed">{entry.detail}</p></div><b className="tw:shrink-0 tw:text-sm">{entry.amount}</b></article>)}{comandas.map(comanda => <Link key={comanda.id} href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=comandas`} className="tw:rounded-xl tw:border tw:border-[#c7d1df] tw:p-4 tw:text-sm tw:text-[#16263d] tw:dark:border-[#384961] tw:dark:text-[#edf2fa]">Comanda {comanda.code} · {comanda.amount}</Link>)}</section>;
  const section = (title: string, items: Entry[], detail: string) => <section className="tw:min-w-0 tw:overflow-hidden tw:rounded-md tw:border tw:border-[#c7d8ec] tw:bg-white tw:dark:border-[#365879] tw:dark:bg-[#102f4b]"><header className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#d7e3f2] tw:bg-[#edf4ff] tw:px-4 tw:py-3 tw:text-[#15385f] tw:dark:border-[#365879] tw:dark:bg-[#173d66] tw:dark:text-[#e4efff]"><h3 className="tw:m-0 tw:text-sm tw:font-semibold">{title}</h3><span className="tw:text-xs">{items.length}</span></header>{items.length ? items.map(entry => <article key={entry.id} className="tw:grid tw:min-w-0 tw:grid-cols-[20px_minmax(0,1fr)_auto] tw:items-start tw:gap-3 tw:border-b tw:border-[#d7e3f2] tw:p-4 tw:last:border-0 tw:dark:border-[#365879]"><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} aria-label={`Selecionar ${entry.description}`} className="tw:mt-1 tw:size-4 tw:accent-[#215da5]"/><div className="tw:min-w-0"><strong className="tw:block tw:break-words tw:text-sm tw:text-[#15385f] tw:dark:text-[#e4efff]">{entry.description}</strong><small className={`tw:mt-1 tw:block tw:text-xs ${entry.status === "overdue" ? "tw:text-red-700 tw:dark:text-red-300" : "tw:text-[#354f70] tw:dark:text-[#c2d5ee]"}`}>{entry.status === "overdue" ? "Venceu em" : "Vence em"} {entry.dueDate}</small><details className="tw:mt-2 tw:text-xs tw:text-[#215da5] tw:dark:text-[#a8ccff]"><summary className="tw:cursor-pointer">Detalhes</summary><p className="tw:mb-0 tw:break-words tw:text-[#354f70] tw:dark:text-[#c2d5ee]">{entry.detail}</p></details></div><b className="tw:shrink-0 tw:text-sm tw:tabular-nums tw:text-[#15385f] tw:dark:text-[#e4efff]">{entry.amount}</b></article>) : <p className="tw:m-0 tw:p-4 tw:text-sm tw:text-[#354f70] tw:dark:text-[#c2d5ee]">Nenhum lançamento.</p>}</section>;
  return <>
    <div className="tw:grid tw:min-w-0 tw:gap-4">{section("Em atraso", overdue, "")}{section("Próximos pagamentos", open, "")}</div>
    {selected.length ? <aside className="tw:fixed tw:bottom-[68px] tw:left-3 tw:right-3 tw:min-[701px]:bottom-6 tw:min-[701px]:left-[calc(240px+2rem)] tw:min-[701px]:right-8 tw:z-30 tw:flex tw:items-center tw:gap-3 tw:rounded-2xl tw:border tw:border-[#2a4161] tw:bg-[#0b1a30] tw:p-3 tw:text-[#eaf3ff] tw:shadow-xl "><div className="tw:min-w-0 tw:flex-1"><small className="tw:block tw:text-[.65rem]">{selected.length} selecionado{selected.length === 1 ? "" : "s"}</small><strong className="tw:text-sm">{money}</strong></div><button type="button" className="tw:shrink-0 tw:rounded-xl tw:bg-[#5b92de] tw:px-3 tw:py-2 tw:text-xs tw:font-semibold tw:text-[#082b34]" data-portal-action disabled={pending} onClick={pay}>{pending ? "Abrindo..." : "Pagar"}</button></aside> : null}
    {message ? <p className={viewStyles.public_finance_payment_error} role="alert">{message}</p> : null}
  </>;
}

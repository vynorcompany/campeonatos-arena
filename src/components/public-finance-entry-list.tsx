"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-finance-entry-list.utilities";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { startPublicFinancialEntryPaymentAction } from "@/lib/actions/public-finance-payment";

type Entry = { id: string; description: string; detail: string; amount: string; amountCents: number; dueDate: string; status: string; urgency: string; paymentUrl?: string | null };
type OpenComanda = { id: string; code: string; amount: string };

export function PublicFinanceEntryList({ arenaSlug, overdue, open, comandas }: { arenaSlug: string; overdue: Entry[]; open: Entry[]; comandas: OpenComanda[] }) {
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
  const section = (title: string, items: Entry[], detail: string) => <section className={viewStyles.client_finance_section}><header><div><span className={viewStyles.client_finance_section_icon} aria-hidden="true">{title === "Para agora" ? "R$" : "◷"}</span><h3>{title}</h3></div><span>{detail}</span></header>{items.length ? items.map((entry) => <article className={`${viewStyles.client_finance_entry_public_finance_entry} is-${entry.status} is-due-${entry.urgency}`} key={entry.id}><label className={viewStyles.public_finance_entry_select}><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} aria-label={`Selecionar ${entry.description}`} /><span /></label><div><strong>{entry.description}</strong><small>{entry.status === "overdue" ? "Venceu em" : "Vence em"} {entry.dueDate}</small><details><summary>Ver cobrança</summary><p>{entry.detail}</p></details></div><b>{entry.amount}</b></article>) : <p className={viewStyles.client_finance_empty}>Nenhum lançamento nesta seção.</p>}</section>;
  const mobileSection = (title: string, items: Entry[], tone: "overdue" | "upcoming") => <section className="tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:dark:border-[#3e8b70] tw:dark:bg-[#104c3b]">
    <header className="tw:mb-3 tw:flex tw:items-center tw:justify-between tw:gap-3"><h3 className="tw:m-0 tw:text-base tw:font-semibold tw:text-[#133047] tw:dark:text-[#eafff3]">{title}</h3><span className={cx("tw:rounded-full tw:px-2 tw:py-1 tw:text-xs tw:font-semibold", tone === "overdue" ? "tw:bg-[#fff0ed] tw:text-[#b42318] tw:dark:bg-[#4a2927] tw:dark:text-[#ff9e8f]" : "tw:bg-[#def2ed] tw:text-[#087b63] tw:dark:bg-[#16483d] tw:dark:text-[#5bdec1]")}>{items.length}</span></header>
    {items.length ? <div className="tw:grid tw:gap-2">{items.map((entry) => <article key={entry.id} className={cx("tw:min-w-0 tw:rounded-xl tw:border tw:p-3", entry.urgency === "overdue" ? "tw:border-[#edb9af] tw:bg-[#fff5f3] tw:dark:border-[#925451] tw:dark:bg-[#442a28]" : entry.urgency === "soon" ? "tw:border-[#e9cf98] tw:bg-[#fff8e9] tw:dark:border-[#8c7045] tw:dark:bg-[#453925]" : "tw:border-[#d8e5e9] tw:bg-[#f5f8f8] tw:dark:border-[#2a6155] tw:dark:bg-[#104138]") }><div className="tw:flex tw:items-start tw:gap-3"><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} aria-label={`Selecionar ${entry.description}`} className="tw:mt-1 tw:size-4 tw:shrink-0 tw:accent-[#078f7c]" /><div className="tw:min-w-0 tw:flex-1"><strong className="tw:block tw:break-words tw:text-sm tw:leading-snug tw:text-[#133047] tw:dark:text-[#eafff3]">{entry.description}</strong><small className="tw:mt-1 tw:block tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">{entry.status === "overdue" ? "Venceu em" : "Vence em"} {entry.dueDate}</small></div><b className="tw:shrink-0 tw:text-right tw:text-sm tw:text-[#133047] tw:dark:text-[#eafff3]">{entry.amount}</b></div><div className="tw:mt-2 tw:ml-7 tw:flex tw:items-center tw:justify-between tw:gap-2"><span className={cx("tw:text-xs tw:font-semibold", entry.urgency === "overdue" ? "tw:text-[#b42318] tw:dark:text-[#ff9e8f]" : entry.urgency === "soon" ? "tw:text-[#a86100] tw:dark:text-[#ffd18a]" : "tw:text-[#087b63] tw:dark:text-[#5bdec1]")}>{entry.urgency === "overdue" ? "Em atraso" : entry.urgency === "soon" ? "Vence em até 3 dias" : "Programado"}</span><details className="tw:min-w-0 tw:text-xs tw:text-[#087b63] tw:dark:text-[#5bdec1]"><summary className="tw:cursor-pointer">Detalhes</summary><p className="tw:mt-2 tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">{entry.detail}</p></details></div></article>)}</div> : <p className="tw:m-0 tw:text-sm tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">Nenhum lançamento.</p>}
  </section>;
  return <>
    <div className="tw:viewport-700:hidden"><p className={viewStyles.public_finance_payment_help}>Selecione um ou mais débitos para quitar. Ao pagar juntos, cada lançamento é baixado individualmente.</p><div className={viewStyles.public_finance_entry_list}>{section("Para agora", overdue, overdue.length ? "Há algo pendente" : "Nenhuma cobrança vencida")}{comandas.length ? <section className={viewStyles.client_finance_section_2}><header><div><span className={viewStyles.client_finance_section_icon} aria-hidden="true">R$</span><h3>Comandas em aberto</h3></div><span>{comandas.length}</span></header><p className={viewStyles.client_finance_comandas_note}>Consumos ainda em andamento. O pagamento é liberado quando a comanda é fechada no balcão.</p>{comandas.map((comanda) => <article className={viewStyles.client_finance_entry_client_finance_comanda} key={comanda.id}><div><strong>Comanda {comanda.code}</strong><small>Consumo em aberto</small></div><b>{comanda.amount}</b><Link href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=comandas`}>Ver comanda</Link></article>)}</section> : null}{section("Próximos pagamentos", open, String(open.length))}</div>{selected.length ? <aside className={viewStyles.public_finance_payment_bar}><div><strong>{selected.length} lançamento{selected.length === 1 ? "" : "s"} selecionado{selected.length === 1 ? "" : "s"}</strong><small>Total para pagamento</small></div><b>{money}</b><button type="button" className={viewStyles.button_button_primary_button_small} disabled={pending} onClick={pay}>{pending ? "Abrindo..." : selected.length === 1 ? "Pagar lançamento" : "Pagar selecionados"}</button></aside> : null}</div>
    <div className="tw:hidden tw:viewport-700:grid tw:gap-3"><p className="tw:m-0 tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">Selecione lançamentos para pagar juntos.</p>{mobileSection("Em atraso", overdue, "overdue")}{comandas.length ? <section className="tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:dark:border-[#3e8b70] tw:dark:bg-[#104c3b]"><h3 className="tw:mt-0 tw:mb-2 tw:text-base tw:font-semibold">Comandas abertas</h3><p className="tw:mt-0 tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">O pagamento fica disponível após o fechamento no balcão.</p>{comandas.map((comanda) => <Link key={comanda.id} href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=comandas`} className="tw:mt-2 tw:flex tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-[#f5f8f8] tw:p-3 tw:text-sm tw:text-[#133047] tw:no-underline tw:dark:border-[#2a6155] tw:dark:bg-[#104138] tw:dark:text-[#eafff3]"><span>Comanda {comanda.code}</span><strong>{comanda.amount}</strong></Link>)}</section> : null}{mobileSection("Próximos pagamentos", open, "upcoming")}{selected.length ? <div className="tw:h-24" /> : null}</div>
    {selected.length ? <aside className="tw:fixed tw:bottom-[68px] tw:left-3 tw:right-3 tw:z-30 tw:hidden tw:items-center tw:gap-3 tw:rounded-2xl tw:border tw:border-[#2a6155] tw:bg-[#0b302a] tw:p-3 tw:text-[#eafff3] tw:shadow-xl tw:viewport-700:flex"><div className="tw:min-w-0 tw:flex-1"><small className="tw:block tw:text-[.65rem]">{selected.length} selecionado{selected.length === 1 ? "" : "s"}</small><strong className="tw:text-sm">{money}</strong></div><button type="button" className="tw:shrink-0 tw:rounded-xl tw:bg-[#5bdec1] tw:px-3 tw:py-2 tw:text-xs tw:font-semibold tw:text-[#082b34]" disabled={pending} onClick={pay}>{pending ? "Abrindo..." : "Pagar"}</button></aside> : null}
    {message ? <p className={viewStyles.public_finance_payment_error} role="alert">{message}</p> : null}
  </>;
}

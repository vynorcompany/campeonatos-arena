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
  const mobileSection = "tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:[background-image:none]! tw:viewport-700:shadow-none! tw:viewport-700:dark:border-[#244759]! tw:viewport-700:dark:bg-[#102f42]! tw:viewport-700:[&_h3]:text-[#133047]! tw:viewport-700:dark:[&_h3]:text-[#eff8f8]!";
  const mobileEntry = "tw:viewport-700:my-1 tw:viewport-700:rounded-xl! tw:viewport-700:border! tw:viewport-700:p-3! tw:viewport-700:[background-image:none]! tw:viewport-700:[&_strong]:whitespace-normal! tw:viewport-700:[&_strong]:text-[#133047]! tw:viewport-700:[&_b]:text-[#133047]! tw:viewport-700:[&_small]:text-[#607e8d]! tw:viewport-700:dark:[&_strong]:text-[#eff8f8]! tw:viewport-700:dark:[&_b]:text-[#eff8f8]! tw:viewport-700:dark:[&_small]:text-[#a1bccb]!";
  const entryTone = (urgency: string) => urgency === "overdue" ? "tw:viewport-700:border-[#edb9af]! tw:viewport-700:bg-[#fff0ed]! tw:viewport-700:dark:border-[#925451]! tw:viewport-700:dark:bg-[#4a2927]!" : urgency === "soon" ? "tw:viewport-700:border-[#e9cf98]! tw:viewport-700:bg-[#fff4de]! tw:viewport-700:dark:border-[#8c7045]! tw:viewport-700:dark:bg-[#493921]!" : "tw:viewport-700:border-[#b9ded0]! tw:viewport-700:bg-[#eff8f4]! tw:viewport-700:dark:border-[#2b6960]! tw:viewport-700:dark:bg-[#144c4e]!";
  const section = (title: string, items: Entry[], detail: string) => <section className={cx(viewStyles.client_finance_section, mobileSection)}><header><div><span className={viewStyles.client_finance_section_icon} aria-hidden="true">{title === "Para agora" ? "R$" : "◷"}</span><h3>{title}</h3></div><span>{detail}</span></header>{items.length ? items.map((entry) => <article className={cx(`${viewStyles.client_finance_entry_public_finance_entry} is-${entry.status} is-due-${entry.urgency}`, mobileEntry, entryTone(entry.urgency))} key={entry.id}><label className={viewStyles.public_finance_entry_select}><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} aria-label={`Selecionar ${entry.description}`} /><span /></label><div><strong>{entry.description}</strong><small>{entry.status === "overdue" ? "Venceu em" : "Vence em"} {entry.dueDate}</small><span className={cx("tw:hidden tw:viewport-700:mt-1 tw:viewport-700:block tw:text-[.7rem] tw:font-semibold", entry.urgency === "overdue" ? "tw:text-[#b42318] tw:dark:text-[#ff9e8f]" : entry.urgency === "soon" ? "tw:text-[#a86100] tw:dark:text-[#ffd18a]" : "tw:text-[#087b63] tw:dark:text-[#5bdec1]")}>{entry.urgency === "overdue" ? "Em atraso" : entry.urgency === "soon" ? "Vence em até 3 dias" : "Programado"}</span><details><summary>Ver cobrança</summary><p>{entry.detail}</p></details></div><b>{entry.amount}</b></article>) : <p className={viewStyles.client_finance_empty}>Nenhum lançamento nesta seção.</p>}</section>;
  return <><p className={cx(viewStyles.public_finance_payment_help, "tw:viewport-700:text-[#607e8d]! tw:viewport-700:dark:text-[#a1bccb]!")}>Selecione um ou mais débitos para quitar. Ao pagar juntos, cada lançamento é baixado individualmente.</p><div className={viewStyles.public_finance_entry_list}>{section("Para agora", overdue, overdue.length ? "Há algo pendente" : "Nenhuma cobrança vencida")}{comandas.length ? <section className={cx(viewStyles.client_finance_section_2, mobileSection)}><header><div><span className={viewStyles.client_finance_section_icon} aria-hidden="true">R$</span><h3>Comandas em aberto</h3></div><span>{comandas.length}</span></header><p className={cx(viewStyles.client_finance_comandas_note, "tw:viewport-700:text-[#607e8d]! tw:viewport-700:dark:text-[#a1bccb]!")}>Consumos ainda em andamento. O pagamento é liberado quando a comanda é fechada no balcão.</p>{comandas.map((comanda) => <article className={cx(viewStyles.client_finance_entry_client_finance_comanda, "tw:viewport-700:[&_strong]:text-[#133047]! tw:viewport-700:[&_b]:text-[#133047]! tw:viewport-700:[&_small]:text-[#607e8d]! tw:viewport-700:dark:[&_strong]:text-[#eff8f8]! tw:viewport-700:dark:[&_b]:text-[#eff8f8]! tw:viewport-700:dark:[&_small]:text-[#a1bccb]!")} key={comanda.id}><div><strong>Comanda {comanda.code}</strong><small>Consumo em aberto</small></div><b>{comanda.amount}</b><Link href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=comandas`}>Ver comanda</Link></article>)}</section> : null}{section("Próximos pagamentos", open, String(open.length))}</div>{selected.length ? <aside className={viewStyles.public_finance_payment_bar}><div><strong>{selected.length} lançamento{selected.length === 1 ? "" : "s"} selecionado{selected.length === 1 ? "" : "s"}</strong><small>Total para pagamento</small></div><b>{money}</b><button type="button" className={viewStyles.button_button_primary_button_small} disabled={pending} onClick={pay}>{pending ? "Abrindo..." : selected.length === 1 ? "Pagar lançamento" : "Pagar selecionados"}</button></aside> : null}{message ? <p className={viewStyles.public_finance_payment_error} role="alert">{message}</p> : null}</>;
}

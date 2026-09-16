"use client";

import { useMemo, useState, useTransition } from "react";
import { startPublicFinancialEntryPaymentAction } from "@/lib/actions/public-finance-payment";

type Entry = { id: string; description: string; detail: string; amount: string; amountCents: number; dueDate: string; status: string; urgency: string; paymentUrl?: string | null };

export function PublicFinanceEntryList({ arenaSlug, overdue, open }: { arenaSlug: string; overdue: Entry[]; open: Entry[] }) {
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
  const section = (title: string, items: Entry[], detail: string) => <section className="client-finance-section"><header><div><span className="client-finance-section-icon">{title === "Para agora" ? "!" : "◷"}</span><h3>{title}</h3></div><span>{detail}</span></header>{items.length ? items.map((entry) => <article className={`client-finance-entry public-finance-entry is-${entry.status} is-due-${entry.urgency}`} key={entry.id}><label className="public-finance-entry-select"><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} aria-label={`Selecionar ${entry.description}`} /><span /></label><div><strong>{entry.description}</strong><small>{entry.status === "overdue" ? "Venceu em" : "Vence em"} {entry.dueDate}</small><details><summary>Ver cobrança</summary><p>{entry.detail}</p></details></div><b>{entry.amount}</b></article>) : <p className="client-finance-empty">Nenhum lançamento nesta seção.</p>}</section>;
  return <><p className="public-finance-payment-help">Selecione um ou mais débitos para quitar. Ao pagar juntos, cada lançamento é baixado individualmente.</p><div className="public-finance-entry-list">{section("Para agora", overdue, overdue.length ? "Há algo pendente" : "Nenhuma pendência")}{section("Próximos pagamentos", open, String(open.length))}</div>{selected.length ? <aside className="public-finance-payment-bar"><div><strong>{selected.length} lançamento{selected.length === 1 ? "" : "s"} selecionado{selected.length === 1 ? "" : "s"}</strong><small>Total para pagamento</small></div><b>{money}</b><button type="button" className="button button-primary button-small" disabled={pending} onClick={pay}>{pending ? "Abrindo..." : selected.length === 1 ? "Pagar lançamento" : "Pagar selecionados"}</button></aside> : null}{message ? <p className="public-finance-payment-error" role="alert">{message}</p> : null}</>;
}

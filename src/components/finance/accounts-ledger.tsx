"use client";

import { useState, useTransition } from "react";
import { createFinancialEntryAction, settleFinancialEntryAction, voidFinancialEntryAction } from "@/lib/actions/finance";

type Account = {
  id: string;
  counterpartyName: string;
  category: string;
  description: string;
  amountCents: number;
  dueDate: string | null;
  status: string;
  voidReason: string;
  balance: { interestCents: number; paidCents: number; outstandingCents: number };
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "Sem vencimento";
}

function makeForm(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

export function AccountsLedger({ title, type, entries, paymentMethods }: { title: string; type: "REVENUE" | "EXPENSE"; entries: Account[]; paymentMethods: string[] }) {
  const [pending, startTransition] = useTransition();
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [paymentEntry, setPaymentEntry] = useState<Account | null>(null);
  const [voidEntry, setVoidEntry] = useState<Account | null>(null);
  const [message, setMessage] = useState("");
  const actionLabel = type === "REVENUE" ? "Receber" : "Pagar";
  const partyLabel = type === "REVENUE" ? "Cliente" : "Fornecedor";

  const run = (operation: () => Promise<void>, close: () => void) => startTransition(async () => {
    try { setMessage(""); await operation(); close(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação."); }
  });

  return <div className="accounts-ledger stack-md">
    <header className="accounts-ledger-header"><div><h1>{title}</h1><p className="muted">Lançamentos em ordem de vencimento.</p></div><button type="button" className="button button-primary" onClick={() => setNewEntryOpen(true)}>Novo lançamento</button></header>
    {message ? <p className="form-message form-message-error">{message}</p> : null}
    <section className="accounts-ledger-list" aria-label={title}>
      <div className="accounts-ledger-columns"><span>Vencimento</span><span>{partyLabel}</span><span>Tipo</span><span>Descrição</span><span>Valor / saldo</span><span>Status</span><span>Ações</span></div>
      {entries.map((entry) => <article className="accounts-ledger-row" key={entry.id}>
        <span>{date(entry.dueDate)}</span><strong>{entry.counterpartyName}</strong><span>{entry.category}</span><span>{entry.description}</span><span><b>{money(entry.amountCents)}</b>{entry.balance.interestCents ? <small>Juros: {money(entry.balance.interestCents)}</small> : null}{entry.status !== "VOIDED" ? <small>Saldo: {money(entry.balance.outstandingCents)}</small> : null}</span><span><em className={`account-status account-status-${entry.status.toLowerCase()}`}>{entry.status === "PAID" ? "Quitada" : entry.status === "VOIDED" ? "Estornada" : "Em aberto"}</em>{entry.voidReason ? <small>{entry.voidReason}</small> : null}</span><span className="accounts-ledger-actions">{entry.status === "PENDING" ? <button type="button" className="button button-small button-primary" onClick={() => setPaymentEntry(entry)}>{actionLabel}</button> : null}{entry.status !== "VOIDED" ? <button type="button" className="button button-small" onClick={() => setVoidEntry(entry)}>Estornar</button> : null}</span>
      </article>)}
      {!entries.length ? <div className="accounts-ledger-empty">Nenhuma conta cadastrada.</div> : null}
    </section>

    {newEntryOpen ? <div className="command-modal-backdrop" onMouseDown={() => setNewEntryOpen(false)} role="presentation"><section className="financial-entry-modal" role="dialog" aria-modal="true" aria-label="Novo lançamento" onMouseDown={(event) => event.stopPropagation()}><header><div><span>NOVO LANÇAMENTO</span><h2>{title}</h2></div><button type="button" className="button button-small" onClick={() => setNewEntryOpen(false)}>Fechar</button></header><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); run(() => createFinancialEntryAction(form), () => setNewEntryOpen(false)); }} className="grid-form"><input type="hidden" name="type" value={type} /><input type="hidden" name="status" value="PENDING" /><label className="field">{partyLabel}<input name="counterpartyName" required /></label><label className="field">Categoria<input name="category" placeholder={type === "REVENUE" ? "Comanda, aula, plano..." : "Aluguel, compra..."} required /></label><label className="field form-full">Descrição<input name="description" required /></label><label className="field">Valor original<input name="amount" inputMode="decimal" placeholder="0,00" required /></label><label className="field">Vencimento<input name="dueDate" type="date" /></label><label className="field form-full">Observações<input name="notes" /></label><footer className="modal-actions form-full"><button type="button" className="button" onClick={() => setNewEntryOpen(false)}>Cancelar</button><button className="button button-primary" disabled={pending}>Salvar lançamento</button></footer></form></section></div> : null}

    {paymentEntry ? <div className="command-modal-backdrop" onMouseDown={() => setPaymentEntry(null)} role="presentation"><section className="financial-entry-modal" role="dialog" aria-modal="true" aria-label={actionLabel} onMouseDown={(event) => event.stopPropagation()}><header><div><span>BAIXA DE CONTA</span><h2>{actionLabel}: {paymentEntry.counterpartyName}</h2></div><button type="button" className="button button-small" onClick={() => setPaymentEntry(null)}>Fechar</button></header><div className="account-payment-summary"><span>Valor original <b>{money(paymentEntry.amountCents)}</b></span><span>Juros já lançados <b>{money(paymentEntry.balance.interestCents)}</b></span><span>Já baixado <b>{money(paymentEntry.balance.paidCents)}</b></span><span>Saldo atual <b>{money(paymentEntry.balance.outstandingCents)}</b></span></div><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", paymentEntry.id); run(() => settleFinancialEntryAction(form), () => setPaymentEntry(null)); }} className="grid-form"><label className="field">Valor desta baixa<input name="amount" inputMode="decimal" placeholder="0,00" required /></label><label className="field">Juros desta baixa<input name="interest" inputMode="decimal" defaultValue="0,00" /></label><label className="field">Forma de pagamento<select name="paymentMethod" defaultValue={paymentMethods[0] ?? "PIX"}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label><label className="field">Data<input name="paidAt" type="date" /></label><label className="field form-full">Observação<input name="notes" /></label><footer className="modal-actions form-full"><button type="button" className="button" onClick={() => setPaymentEntry(null)}>Cancelar</button><button className="button button-success" disabled={pending}>{actionLabel} conta</button></footer></form></section></div> : null}

    {voidEntry ? <div className="command-modal-backdrop" onMouseDown={() => setVoidEntry(null)} role="presentation"><section className="financial-entry-modal financial-entry-modal-small" role="dialog" aria-modal="true" aria-label="Estornar conta" onMouseDown={(event) => event.stopPropagation()}><header><div><span>ESTORNO</span><h2>Estornar conta</h2></div><button type="button" className="button button-small" onClick={() => setVoidEntry(null)}>Fechar</button></header><p>O lançamento será mantido no histórico como estornado.</p><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", voidEntry.id); run(() => voidFinancialEntryAction(form), () => setVoidEntry(null)); }} className="stack-sm"><label className="field">Motivo<input name="reason" required minLength={3} /></label><footer className="modal-actions"><button type="button" className="button" onClick={() => setVoidEntry(null)}>Cancelar</button><button className="button button-danger" disabled={pending}>Confirmar estorno</button></footer></form></section></div> : null}
  </div>;
}

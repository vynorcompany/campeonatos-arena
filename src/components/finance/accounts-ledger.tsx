"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createFinancialEntryAction,
  createFinancialRecurrenceAction,
  settleFinancialEntryAction,
  voidFinancialEntryAction,
} from "@/lib/actions/finance";

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

type Option = { id: string; name: string };

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "Sem vencimento";
}

export function AccountsLedger({
  title,
  type,
  entries,
  paymentMethods,
  filters,
  categories,
  bankAccounts,
  plans,
  products,
  suppliers,
}: {
  title: string;
  type: "REVENUE" | "EXPENSE";
  entries: Account[];
  paymentMethods: string[];
  filters: Record<string, string | boolean | undefined>;
  categories: string[];
  bankAccounts: Option[];
  plans: Option[];
  products: Option[];
  suppliers: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [paymentEntry, setPaymentEntry] = useState<Account | null>(null);
  const [voidEntry, setVoidEntry] = useState<Account | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [message, setMessage] = useState("");

  const actionLabel = type === "REVENUE" ? "Receber" : "Pagar";
  const partyLabel = type === "REVENUE" ? "Cliente" : "Fornecedor";
  const matchingSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.name.toLocaleLowerCase("pt-BR").includes(counterpartyName.toLocaleLowerCase("pt-BR"))).slice(0, 6),
    [counterpartyName, suppliers],
  );
  const hasExactSupplier = suppliers.some((supplier) => supplier.name.toLocaleLowerCase("pt-BR") === counterpartyName.trim().toLocaleLowerCase("pt-BR"));

  const run = (operation: () => Promise<void>, close: () => void) => {
    startTransition(async () => {
      try {
        setMessage("");
        await operation();
        close();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
      }
    });
  };

  return (
    <div className="accounts-ledger stack-md">
      <header className="accounts-ledger-header">
        <div><h1>{title}</h1><p className="muted">Lançamentos em ordem de vencimento.</p></div>
        <button type="button" className="button button-primary" onClick={() => setNewEntryOpen(true)}>Novo lançamento</button>
      </header>

      <form method="get" className="accounts-filters">
        <input name="name" placeholder="Nome" defaultValue={String(filters.name ?? "")} />
        <input name="start" type="date" aria-label="Data inicial" defaultValue={String(filters.start ?? "")} />
        <input name="end" type="date" aria-label="Data final" defaultValue={String(filters.end ?? "")} />
        <select name="status" defaultValue={String(filters.status ?? "")}><option value="">Todos os status</option><option value="PENDING">Em aberto</option><option value="PAID">Quitada</option><option value="VOIDED">Estornada</option></select>
        <select name="paymentMethod" defaultValue={String(filters.paymentMethod ?? "")}><option value="">Forma de pagamento</option>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select>
        <select name="bankAccountId" defaultValue={String(filters.bankAccountId ?? "")}><option value="">Conta bancária</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="category" defaultValue={String(filters.category ?? "")}><option value="">Classificação</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <input name="description" placeholder="Descrição" defaultValue={String(filters.description ?? "")} />
        <select name="productId" defaultValue={String(filters.productId ?? "")}><option value="">Produto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="planId" defaultValue={String(filters.planId ?? "")}><option value="">Plano/pacote</option>{plans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="dateField" defaultValue={String(filters.dateField ?? "dueDate")}><option value="dueDate">Data de vencimento</option><option value="paidAt">Data de pagamento</option></select>
        <label className="control-toggle"><input name="includeEarlier" type="checkbox" value="1" defaultChecked={filters.includeEarlier === true} /><span aria-hidden="true" /><em>Anteriores à data inicial</em></label>
        <label className="control-toggle"><input name="includeVoided" type="checkbox" value="1" defaultChecked={filters.includeVoided === true} /><span aria-hidden="true" /><em>Incluir estornados/deletados</em></label>
        <button className="button button-small">Filtrar</button>
      </form>

      {message ? <p className="form-message form-message-error">{message}</p> : null}
      <section className="accounts-ledger-list" aria-label={title}>
        <div className="accounts-ledger-columns"><span>Vencimento</span><span>{partyLabel}</span><span>Tipo</span><span>Descrição</span><span>Valor / saldo</span><span>Status</span><span>Ações</span></div>
        {entries.map((entry) => (
          <article className="accounts-ledger-row" key={entry.id}>
            <span>{date(entry.dueDate)}</span><strong>{entry.counterpartyName}</strong><span>{entry.category}</span><span>{entry.description}</span>
            <span><b>{money(entry.amountCents)}</b>{entry.balance.interestCents ? <small>Juros: {money(entry.balance.interestCents)}</small> : null}{entry.status !== "VOIDED" ? <small>Saldo: {money(entry.balance.outstandingCents)}</small> : null}</span>
            <span><em className={`account-status account-status-${entry.status.toLowerCase()}`}>{entry.status === "PAID" ? "Quitada" : entry.status === "VOIDED" ? "Estornada" : "Em aberto"}</em>{entry.voidReason ? <small>{entry.voidReason}</small> : null}</span>
            <span className="accounts-ledger-actions">{entry.status === "PENDING" ? <button type="button" className="button button-small button-primary" onClick={() => setPaymentEntry(entry)}>{actionLabel}</button> : null}{entry.status !== "VOIDED" ? <button type="button" className="button button-small" onClick={() => setVoidEntry(entry)}>Estornar</button> : null}</span>
          </article>
        ))}
        {!entries.length ? <div className="accounts-ledger-empty">Nenhuma conta cadastrada.</div> : null}
      </section>

      {newEntryOpen ? (
        <div className="command-modal-backdrop" onMouseDown={() => setNewEntryOpen(false)} role="presentation">
          <section className="financial-entry-modal" role="dialog" aria-modal="true" aria-label="Novo lançamento" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>NOVO LANÇAMENTO</span><h2>{title}</h2></div><button type="button" className="button button-small" onClick={() => setNewEntryOpen(false)}>Fechar</button></header>
            <form onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              run(() => recurring ? createFinancialRecurrenceAction(form) : createFinancialEntryAction(form), () => setNewEntryOpen(false));
            }} className="grid-form">
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="status" value="PENDING" />
              <input type="hidden" name="category" value={category} />
              <label className="field">{partyLabel}<input name="counterpartyName" value={counterpartyName} onChange={(event) => setCounterpartyName(event.target.value)} required /></label>
              {type === "EXPENSE" && counterpartyName.trim() ? <div className="supplier-suggestions form-full">
                {matchingSuppliers.map((supplier) => <button key={supplier.id} type="button" onClick={() => setCounterpartyName(supplier.name)}>{supplier.name}</button>)}
                {!hasExactSupplier ? <button type="button" className="supplier-create" onClick={() => setCounterpartyName(counterpartyName.trim())}>Criar fornecedor: “{counterpartyName.trim()}”</button> : null}
              </div> : null}
              <label className="field">Categoria financeira<button type="button" className="field-select-button" onClick={() => setCategoryModalOpen(true)}>{category || "Selecionar categoria"}</button></label>
              <label className="field form-full">Descrição<input name="description" required /></label>
              <label className="field">Valor original<input name="amount" inputMode="decimal" placeholder="0,00" required /></label>
              <label className="field">Vencimento<input name="dueDate" type="date" /></label>
              <label className="field">Conta bancária<select name="bankAccountId" defaultValue=""><option value="">Não definida</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="field">Plano/pacote<select name="planId" defaultValue=""><option value="">Não vincular</option>{plans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="field">Produto<select name="productId" defaultValue=""><option value="">Não vincular</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              {type === "REVENUE" ? <label className="field form-full recurrence-toggle"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} /> Criar pagamentos recorrentes</label> : null}
              {recurring ? <>
                <label className="field">Periodicidade<select name="frequency" defaultValue="MONTHLY"><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option><option value="ANNUAL">Anual</option></select></label>
                <label className="field">Início<input name="startsAt" type="date" required /></label>
                <label className="field">Encerramento (opcional)<input name="endsAt" type="date" /></label>
              </> : null}
              <label className="field form-full">Observações<input name="notes" /></label>
              <footer className="modal-actions form-full"><button type="button" className="button" onClick={() => setNewEntryOpen(false)}>Cancelar</button><button className="button button-primary" disabled={pending}>{recurring ? "Criar recorrência" : "Salvar lançamento"}</button></footer>
            </form>
          </section>
        </div>
      ) : null}

      {categoryModalOpen ? <div className="command-modal-backdrop" role="presentation" onMouseDown={() => setCategoryModalOpen(false)}><section className="financial-entry-modal financial-entry-modal-small" role="dialog" aria-modal="true" aria-label="Categorias financeiras" onMouseDown={(event) => event.stopPropagation()}><header><div><span>CLASSIFICAÇÃO</span><h2>Categorias financeiras</h2></div><button type="button" className="button button-small" onClick={() => setCategoryModalOpen(false)}>Fechar</button></header><div className="simple-list">{categories.map((item) => <button type="button" className="button" key={item} onClick={() => { setCategory(item); setCategoryModalOpen(false); }}>{item}</button>)}{!categories.length ? <p className="muted">Cadastre categorias financeiras nas configurações.</p> : null}</div></section></div> : null}

      {paymentEntry ? <div className="command-modal-backdrop" onMouseDown={() => setPaymentEntry(null)} role="presentation"><section className="financial-entry-modal" role="dialog" aria-modal="true" aria-label={actionLabel} onMouseDown={(event) => event.stopPropagation()}><header><div><span>BAIXA DE CONTA</span><h2>{actionLabel}: {paymentEntry.counterpartyName}</h2></div><button type="button" className="button button-small" onClick={() => setPaymentEntry(null)}>Fechar</button></header><div className="account-payment-summary"><span>Valor original <b>{money(paymentEntry.amountCents)}</b></span><span>Juros já lançados <b>{money(paymentEntry.balance.interestCents)}</b></span><span>Já baixado <b>{money(paymentEntry.balance.paidCents)}</b></span><span>Saldo atual <b>{money(paymentEntry.balance.outstandingCents)}</b></span></div><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", paymentEntry.id); run(() => settleFinancialEntryAction(form), () => setPaymentEntry(null)); }} className="grid-form"><label className="field">Valor desta baixa<input name="amount" inputMode="decimal" placeholder="0,00" required /></label><label className="field">Juros desta baixa<input name="interest" inputMode="decimal" defaultValue="0,00" /></label><label className="field">Forma de pagamento<select name="paymentMethod" defaultValue={paymentMethods[0] ?? "PIX"}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label><label className="field">Data<input name="paidAt" type="date" /></label><label className="field form-full">Observação<input name="notes" /></label><footer className="modal-actions form-full"><button type="button" className="button" onClick={() => setPaymentEntry(null)}>Cancelar</button><button className="button button-success" disabled={pending}>{actionLabel} conta</button></footer></form></section></div> : null}
      {voidEntry ? <div className="command-modal-backdrop" onMouseDown={() => setVoidEntry(null)} role="presentation"><section className="financial-entry-modal financial-entry-modal-small" role="dialog" aria-modal="true" aria-label="Estornar conta" onMouseDown={(event) => event.stopPropagation()}><header><div><span>ESTORNO</span><h2>Estornar conta</h2></div><button type="button" className="button button-small" onClick={() => setVoidEntry(null)}>Fechar</button></header><p>O lançamento será mantido no histórico como estornado.</p><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", voidEntry.id); run(() => voidFinancialEntryAction(form), () => setVoidEntry(null)); }} className="stack-sm"><label className="field">Motivo<input name="reason" required minLength={3} /></label><footer className="modal-actions"><button type="button" className="button" onClick={() => setVoidEntry(null)}>Cancelar</button><button className="button button-danger" disabled={pending}>Confirmar estorno</button></footer></form></section></div> : null}
    </div>
  );
}

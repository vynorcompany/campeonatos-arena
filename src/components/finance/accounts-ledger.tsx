"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  createFinancialEntryAction,
  createFinancialSettingAction,
  createFinancialRecurrenceAction,
  deleteFinancialEntryAction,
  deleteFinancialEntriesBulkAction,
  generateFinancialEntryOnlineChargeAction,
  settleFinancialEntryAction,
  settleFinancialEntriesBulkAction,
  updateFinancialEntryAction,
  voidFinancialEntryAction,
} from "@/lib/actions/finance";
import { MoneyInput } from "@/components/forms/money-input";

type Account = {
  id: string;
  counterpartyName: string;
  category: string;
  description: string;
  amountCents: number;
  paymentMethod: string;
  bankAccountId: string | null;
  planId: string | null;
  productId: string | null;
  onlineProvider: string;
  onlinePaymentId: string;
  onlinePaymentUrl: string;
  onlinePaymentQrCode: string;
  onlinePaymentMethod: string;
  dueDate: string | null;
  notes: string;
  status: string;
  voidReason: string;
  settlements: Array<{ amountCents: number; interestCents: number; paymentMethod: string; paidAt: string; notes: string }>;
  balance: { interestCents: number; paidCents: number; outstandingCents: number };
};

type Option = { id: string; name: string; phone?: string; teacherId?: string; teacherName?: string; monthlyPriceCents?: number };

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "Sem vencimento";
}

function amountInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function isOverdue(entry: Account) {
  if (entry.status !== "PENDING" || !entry.dueDate) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(`${entry.dueDate}T12:00:00`) < today;
}

function PlanSelectOptions({ plans }: { plans: Option[] }) {
  const groups = new Map<string, { teacherName: string; plans: Option[] }>();
  for (const plan of plans) {
    const key = plan.teacherId || "unassigned";
    const group = groups.get(key) ?? { teacherName: plan.teacherName || "Sem professor vinculado", plans: [] };
    group.plans.push(plan);
    groups.set(key, group);
  }

  return <>{[...groups.entries()].map(([key, group]) => (
    <optgroup key={key} label={`Professor: ${group.teacherName}`}>
      {group.plans.map((plan) => <option key={`${plan.id}-${plan.teacherId || "unassigned"}`} value={plan.id} data-monthly-price-cents={plan.monthlyPriceCents} data-teacher-id={plan.teacherId}>{plan.name}</option>)}
    </optgroup>
  ))}</>;
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
  clients,
  canDeleteEntries,
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
  clients: Option[];
  canDeleteEntries: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [paymentEntry, setPaymentEntry] = useState<Account | null>(null);
  const [onlineCharge, setOnlineCharge] = useState<{ method: string; url: string; code: string } | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Account | null>(null);
  const [voidEntry, setVoidEntry] = useState<Account | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [category, setCategory] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [supplierOptions, setSupplierOptions] = useState(suppliers);
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPlanTeacherId, setSelectedPlanTeacherId] = useState("");
  const [editCounterpartyName, setEditCounterpartyName] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [editClientPickerOpen, setEditClientPickerOpen] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [paid, setPaid] = useState(false);
  const [discount, setDiscount] = useState("");
  const [discountMode, setDiscountMode] = useState<"AMOUNT" | "PERCENTAGE">("AMOUNT");
  const [newEntryAmountCents, setNewEntryAmountCents] = useState<number | undefined>();
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [clientFilter, setClientFilter] = useState(String(filters.name ?? ""));
  const [clientFilterOpen, setClientFilterOpen] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [bulkPaymentOpen, setBulkPaymentOpen] = useState(false);

  const actionLabel = type === "REVENUE" ? "Receber" : "Pagar";
  const partyLabel = type === "REVENUE" ? "Cliente" : "Fornecedor";
  const filterLabel = type === "REVENUE" ? "Cliente" : "Nome";
  const matchingSuppliers = useMemo(
    () => supplierOptions.filter((supplier) => supplier.name.toLocaleLowerCase("pt-BR").includes(counterpartyName.toLocaleLowerCase("pt-BR"))).slice(0, 6),
    [counterpartyName, supplierOptions],
  );
  const hasExactSupplier = supplierOptions.some((supplier) => supplier.name.toLocaleLowerCase("pt-BR") === counterpartyName.trim().toLocaleLowerCase("pt-BR"));
  const matchingClients = useMemo(
    () => clients.filter((client) => client.name.toLocaleLowerCase("pt-BR").includes(counterpartyName.toLocaleLowerCase("pt-BR"))).slice(0, 6),
    [clients, counterpartyName],
  );
  const matchingEditedClients = useMemo(
    () => clients.filter((client) => client.name.toLocaleLowerCase("pt-BR").includes(editCounterpartyName.toLocaleLowerCase("pt-BR"))).slice(0, 6),
    [clients, editCounterpartyName],
  );
  const matchingFilterClients = useMemo(
    () => clients.filter((client) => client.name.toLocaleLowerCase("pt-BR").includes(clientFilter.toLocaleLowerCase("pt-BR"))).slice(0, 6),
    [clientFilter, clients],
  );
  const selectableEntries = entries.filter((entry) => entry.status !== "VOIDED");
  const selectedEntries = entries.filter((entry) => selectedEntryIds.has(entry.id));
  const selectedPendingEntries = selectedEntries.filter((entry) => entry.status === "PENDING" && entry.balance.outstandingCents > 0);
  const listedTotalCents = selectableEntries.reduce((total, entry) => total + entry.amountCents, 0);
  const selectedTotalCents = selectedEntries.filter((entry) => entry.status !== "VOIDED").reduce((total, entry) => total + entry.amountCents, 0);
  const allSelectableEntriesSelected = selectableEntries.length > 0 && selectableEntries.every((entry) => selectedEntryIds.has(entry.id));
  const toggleEntrySelection = (entryId: string) => setSelectedEntryIds((current) => {
    const next = new Set(current);
    if (next.has(entryId)) next.delete(entryId); else next.add(entryId);
    return next;
  });
  const openEntry = (entry: Account) => {
    setEditCounterpartyName(entry.counterpartyName === "Não informado" ? "" : entry.counterpartyName);
    setSelectedEntry(entry);
  };

  const run = (operation: () => Promise<unknown>, close: () => void) => {
    startTransition(async () => {
      try {
        setMessage("");
        const result = await operation();
        if (result && typeof result === "object" && "error" in result && typeof result.error === "string") { setMessage(result.error); return; }
        if (result && typeof result === "object" && "notice" in result && typeof result.notice === "string") setNotice(result.notice);
        close();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
      }
    });
  };
  const generateOnlineCharge = (entry: Account, method: "PIX" | "BOLETO") => {
    startTransition(async () => {
      try {
        setMessage("");
        const form = new FormData(); form.set("entryId", entry.id); form.set("method", method);
        const result = await generateFinancialEntryOnlineChargeAction(form);
        if ("error" in result) { setMessage(result.error ?? "Não foi possível gerar a cobrança."); return; }
        setOnlineCharge(result);
      } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível gerar a cobrança."); }
    });
  };
  const createQuickSetting = (area: "fornecedores" | "categorias-financeiras", name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return;
    const form = new FormData();
    form.set("area", area);
    form.set("name", normalizedName);
    form.set("type", type === "REVENUE" ? "REVENUE" : "EXPENSE");
    startTransition(async () => {
      try {
        setMessage("");
        await createFinancialSettingAction(form);
        if (area === "fornecedores") {
          setSupplierOptions((current) => current.some((item) => item.name.toLocaleLowerCase("pt-BR") === normalizedName.toLocaleLowerCase("pt-BR")) ? current : [...current, { id: `new-${normalizedName}`, name: normalizedName }]);
          setCounterpartyName(normalizedName);
          setMessage("Fornecedor criado e selecionado.");
        } else {
          setCategoryOptions((current) => current.includes(normalizedName) ? current : [...current, normalizedName]);
          setCategory(normalizedName);
          setNewCategoryName("");
          setMessage("Categoria financeira criada e selecionada.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível criar o cadastro.");
      }
    });
  };

  return (
    <div className="accounts-ledger stack-md">
      {onlineCharge ? <div className="command-modal-backdrop" role="presentation" onMouseDown={() => setOnlineCharge(null)}><section className="financial-entry-modal financial-entry-modal-small" role="dialog" aria-modal="true" aria-label="Cobrança online" onMouseDown={(event) => event.stopPropagation()}><header><div><span>COBRANÇA ONLINE</span><h2>{onlineCharge.method === "PIX" ? "PIX gerado" : "Boleto gerado"}</h2></div><button type="button" className="button button-small" onClick={() => setOnlineCharge(null)}>Fechar</button></header>{onlineCharge.code ? <p><strong>Código:</strong> {onlineCharge.code}</p> : null}{onlineCharge.url ? <a className="button button-primary" href={onlineCharge.url} target="_blank" rel="noreferrer">Abrir cobrança</a> : null}</section></div> : null}
      <header className="accounts-ledger-header">
        <div><h1>{title}</h1><p className="muted">Lançamentos em ordem de vencimento.</p></div>
        <button type="button" className="button button-primary" onClick={() => { setMessage(""); setNotice(""); setSelectedClientId(""); setSelectedPlanTeacherId(""); setNewEntryAmountCents(undefined); setNewEntryOpen(true); }}>Novo lançamento</button>
      </header>

      <form method="get" className="accounts-filters">
        {type === "REVENUE" ? <div className="accounts-client-filter"><input name="name" placeholder={filterLabel} aria-label={filterLabel} value={clientFilter} onFocus={() => setClientFilterOpen(true)} onChange={(event) => { setClientFilter(event.target.value); setClientFilterOpen(true); }} />{clientFilterOpen && clientFilter.trim() ? <div className="client-search-panel accounts-client-suggestions" aria-label="Clientes encontrados">{matchingFilterClients.map((client) => <button key={client.id} className="client-search-result" type="button" onClick={() => { setClientFilter(client.name); setClientFilterOpen(false); }}><span className="client-search-avatar">{client.name.slice(0, 1).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.phone || "Sem telefone cadastrado"}</small></span></button>)}{!matchingFilterClients.length ? <span className="client-search-empty">Nenhum cliente encontrado.</span> : null}</div> : null}</div> : <input name="name" placeholder={filterLabel} defaultValue={String(filters.name ?? "")} />}
        <input name="start" type="date" aria-label="Data inicial" defaultValue={String(filters.start ?? "")} />
        <input name="end" type="date" aria-label="Data final" defaultValue={String(filters.end ?? "")} />
        <select name="status" defaultValue={String(filters.status ?? "")}><option value="">Todos os status</option><option value="PENDING">Em aberto</option><option value="PAID">Quitada</option><option value="VOIDED">Estornada</option></select>
        <select name="paymentMethod" defaultValue={String(filters.paymentMethod ?? "")}><option value="">Forma de pagamento</option>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select>
        <select name="bankAccountId" defaultValue={String(filters.bankAccountId ?? "")}><option value="">Conta bancária</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="category" defaultValue={String(filters.category ?? "")}><option value="">Classificação</option>{categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <input name="description" placeholder="Descrição" defaultValue={String(filters.description ?? "")} />
        {type === "REVENUE" ? <><select name="productId" defaultValue={String(filters.productId ?? "")}><option value="">Produto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="planId" defaultValue={String(filters.planId ?? "")}><option value="">Plano/pacote</option><PlanSelectOptions plans={plans} /></select></> : null}
        <select name="dateField" defaultValue={String(filters.dateField ?? "dueDate")}><option value="dueDate">Data de vencimento</option><option value="paidAt">Data de pagamento</option></select>
        <label className="control-toggle"><input name="includeEarlier" type="checkbox" value="1" defaultChecked={filters.includeEarlier === true} /><span aria-hidden="true" /><em>Anteriores à data inicial</em></label>
        <label className="control-toggle"><input name="includeVoided" type="checkbox" value="1" defaultChecked={filters.includeVoided === true} /><span aria-hidden="true" /><em>Incluir estornados/deletados</em></label>
        <button className="button button-primary accounts-filters-submit">Filtrar</button>
      </form>

      <section className="accounts-ledger-totals" aria-label="Totais dos lançamentos">
        <article><span>Total listado</span><strong>{money(listedTotalCents)}</strong><small>{selectableEntries.length} lançamento{selectableEntries.length === 1 ? "" : "s"} ativo{selectableEntries.length === 1 ? "" : "s"}</small></article>
        <article className={selectedEntries.length ? "accounts-ledger-total-selected" : ""}><span>Total selecionado</span><strong>{money(selectedTotalCents)}</strong><small>{selectedEntries.length ? `${selectedEntries.length} lançamento${selectedEntries.length === 1 ? "" : "s"} selecionado${selectedEntries.length === 1 ? "" : "s"}` : "Selecione lançamentos na lista"}</small></article>
      </section>

      {message && !newEntryOpen && !bulkPaymentOpen ? <p className="form-message form-message-error">{message}</p> : null}
      {notice && !newEntryOpen && !bulkPaymentOpen ? <p className="form-success">{notice}</p> : null}
      {selectedEntries.length ? <section className="accounts-bulk-actions" aria-label="Ações em massa"><strong>{selectedEntries.length} lançamento{selectedEntries.length === 1 ? " selecionado" : "s selecionados"}</strong><span>{selectedPendingEntries.length ? `${selectedPendingEntries.length} pendente${selectedPendingEntries.length === 1 ? "" : "s"} para quitar` : "Nenhuma pendência selecionada"}</span>{selectedPendingEntries.length ? <button type="button" className="button button-primary button-small" onClick={() => { setMessage(""); setBulkPaymentOpen(true); }}>Quitar pendentes</button> : null}{canDeleteEntries ? <button type="button" className="button button-danger button-small" onClick={() => { if (!window.confirm(`Excluir ${selectedEntries.length} lançamento(s)? Eles permanecerão registrados para auditoria.`)) return; const form = new FormData(); selectedEntries.forEach((entry) => form.append("entryIds", entry.id)); run(() => deleteFinancialEntriesBulkAction(form), () => setSelectedEntryIds(new Set())); }}>Excluir selecionados</button> : null}<button type="button" className="button button-small" onClick={() => setSelectedEntryIds(new Set())}>Limpar seleção</button></section> : null}
      <section className="accounts-ledger-list" aria-label={title}>
        <div className="accounts-ledger-columns"><span><input type="checkbox" aria-label="Selecionar todos os lançamentos" checked={allSelectableEntriesSelected} onChange={() => setSelectedEntryIds(allSelectableEntriesSelected ? new Set() : new Set(selectableEntries.map((entry) => entry.id)))} /></span><span>Vencimento</span><span>{partyLabel}</span><span>Tipo</span><span>Descrição</span><span>Valor / saldo</span><span>Status</span><span>Ações</span></div>
        {entries.map((entry) => {
          const overdue = isOverdue(entry);
          return (
          <article className={`accounts-ledger-row accounts-ledger-row-clickable${overdue ? " accounts-ledger-row-overdue" : ""}`} key={entry.id} role="button" tabIndex={0} onClick={() => openEntry(entry)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openEntry(entry); }}>
            <span className="accounts-ledger-selection"><input type="checkbox" aria-label={`Selecionar ${entry.description}`} checked={selectedEntryIds.has(entry.id)} disabled={entry.status === "VOIDED"} onClick={(event) => event.stopPropagation()} onChange={() => toggleEntrySelection(entry.id)} /></span><span>{date(entry.dueDate)}</span><strong>{type === "REVENUE" && entry.counterpartyName !== "Não informado" ? <Link href={`/jogadores?q=${encodeURIComponent(entry.counterpartyName)}`} onClick={(event) => event.stopPropagation()}>{entry.counterpartyName}</Link> : entry.counterpartyName}</strong><span>{entry.category}</span><span>{entry.description}</span>
            <span><b>{money(entry.amountCents)}</b>{entry.balance.interestCents ? <small>Juros: {money(entry.balance.interestCents)}</small> : null}{entry.status !== "VOIDED" ? <small>Saldo: {money(entry.balance.outstandingCents)}</small> : null}</span>
            <span><em className={`account-status ${overdue ? "account-status-overdue" : `account-status-${entry.status.toLowerCase()}`}`}>{overdue ? "EM ATRASO" : entry.status === "PAID" ? "Quitada" : entry.status === "VOIDED" ? "Estornada" : "Em aberto"}</em>{entry.onlinePaymentUrl ? <small className="online-charge-status online-charge-issued">{entry.onlinePaymentMethod === "BOLETO" || entry.paymentMethod === "Boleto" ? "Boleto emitido" : "Cobrança online emitida"}</small> : entry.onlinePaymentMethod === "BOLETO" ? <small className="online-charge-status online-charge-pending">Boleto pendente de emissão</small> : null}{entry.voidReason ? <small>{entry.voidReason}</small> : null}</span>
            <span className="accounts-ledger-actions">{entry.status === "PENDING" ? <><button type="button" className="button button-small button-primary" onClick={(event) => { event.stopPropagation(); setPaymentEntry(entry); }}>{actionLabel}</button>{type === "REVENUE" ? <>{entry.onlinePaymentUrl ? <button type="button" className="button button-small" onClick={(event) => { event.stopPropagation(); setOnlineCharge({ method: entry.onlinePaymentQrCode ? "BOLETO" : "PIX", url: entry.onlinePaymentUrl, code: entry.onlinePaymentQrCode }); }}>Ver cobrança</button> : <><button type="button" className="button button-small" disabled={pending} onClick={(event) => { event.stopPropagation(); generateOnlineCharge(entry, "PIX"); }}>Gerar PIX</button><button type="button" className="button button-small" disabled={pending} onClick={(event) => { event.stopPropagation(); generateOnlineCharge(entry, "BOLETO"); }}>{entry.onlinePaymentMethod === "BOLETO" ? "Emitir boleto" : "Gerar boleto"}</button></>}</> : null}</> : null}{entry.status !== "VOIDED" ? <button type="button" className="button button-small" onClick={(event) => { event.stopPropagation(); setVoidEntry(entry); }}>Estornar</button> : null}{canDeleteEntries && entry.status !== "VOIDED" ? <button type="button" className="button button-small button-danger" onClick={(event) => { event.stopPropagation(); if (!window.confirm("Excluir este lançamento? Ele será removido da operação, mas permanecerá registrado para auditoria.")) return; const form = new FormData(); form.set("entryId", entry.id); run(() => deleteFinancialEntryAction(form), () => {}); }}>Excluir</button> : null}</span>
          </article>
          );
        })}
        {!entries.length ? <div className="accounts-ledger-empty">Nenhuma conta cadastrada.</div> : null}
      </section>

      {newEntryOpen ? (
        <div className="command-modal-backdrop" onMouseDown={() => setNewEntryOpen(false)} role="presentation">
          <section className="financial-entry-modal" role="dialog" aria-modal="true" aria-label="Novo lançamento" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>NOVO LANÇAMENTO</span><h2>{title}</h2></div><button type="button" className="button button-small" onClick={() => setNewEntryOpen(false)}>Fechar</button></header>
            {message && !message.startsWith("Dados incompletos do cliente:") ? <p className="form-message form-message-error" role="alert">{message}</p> : null}
            <form onSubmit={(event) => {
              event.preventDefault();
              if (!category) { setMessage("Selecione uma categoria financeira."); return; }
              const form = new FormData(event.currentTarget);
              run(() => recurring ? createFinancialRecurrenceAction(form) : createFinancialEntryAction(form), () => setNewEntryOpen(false));
            }} className="grid-form">
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="status" value={paid && !recurring ? "PAID" : "PENDING"} />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="clientId" value={selectedClientId} />
              <input type="hidden" name="teacherId" value={selectedPlanTeacherId} />
              <label className="field">{partyLabel}<input name="counterpartyName" value={counterpartyName} onFocus={() => setClientPickerOpen(true)} onChange={(event) => { setCounterpartyName(event.target.value); setSelectedClientId(""); setClientPickerOpen(true); }} required /></label>
              {type === "REVENUE" && clientPickerOpen && counterpartyName.trim() ? <div className="client-search-panel form-full" aria-label="Selecionar cliente cadastrado">
                {matchingClients.map((client) => <button key={client.id} className="client-search-result" type="button" onClick={() => { setCounterpartyName(client.name); setSelectedClientId(client.id); setClientPickerOpen(false); }}><span className="client-search-avatar">{client.name.slice(0, 1).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.phone || "Sem telefone cadastrado"}</small></span></button>)}
                {!matchingClients.length ? <span className="client-search-empty">Nenhum cliente encontrado.</span> : null}
              </div> : null}
              {type === "EXPENSE" && counterpartyName.trim() ? <div className="supplier-suggestions form-full">
                {matchingSuppliers.map((supplier) => <button key={supplier.id} type="button" onClick={() => setCounterpartyName(supplier.name)}>{supplier.name}</button>)}
                {!hasExactSupplier ? <button type="button" className="supplier-create" disabled={pending} onClick={() => createQuickSetting("fornecedores", counterpartyName)}>Criar fornecedor: “{counterpartyName.trim()}”</button> : null}
              </div> : null}
              <label className="field">Categoria financeira<button type="button" className="field-select-button" onClick={() => setCategoryModalOpen(true)}>{category || "Selecionar categoria"}</button></label>
              <label className="field form-full">Descrição<input name="description" required /></label>
              <label className="field">Valor original<MoneyInput name="amount" valueCents={newEntryAmountCents} onValueCentsChange={setNewEntryAmountCents} placeholder="0,00" required /></label>
              <label className="field">Desconto<div className="discount-control"><input name="discount" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="0,00" /><select name="discountMode" value={discountMode} onChange={(event) => setDiscountMode(event.target.value as "AMOUNT" | "PERCENTAGE")} aria-label="Tipo de desconto"><option value="AMOUNT">R$</option><option value="PERCENTAGE">%</option></select></div></label>
              <label className="field">Vencimento<input name="dueDate" type="date" /></label>
              <label className="field">Conta bancária<select name="bankAccountId" defaultValue=""><option value="">Não definida</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              {type === "REVENUE" ? <><label className="field">Plano/pacote<select name="planId" defaultValue="" onChange={(event) => { const selectedPlan = event.currentTarget.selectedOptions[0]; const priceCents = Number(selectedPlan?.dataset.monthlyPriceCents); setSelectedPlanTeacherId(selectedPlan?.dataset.teacherId ?? ""); if (Number.isSafeInteger(priceCents) && priceCents >= 0) setNewEntryAmountCents(priceCents); }}><option value="">Não vincular</option><PlanSelectOptions plans={plans} /></select></label><label className="field">Produto<select name="productId" defaultValue=""><option value="">Não vincular</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></> : null}
              <div className="form-full financial-entry-toggles">
                <label className="control-toggle"><input type="checkbox" checked={paid} disabled={recurring} onChange={(event) => setPaid(event.target.checked)} /><span aria-hidden="true" /><em>Pago</em></label>
                <label className="control-toggle"><input type="checkbox" checked={recurring} onChange={(event) => { setRecurring(event.target.checked); if (event.target.checked) setPaid(false); }} /><span aria-hidden="true" /><em>Pagamento recorrente</em></label>
              </div>
              {paid && !recurring ? <label className="field">Forma de pagamento<select name="paymentMethod" defaultValue={paymentMethods[0] ?? "Dinheiro"}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label> : null}
              {recurring ? <>
                <label className="field">Periodicidade<select name="frequency" defaultValue="MONTHLY"><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option><option value="ANNUAL">Anual</option></select></label>
                <label className="field">Início<input name="startsAt" type="date" required /></label>
                <label className="field">Encerramento (opcional)<input name="endsAt" type="date" /></label>
                {type === "REVENUE" ? <label className="field form-full">Cobrança online<select name="onlinePaymentMethod" defaultValue=""><option value="">Não gerar cobrança online</option><option value="BOLETO">Boleto recorrente (Mercado Pago)</option></select><small>Para boleto, o atleta precisa ter CPF e e-mail válidos.</small>{message.startsWith("Dados incompletos do cliente:") ? <span className="form-message form-message-error financial-boleto-validation" role="alert"><strong>Complete o cadastro do cliente</strong>{message.replace("Dados incompletos do cliente: ", "")}</span> : null}</label> : null}
              </> : null}
              <label className="field form-full">Observações<textarea className="financial-notes-field" name="notes" rows={4} /></label>
              <footer className="modal-actions form-full"><button type="button" className="button" onClick={() => setNewEntryOpen(false)}>Cancelar</button><button className="button button-primary" disabled={pending}>{pending ? "Salvando..." : recurring ? "Criar recorrência" : "Salvar lançamento"}</button></footer>
            </form>
          </section>
        </div>
      ) : null}

      {bulkPaymentOpen ? <div className="command-modal-backdrop" onMouseDown={() => setBulkPaymentOpen(false)} role="presentation"><section className="financial-entry-modal financial-entry-modal-small" role="dialog" aria-modal="true" aria-label="Quitar lançamentos em massa" onMouseDown={(event) => event.stopPropagation()}><header><div><span>QUITAÇÃO EM MASSA</span><h2>Quitar {selectedPendingEntries.length} lançamento{selectedPendingEntries.length === 1 ? "" : "s"}</h2></div><button type="button" className="button button-small" onClick={() => setBulkPaymentOpen(false)}>Fechar</button></header><p>Todos os saldos pendentes selecionados serão quitados integralmente.</p>{message ? <p className="form-message form-message-error" role="alert">{message}</p> : null}<form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); selectedPendingEntries.forEach((entry) => form.append("entryIds", entry.id)); run(() => settleFinancialEntriesBulkAction(form), () => { setBulkPaymentOpen(false); setSelectedEntryIds(new Set()); }); }} className="grid-form"><label className="field">Forma de pagamento<select name="paymentMethod" defaultValue={paymentMethods[0] ?? "PIX"}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label><label className="field">Data da quitação<input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><footer className="modal-actions form-full"><button type="button" className="button" onClick={() => setBulkPaymentOpen(false)}>Cancelar</button><button className="button button-success" disabled={pending}>Quitar selecionados</button></footer></form></section></div> : null}

      {categoryModalOpen ? <div className="command-modal-backdrop" role="presentation" onMouseDown={() => setCategoryModalOpen(false)}><section className="financial-entry-modal financial-entry-modal-small" role="dialog" aria-modal="true" aria-label="Categorias financeiras" onMouseDown={(event) => event.stopPropagation()}><header><div><span>CLASSIFICAÇÃO</span><h2>Categorias financeiras</h2></div><button type="button" className="button button-small" onClick={() => setCategoryModalOpen(false)}>Fechar</button></header><form className="financial-setting-quick-create" onSubmit={(event) => { event.preventDefault(); createQuickSetting("categorias-financeiras", newCategoryName); }}><input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Nova categoria" required /><button type="submit" className="button button-primary" disabled={pending}>Criar categoria</button></form><div className="simple-list financial-category-list">{categoryOptions.map((item) => <button type="button" className="button" key={item} onClick={() => { setCategory(item); setCategoryModalOpen(false); }}>{item}</button>)}{!categoryOptions.length ? <p className="muted">Crie a primeira categoria financeira acima.</p> : null}</div></section></div> : null}

      {selectedEntry ? <div className="command-modal-backdrop" onMouseDown={() => setSelectedEntry(null)} role="presentation"><section className="financial-entry-modal" role="dialog" aria-modal="true" aria-label="Editar lançamento" onMouseDown={(event) => event.stopPropagation()}><header><div><span>LANÇAMENTO</span><h2>{selectedEntry.description}</h2></div><button type="button" className="button button-small" onClick={() => setSelectedEntry(null)}>Fechar</button></header><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", selectedEntry.id); run(() => updateFinancialEntryAction(form), () => setSelectedEntry(null)); }} className="grid-form"><label className="field">{partyLabel}<input name="counterpartyName" value={editCounterpartyName} onFocus={() => setEditClientPickerOpen(true)} onChange={(event) => { setEditCounterpartyName(event.target.value); setEditClientPickerOpen(true); }} required /></label>{type === "REVENUE" && editClientPickerOpen && editCounterpartyName.trim() ? <div className="client-search-panel form-full" aria-label="Selecionar cliente cadastrado">{matchingEditedClients.map((client) => <button key={client.id} className="client-search-result" type="button" onClick={() => { setEditCounterpartyName(client.name); setEditClientPickerOpen(false); }}><span className="client-search-avatar">{client.name.slice(0, 1).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.phone || "Sem telefone cadastrado"}</small></span></button>)}{!matchingEditedClients.length ? <span className="client-search-empty">Nenhum cliente encontrado.</span> : null}</div> : null}<label className="field">Categoria<select name="category" defaultValue={selectedEntry.category}>{categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="field form-full">Descrição<input name="description" defaultValue={selectedEntry.description} required /></label><label className="field">Valor original<input name="amount" inputMode="decimal" defaultValue={amountInput(selectedEntry.amountCents)} required /></label><label className="field">Vencimento<input name="dueDate" type="date" defaultValue={selectedEntry.dueDate ?? ""} /></label><label className="field">Conta bancária<select name="bankAccountId" defaultValue={selectedEntry.bankAccountId ?? ""}><option value="">Não definida</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{type === "REVENUE" ? <><label className="field">Plano/pacote<select name="planId" defaultValue={selectedEntry.planId ?? ""}><option value="">Não vincular</option><PlanSelectOptions plans={plans} /></select></label><label className="field">Produto<select name="productId" defaultValue={selectedEntry.productId ?? ""}><option value="">Não vincular</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></> : null}<label className="field form-full">Observações<textarea className="financial-notes-field" name="notes" rows={4} defaultValue={selectedEntry.notes} /></label>{selectedEntry.settlements.length ? <div className="form-full account-settlement-history"><strong>Histórico de baixas</strong>{selectedEntry.settlements.map((settlement, index) => <span key={`${settlement.paidAt}-${index}`}>{date(settlement.paidAt)} · {settlement.paymentMethod} · {money(settlement.amountCents)}{settlement.interestCents ? ` + ${money(settlement.interestCents)} de juros` : ""}</span>)}</div> : null}<footer className="modal-actions form-full"><button type="button" className="button" onClick={() => setSelectedEntry(null)}>Cancelar</button><button className="button button-primary" disabled={pending}>Salvar alterações</button></footer></form></section></div> : null}

      {paymentEntry ? <div className="command-modal-backdrop" onMouseDown={() => setPaymentEntry(null)} role="presentation"><section className="financial-entry-modal" role="dialog" aria-modal="true" aria-label={actionLabel} onMouseDown={(event) => event.stopPropagation()}><header><div><span>BAIXA DE CONTA</span><h2>{actionLabel}: {paymentEntry.counterpartyName}</h2></div><button type="button" className="button button-small" onClick={() => setPaymentEntry(null)}>Fechar</button></header><div className="account-payment-summary"><span>Valor original <b>{money(paymentEntry.amountCents)}</b></span><span>Juros já lançados <b>{money(paymentEntry.balance.interestCents)}</b></span><span>Já baixado <b>{money(paymentEntry.balance.paidCents)}</b></span><span>Saldo atual <b>{money(paymentEntry.balance.outstandingCents)}</b></span></div><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", paymentEntry.id); run(() => settleFinancialEntryAction(form), () => setPaymentEntry(null)); }} className="grid-form"><label className="field">Valor desta baixa<input name="amount" inputMode="decimal" placeholder="0,00" required /></label><label className="field">Juros desta baixa<input name="interest" inputMode="decimal" defaultValue="0,00" /></label><label className="field">Forma de pagamento<select name="paymentMethod" defaultValue={paymentMethods[0] ?? "PIX"}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label><label className="field">Data<input name="paidAt" type="date" /></label><label className="field form-full">Observação<input name="notes" /></label><footer className="modal-actions form-full"><button type="button" className="button" onClick={() => setPaymentEntry(null)}>Cancelar</button><button className="button button-success" disabled={pending}>{actionLabel} conta</button></footer></form></section></div> : null}
      {voidEntry ? <div className="command-modal-backdrop" onMouseDown={() => setVoidEntry(null)} role="presentation"><section className="financial-entry-modal financial-entry-modal-small" role="dialog" aria-modal="true" aria-label="Estornar conta" onMouseDown={(event) => event.stopPropagation()}><header><div><span>ESTORNO</span><h2>Estornar conta</h2></div><button type="button" className="button button-small" onClick={() => setVoidEntry(null)}>Fechar</button></header><p>O lançamento será mantido no histórico como estornado.</p><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", voidEntry.id); run(() => voidFinancialEntryAction(form), () => setVoidEntry(null)); }} className="stack-sm"><label className="field">Motivo<input name="reason" required minLength={3} /></label><footer className="modal-actions"><button type="button" className="button" onClick={() => setVoidEntry(null)}>Cancelar</button><button className="button button-danger" disabled={pending}>Confirmar estorno</button></footer></form></section></div> : null}
    </div>
  );
}

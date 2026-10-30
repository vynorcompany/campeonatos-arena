"use client";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { Modal } from "@/components/ui/modal";
import { ReceivingBankAccountSelect } from "@/components/finance/bank-account-select";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./accounts-ledger.utilities";

import Link from "next/link";
import { getDiscountedAmountCents } from "@/lib/finance/discounts";
import { CurrencyInput } from "@/components/forms/currency-input";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { useConfirmAction } from "@/components/forms/use-confirm-action";
import { classificationFilterOptions } from "@/lib/finance/classification-filter";
import {
  amountInput,
  date,
  isOverdue,
  money,
  OnlineChargeBadge,
  PlanSelectOptions,
  type Account,
  type Option,
} from "@/components/finance/accounts-ledger-parts";


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
  canCreateEntries,
  canEditEntries,
  canSettleEntries,
  canManageSettings,
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
  canCreateEntries: boolean;
  canEditEntries: boolean;
  canSettleEntries: boolean;
  canManageSettings: boolean;
  canDeleteEntries: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [paymentDiscount, setPaymentDiscount] = useState(0);
  const [paymentInterest, setPaymentInterest] = useState(0);
  const paymentFormRef = useRef<HTMLFormElement>(null);
  const [paymentDiscountMode, setPaymentDiscountMode] = useState<"AMOUNT" | "PERCENTAGE">("AMOUNT");
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
  const { confirm, confirmationDialog } = useConfirmAction();
  const pendingRef = useRef(pending); pendingRef.current = pending;
  const closePayment = useCallback(() => { if (!pendingRef.current) setPaymentEntry(null); }, []);
  const anyDialogOpen = Boolean(onlineCharge || newEntryOpen || bulkPaymentOpen || categoryModalOpen || selectedEntry);

  useEffect(() => {
    if (!anyDialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      if (categoryModalOpen) {
        setCategoryModalOpen(false);
        return;
      }
      setOnlineCharge(null);
      setNewEntryOpen(false);
      setBulkPaymentOpen(false);
      setSelectedEntry(null);
      setPaymentEntry(null);
      setVoidEntry(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [anyDialogOpen, categoryModalOpen]);

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
  const selectableEntries = entries.filter((entry) => entry.status !== "VOIDED" && entry.source !== "AGENCY_SUBSCRIPTION");
  const selectedEntries = entries.filter((entry) => selectedEntryIds.has(entry.id));
  const selectedPendingEntries = selectedEntries.filter((entry) => ["PENDING", "OVERDUE", "PARTIAL"].includes(entry.status) && entry.balance.outstandingCents > 0);
  const listedTotalCents = selectableEntries.reduce((total, entry) => total + entry.amountCents, 0);
  const selectedTotalCents = selectedEntries.filter((entry) => entry.status !== "VOIDED").reduce((total, entry) => total + entry.amountCents, 0);
  const allSelectableEntriesSelected = selectableEntries.length > 0 && selectableEntries.every((entry) => selectedEntryIds.has(entry.id));
  const toggleEntrySelection = (entryId: string) => setSelectedEntryIds((current) => {
    const next = new Set(current);
    if (next.has(entryId)) next.delete(entryId); else next.add(entryId);
    return next;
  });
  const openEntry = (entry: Account) => {
    if (!canEditEntries) return;
    if (entry.source === "AGENCY_SUBSCRIPTION") { setNotice("Fatura vinculada à agência. Use o link de pagamento; a baixa acontece automaticamente após a confirmação."); return; }
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
    if (!paymentFormRef.current?.reportValidity()) return;
    startTransition(async () => {
      try {
        setMessage("");
        const form = new FormData(paymentFormRef.current!); form.set("entryId", entry.id); form.set("method", method);
        const result = await generateFinancialEntryOnlineChargeAction(form);
        if ("error" in result) { setMessage(result.error ?? "Não foi possível gerar a cobrança."); return; }
        setPaymentEntry(null); setOnlineCharge(result);
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
    <div className={viewStyles.accounts_ledger_stack_md}>
      {onlineCharge ? <div className={viewStyles.command_modal_backdrop} role="presentation" onMouseDown={() => setOnlineCharge(null)}><section className={viewStyles.financial_entry_modal_financial_entry_modal_small} role="dialog" aria-modal="true" aria-label="Cobrança online" onMouseDown={(event) => event.stopPropagation()}><header><div><span>COBRANÇA ONLINE</span><h2>{onlineCharge.method === "PIX" ? "PIX gerado" : "Boleto gerado"}</h2></div><button type="button" className={viewStyles.button_button_small} onClick={() => setOnlineCharge(null)}>Fechar</button></header>{onlineCharge.code ? <p><strong>Código:</strong> {onlineCharge.code}</p> : null}{onlineCharge.url ? <a className={viewStyles.button_button_primary} href={onlineCharge.url} target="_blank" rel="noreferrer">Abrir cobrança</a> : null}</section></div> : null}
      <header className={viewStyles.accounts_ledger_header}>
        {canCreateEntries ? <button type="button" className={viewStyles.button_button_primary} onClick={() => { setMessage(""); setNotice(""); setSelectedClientId(""); setSelectedPlanTeacherId(""); setNewEntryAmountCents(undefined); setPaid(false); setNewEntryOpen(true); }}>Novo lançamento</button> : null}
        <button type="button" className={`${viewStyles.button_button_small} tw:hidden! tw:viewport-700:inline-flex!`} aria-expanded={filtersOpen} aria-controls="accounts-mobile-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? "Ocultar filtros" : "Filtros"}</button>
      </header>

      <form id="accounts-mobile-filters" method="get" className={cx(`${viewStyles.accounts_filters} ${filtersOpen ? "" : "tw:viewport-700:hidden"}`)}>
        {type === "REVENUE" ? <div className={viewStyles.accounts_client_filter}><input name="name" placeholder={filterLabel} aria-label={filterLabel} value={clientFilter} onFocus={() => setClientFilterOpen(true)} onChange={(event) => { setClientFilter(event.target.value); setClientFilterOpen(true); }} />{clientFilterOpen && clientFilter.trim() ? <div className={viewStyles.client_search_panel_accounts_client_suggestions} aria-label="Clientes encontrados">{matchingFilterClients.map((client) => <button key={client.id} className={viewStyles.client_search_result} type="button" onClick={() => { setClientFilter(client.name); setClientFilterOpen(false); }}><span className={viewStyles.client_search_avatar}>{client.name.slice(0, 1).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.phone || "Sem telefone cadastrado"}</small></span></button>)}{!matchingFilterClients.length ? <span className={viewStyles.client_search_empty}>Nenhum cliente encontrado.</span> : null}</div> : null}</div> : <input name="name" placeholder={filterLabel} defaultValue={String(filters.name ?? "")} />}
        <input name="start" type="date" aria-label="Data inicial" defaultValue={String(filters.start ?? "")} />
        <input name="end" type="date" aria-label="Data final" defaultValue={String(filters.end ?? "")} />
        <select name="status" defaultValue={String(filters.status ?? "")}><option value="">Todos os status</option><option value="PENDING">Em aberto</option><option value="PAID">Quitada</option><option value="VOIDED">Estornada</option></select>
        <select name="paymentMethod" defaultValue={String(filters.paymentMethod ?? "")}><option value="">Forma de pagamento</option>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select>
        <select name="bankAccountId" defaultValue={String(filters.bankAccountId ?? "")}><option value="">Conta bancária</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="category" defaultValue={String(filters.category ?? "")}><option value="">Classificação</option>{classificationFilterOptions(categoryOptions, type).map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <input name="description" placeholder="Descrição" defaultValue={String(filters.description ?? "")} />
        {type === "REVENUE" ? <><select name="productId" defaultValue={String(filters.productId ?? "")}><option value="">Produto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="planId" defaultValue={String(filters.planId ?? "")} onChange={(event) => event.currentTarget.form?.requestSubmit()} aria-label="Filtrar por plano ou por todos os planos do professor"><option value="">Plano/pacote</option><PlanSelectOptions plans={plans} includeTeacherAll /></select></> : null}
        <select name="dateField" defaultValue={String(filters.dateField ?? "dueDate")}><option value="dueDate">Data de vencimento</option><option value="paidAt">Data de pagamento</option></select>
        <div className="tw:col-span-full tw:flex tw:flex-wrap tw:items-center tw:gap-x-5 tw:gap-y-2 tw:viewport-700:flex-col tw:viewport-700:items-stretch">
          <label className={viewStyles.control_toggle}><input name="includeEarlier" type="checkbox" value="1" defaultChecked={filters.includeEarlier === true} /><span aria-hidden="true" /><em>Anteriores à data inicial</em></label>
          <label className={viewStyles.control_toggle}><input name="includeVoided" type="checkbox" value="1" defaultChecked={filters.includeVoided === true} /><span aria-hidden="true" /><em>Incluir estornados/deletados</em></label>
          <button className={`${viewStyles.button_button_primary_accounts_filters_submit} tw:font-normal! tw:ml-auto tw:min-w-[144px] tw:viewport-700:ml-0 tw:viewport-700:w-full`}>Filtrar</button>
        </div>
      </form>

      <section className={viewStyles.accounts_ledger_totals} aria-label="Totais dos lançamentos">
        <article><span>Total listado</span><strong>{money(listedTotalCents)}</strong><small>{selectableEntries.length} lançamento{selectableEntries.length === 1 ? "" : "s"} ativo{selectableEntries.length === 1 ? "" : "s"}</small></article>
        <article className={cx(selectedEntries.length ? "accounts-ledger-total-selected" : "")}><span>Total selecionado</span><strong>{money(selectedTotalCents)}</strong><small>{selectedEntries.length ? `${selectedEntries.length} lançamento${selectedEntries.length === 1 ? "" : "s"} selecionado${selectedEntries.length === 1 ? "" : "s"}` : "Selecione lançamentos na lista"}</small></article>
      </section>

      {message && !newEntryOpen && !bulkPaymentOpen ? <p className="form-message form-message-error">{message}</p> : null}
      {notice && !newEntryOpen && !bulkPaymentOpen ? <p className={viewStyles.form_success}>{notice}</p> : null}
      {selectedEntries.length ? <section className={viewStyles.accounts_bulk_actions} aria-label="Ações em massa"><strong>{selectedEntries.length} lançamento{selectedEntries.length === 1 ? " selecionado" : "s selecionados"}</strong><span>{selectedPendingEntries.length ? `${selectedPendingEntries.length} pendente${selectedPendingEntries.length === 1 ? "" : "s"} para quitar` : "Nenhuma pendência selecionada"}</span>{canSettleEntries && selectedPendingEntries.length ? <button type="button" className={viewStyles.button_button_primary_button_small} onClick={() => { setMessage(""); setBulkPaymentOpen(true); }}>Quitar pendentes</button> : null}{canDeleteEntries ? <button type="button" className={viewStyles.button_button_danger_button_small} onClick={() => { confirm({ keyword: "EXCLUIR", message: `Excluir ${selectedEntries.length} lançamento(s)? Eles permanecerão registrados para auditoria. Digite EXCLUIR para confirmar.`, onConfirm: () => { const form = new FormData(); selectedEntries.forEach((entry) => form.append("entryIds", entry.id)); run(() => deleteFinancialEntriesBulkAction(form), () => setSelectedEntryIds(new Set())); } }); }}>Excluir selecionados</button> : null}<button type="button" className={viewStyles.button_button_small} onClick={() => setSelectedEntryIds(new Set())}>Limpar seleção</button></section> : null}
      <nav aria-label="Período rápido" className="tw:flex tw:flex-wrap tw:gap-2">{([[-1, "Mês passado"], [0, "Este Mês"], [1, "Próximo Mês"]] as const).map(([offset, label]) => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth() + offset, 1); const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0); const day = (value: Date) => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`; const params = new URLSearchParams(); Object.entries(filters).forEach(([key,value]) => { if (value !== undefined && value !== false) params.set(key,String(value)); }); params.set("start",day(first)); params.set("end",day(last)); return <Link key={offset} href={`?${params}`} aria-current={filters.start === day(first) && filters.end === day(last) ? "date" : undefined} className="tw:rounded-md tw:border tw:border-[#b8cfee] tw:bg-white tw:px-3 tw:py-2 tw:text-xs tw:font-medium tw:text-[#174a85] tw:no-underline tw:aria-[current=date]:bg-[#174983] tw:aria-[current=date]:text-white">{label}</Link>; })}</nav>
      <section className={viewStyles.accounts_ledger_list} aria-label={title}>
        <label className="tw:hidden tw:viewport-700:flex tw:items-center tw:gap-2 tw:border-b tw:border-[var(--line)] tw:p-3 tw:text-xs"><input type="checkbox" aria-label="Selecionar todos os lançamentos no celular" checked={allSelectableEntriesSelected} onChange={() => setSelectedEntryIds(allSelectableEntriesSelected ? new Set() : new Set(selectableEntries.map((entry) => entry.id)))} />Selecionar todos</label><div className={viewStyles.accounts_ledger_columns}><span><input type="checkbox" aria-label="Selecionar todos os lançamentos" checked={allSelectableEntriesSelected} onChange={() => setSelectedEntryIds(allSelectableEntriesSelected ? new Set() : new Set(selectableEntries.map((entry) => entry.id)))} /></span><span>Vencimento</span><span>{partyLabel}</span><span>Tipo</span><span>Descrição</span><span>Valor / saldo</span><span>Status</span><span>Ações</span></div>
        {entries.map((entry) => {
          const overdue = isOverdue(entry);
          return (
          <article className={cx(`${viewStyles.accounts_ledger_row_accounts_ledger_row_clickable}${overdue ? " " + viewStyles.accounts_ledger_row_overdue : ""}`)} key={entry.id} role={canEditEntries ? "button" : undefined} tabIndex={canEditEntries ? 0 : undefined} onClick={canEditEntries ? () => openEntry(entry) : undefined} onKeyDown={canEditEntries ? (event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openEntry(entry); } } : undefined}>
            <span className={viewStyles.accounts_ledger_selection}><input type="checkbox" aria-label={`Selecionar ${entry.description}`} checked={selectedEntryIds.has(entry.id)} disabled={entry.status === "VOIDED" || entry.source === "AGENCY_SUBSCRIPTION"} onClick={(event) => event.stopPropagation()} onChange={() => toggleEntrySelection(entry.id)} /></span><span data-label="Vencimento">{date(entry.dueDate)}</span><strong data-label={partyLabel}>{type === "REVENUE" && entry.counterpartyName !== "Não informado" ? <Link href={`/jogadores?q=${encodeURIComponent(entry.counterpartyName)}`} onClick={(event) => event.stopPropagation()}>{entry.counterpartyName}</Link> : entry.counterpartyName}</strong><span data-label="Tipo">{entry.category}</span><span data-label="Descrição">{entry.description}{entry.comanda ? <Link className={viewStyles.account_comanda_link} href={`/comandas/${entry.comanda.id}`} onClick={(event) => event.stopPropagation()}>Ver comanda · {entry.comanda.code}</Link> : null}</span>
            <span data-label="Valor / saldo"><b>{money(entry.amountCents)}</b>{canEditEntries && entry.status !== "VOIDED" && entry.source !== "AGENCY_SUBSCRIPTION" ? <button type="button" title="Estornar" aria-label={`Estornar ${entry.description}`} className="tw:ml-2 tw:inline-grid tw:size-7 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-orange-300 tw:bg-orange-50 tw:align-middle tw:text-orange-700 tw:hover:bg-orange-100" onClick={event => { event.stopPropagation(); setMessage(""); setVoidEntry(entry); }}><svg className="tw:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 4-5 5 5 5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button> : null}{entry.balance.interestCents ? <small>Juros: {money(entry.balance.interestCents)}</small> : null}{entry.status !== "VOIDED" ? <small>Saldo: {money(entry.balance.outstandingCents)}</small> : null}</span>
            <span><em className={cx(`${viewStyles.account_status} ${overdue ? viewStyles.account_status_overdue : `account-status-${entry.status.toLowerCase()}`}`)}>{overdue ? "EM ATRASO" : entry.status === "PAID" ? "Quitada" : entry.status === "VOIDED" ? "Estornada" : "Em aberto"}</em><OnlineChargeBadge entry={entry} />{entry.voidReason ? <small>{entry.voidReason}</small> : null}</span>
            <span className={viewStyles.accounts_ledger_actions}>
              {type === "EXPENSE" && entry.onlinePaymentUrl && entry.status === "PENDING" ? <a className={viewStyles.button_button_small_button_primary} href={entry.onlinePaymentUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>Pagar online</a> : null}
              {entry.source !== "AGENCY_SUBSCRIPTION" ? <>
                {["PENDING", "OVERDUE", "PARTIAL"].includes(entry.status) ? <>
                  {canSettleEntries ? <button type="button" className={viewStyles.button_button_small_button_primary} onClick={(event) => { event.stopPropagation(); setMessage(""); setPaymentDiscount(0); setPaymentInterest(0); setPaymentDiscountMode("AMOUNT"); setPaymentEntry(entry); }}>{actionLabel}</button> : null}

                </> : null}

                {canDeleteEntries && entry.status !== "VOIDED" ? <button type="button" className={viewStyles.button_button_small_button_danger} onClick={(event) => { event.stopPropagation(); confirm({ keyword: "EXCLUIR", message: "Excluir este lançamento? Ele será removido da operação, mas permanecerá registrado para auditoria. Digite EXCLUIR para confirmar.", onConfirm: () => { const form = new FormData(); form.set("entryId", entry.id); run(() => deleteFinancialEntryAction(form), () => {}); } }); }}>Excluir</button> : null}
              </> : null}
            </span>
          </article>
          );
        })}
        {!entries.length ? <div className={viewStyles.accounts_ledger_empty}>Nenhuma conta cadastrada.</div> : null}
      </section>

      {newEntryOpen ? (
        <div className={viewStyles.command_modal_backdrop} onMouseDown={() => setNewEntryOpen(false)} role="presentation">
          <section className={viewStyles.financial_entry_modal} role="dialog" aria-modal="true" aria-label="Novo lançamento" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>NOVO LANÇAMENTO</span><h2>{title}</h2></div><button type="button" className={viewStyles.button_button_small} onClick={() => setNewEntryOpen(false)}>Fechar</button></header>
            {message && !message.startsWith("Dados incompletos do cliente:") ? <p className="form-message form-message-error" role="alert">{message}</p> : null}
            <form onSubmit={(event) => {
              event.preventDefault();
              if (!category) { setMessage("Selecione uma categoria financeira."); return; }
              const form = new FormData(event.currentTarget);
              run(() => recurring ? createFinancialRecurrenceAction(form) : createFinancialEntryAction(form), () => setNewEntryOpen(false));
            }} className={viewStyles.grid_form}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="status" value={paid && !recurring ? "PAID" : "PENDING"} />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="clientId" value={selectedClientId} />
              <input type="hidden" name="teacherId" value={selectedPlanTeacherId} />
              <label className={viewStyles.field}>{partyLabel}<input name="counterpartyName" value={counterpartyName} onFocus={() => setClientPickerOpen(true)} onChange={(event) => { setCounterpartyName(event.target.value); setSelectedClientId(""); setClientPickerOpen(true); }} required /></label>
              {type === "REVENUE" && clientPickerOpen && counterpartyName.trim() ? <div className={viewStyles.client_search_panel_form_full} aria-label="Selecionar cliente cadastrado">
                {matchingClients.map((client) => <button key={client.id} className={viewStyles.client_search_result} type="button" onClick={() => { setCounterpartyName(client.name); setSelectedClientId(client.id); setClientPickerOpen(false); }}><span className={viewStyles.client_search_avatar}>{client.name.slice(0, 1).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.phone || "Sem telefone cadastrado"}</small></span></button>)}
                {!matchingClients.length ? <span className={viewStyles.client_search_empty}>Nenhum cliente encontrado.</span> : null}
              </div> : null}
              {type === "EXPENSE" && counterpartyName.trim() ? <div className={viewStyles.supplier_suggestions_form_full}>
                {matchingSuppliers.map((supplier) => <button key={supplier.id} type="button" onClick={() => setCounterpartyName(supplier.name)}>{supplier.name}</button>)}
                {canManageSettings && !hasExactSupplier ? <button type="button" className="supplier-create" disabled={pending} onClick={() => createQuickSetting("fornecedores", counterpartyName)}>Criar fornecedor: “{counterpartyName.trim()}”</button> : null}
              </div> : null}
              <label className={viewStyles.field}>Categoria financeira<button type="button" className={viewStyles.field_select_button} onClick={() => setCategoryModalOpen(true)}>{category || "Selecionar categoria"}</button></label>
              <label className={viewStyles.field_form_full}>Descrição<input name="description" required /></label>
              <label className={viewStyles.field}>Valor original (R$)<MoneyInput name="amount" valueCents={newEntryAmountCents} onValueCentsChange={setNewEntryAmountCents} placeholder="0,00" required /></label>
              <label className={viewStyles.field}>Desconto<div className={viewStyles.discount_control}><input name="discount" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="0,00" /><select name="discountMode" value={discountMode} onChange={(event) => setDiscountMode(event.target.value as "AMOUNT" | "PERCENTAGE")} aria-label="Tipo de desconto"><option value="AMOUNT">R$</option><option value="PERCENTAGE">%</option></select></div></label>
              <label className={viewStyles.field}>Competência<input name="competenceDate" type="date" /></label><label className={viewStyles.field}>Vencimento<input name="dueDate" type="date" /></label>
              <label className={viewStyles.field}>Conta bancária<select name="bankAccountId" required={paid && !recurring && type === "REVENUE"} defaultValue=""><option value="">Selecione a conta bancária</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              {type === "REVENUE" ? <><label className={viewStyles.field}>Plano/pacote<select name="planId" defaultValue="" onChange={(event) => { const selectedPlan = event.currentTarget.selectedOptions[0]; const priceCents = Number(selectedPlan?.dataset.monthlyPriceCents); setSelectedPlanTeacherId(selectedPlan?.dataset.teacherId ?? ""); if (Number.isSafeInteger(priceCents) && priceCents >= 0) setNewEntryAmountCents(priceCents); }}><option value="">Não vincular</option><PlanSelectOptions plans={plans} /></select></label><label className={viewStyles.field}>Produto<select name="productId" defaultValue=""><option value="">Não vincular</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></> : null}
              <div className={viewStyles.form_full_financial_entry_toggles}>
                {canSettleEntries ? <label className={viewStyles.control_toggle}><input type="checkbox" checked={paid} disabled={recurring} onChange={(event) => setPaid(event.target.checked)} /><span aria-hidden="true" /><em>Pago</em></label> : null}
                <label className={viewStyles.control_toggle}><input type="checkbox" checked={recurring} onChange={(event) => { setRecurring(event.target.checked); if (event.target.checked) setPaid(false); }} /><span aria-hidden="true" /><em>Pagamento recorrente</em></label>
              </div>
              {paid && !recurring ? <label className={viewStyles.field}>Forma de pagamento<select name="paymentMethod" defaultValue={paymentMethods[0] ?? "Dinheiro"}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label> : null}
              {recurring ? <>
                <label className={viewStyles.field}>Periodicidade<select name="frequency" defaultValue="MONTHLY"><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option><option value="ANNUAL">Anual</option></select></label>
                <label className={viewStyles.field}>Início<input name="startsAt" type="date" required /></label>
                <label className={viewStyles.field}>Encerramento (opcional)<input name="endsAt" type="date" /></label>
                {type === "REVENUE" ? <label className={viewStyles.field_form_full}>Cobrança online<select name="onlinePaymentMethod" defaultValue=""><option value="">Não gerar cobrança online</option><option value="BOLETO">Boleto recorrente (Mercado Pago)</option></select><small>Para boleto, o atleta precisa ter CPF e e-mail válidos.</small>{message.startsWith("Dados incompletos do cliente:") ? <span className={viewStyles.financial_boleto_validation} role="alert"><strong>Complete o cadastro do cliente</strong>{message.replace("Dados incompletos do cliente: ", "")}</span> : null}</label> : null}
              </> : null}
              <label className={viewStyles.field_form_full}>Observações<textarea className={viewStyles.financial_notes_field} name="notes" rows={4} /></label>
              <footer className={viewStyles.modal_actions_form_full}><button type="button" className={viewStyles.button} onClick={() => setNewEntryOpen(false)}>Cancelar</button><button className={viewStyles.button_button_primary} disabled={pending}>{pending ? "Salvando..." : recurring ? "Criar recorrência" : "Salvar lançamento"}</button></footer>
            </form>
          </section>
        </div>
      ) : null}

      {bulkPaymentOpen ? <div className={viewStyles.command_modal_backdrop} onMouseDown={() => setBulkPaymentOpen(false)} role="presentation"><section className={viewStyles.financial_entry_modal_financial_entry_modal_small} role="dialog" aria-modal="true" aria-label="Quitar lançamentos em massa" onMouseDown={(event) => event.stopPropagation()}><header><div><span>QUITAÇÃO EM MASSA</span><h2>Quitar {selectedPendingEntries.length} lançamento{selectedPendingEntries.length === 1 ? "" : "s"}</h2></div><button type="button" className={viewStyles.button_button_small} onClick={() => setBulkPaymentOpen(false)}>Fechar</button></header><p>Todos os saldos pendentes selecionados serão quitados integralmente.</p>{message ? <p className="form-message form-message-error" role="alert">{message}</p> : null}<form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); selectedPendingEntries.forEach((entry) => form.append("entryIds", entry.id)); run(() => settleFinancialEntriesBulkAction(form), () => { setBulkPaymentOpen(false); setSelectedEntryIds(new Set()); }); }} className={viewStyles.grid_form}><ReceivingBankAccountSelect accounts={bankAccounts} className={viewStyles.field}/><label className={viewStyles.field}>Forma de pagamento<select name="paymentMethod" defaultValue={paymentMethods[0] ?? "PIX"}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label><label className={viewStyles.field}>Data da quitação<input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><footer className={viewStyles.modal_actions_form_full}><button type="button" className={viewStyles.button} onClick={() => setBulkPaymentOpen(false)}>Cancelar</button><button className={viewStyles.button_button_success} disabled={pending}>Quitar selecionados</button></footer></form></section></div> : null}

      {categoryModalOpen ? <div className={viewStyles.command_modal_backdrop} role="presentation" onMouseDown={() => setCategoryModalOpen(false)}><section className={viewStyles.financial_entry_modal_financial_entry_modal_small} role="dialog" aria-modal="true" aria-label="Categorias financeiras" onMouseDown={(event) => event.stopPropagation()}><header><div><span>CLASSIFICAÇÃO</span><h2>Categorias financeiras</h2></div><button type="button" className={viewStyles.button_button_small} onClick={() => setCategoryModalOpen(false)}>Fechar</button></header>{canManageSettings ? <form className={viewStyles.financial_setting_quick_create} onSubmit={(event) => { event.preventDefault(); createQuickSetting("categorias-financeiras", newCategoryName); }}><input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Nova categoria" required /><button type="submit" className={viewStyles.button_button_primary} disabled={pending}>Criar categoria</button></form> : null}<div className={viewStyles.simple_list_financial_category_list}>{categoryOptions.map((item) => <button type="button" className={viewStyles.button} key={item} onClick={() => { setCategory(item); setCategoryModalOpen(false); }}>{item}</button>)}{!categoryOptions.length ? <p className={viewStyles.muted}>Nenhuma categoria financeira cadastrada.</p> : null}</div></section></div> : null}

      {selectedEntry ? <div className={viewStyles.command_modal_backdrop} onMouseDown={() => setSelectedEntry(null)} role="presentation"><section className={viewStyles.financial_entry_modal} role="dialog" aria-modal="true" aria-label="Editar lançamento" onMouseDown={(event) => event.stopPropagation()}><header><div><span>LANÇAMENTO</span><h2>{selectedEntry.description}</h2></div><button type="button" className={viewStyles.button_button_small} onClick={() => setSelectedEntry(null)}>Fechar</button></header><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", selectedEntry.id); run(() => updateFinancialEntryAction(form), () => setSelectedEntry(null)); }} className={viewStyles.grid_form}><label className={viewStyles.field}>{partyLabel}<input name="counterpartyName" value={editCounterpartyName} onFocus={() => setEditClientPickerOpen(true)} onChange={(event) => { setEditCounterpartyName(event.target.value); setEditClientPickerOpen(true); }} required /></label>{type === "REVENUE" && editClientPickerOpen && editCounterpartyName.trim() ? <div className={viewStyles.client_search_panel_form_full} aria-label="Selecionar cliente cadastrado">{matchingEditedClients.map((client) => <button key={client.id} className={viewStyles.client_search_result} type="button" onClick={() => { setEditCounterpartyName(client.name); setEditClientPickerOpen(false); }}><span className={viewStyles.client_search_avatar}>{client.name.slice(0, 1).toUpperCase()}</span><span><strong>{client.name}</strong><small>{client.phone || "Sem telefone cadastrado"}</small></span></button>)}{!matchingEditedClients.length ? <span className={viewStyles.client_search_empty}>Nenhum cliente encontrado.</span> : null}</div> : null}<label className={viewStyles.field}>Categoria<select name="category" defaultValue={selectedEntry.category}>{categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className={viewStyles.field_form_full}>Descrição<input name="description" defaultValue={selectedEntry.description} required /></label><label className={viewStyles.field}>Valor original<CurrencyInput name="amount" defaultValue={amountInput(selectedEntry.amountCents)} required /></label><label className={viewStyles.field}>Competência<input name="competenceDate" type="date" defaultValue={selectedEntry.competenceDate ?? ""}/></label><label className={viewStyles.field}>Vencimento<input name="dueDate" type="date" defaultValue={selectedEntry.dueDate ?? ""} /></label><label className={viewStyles.field}>Conta bancária<select name="bankAccountId" defaultValue={selectedEntry.bankAccountId ?? ""}><option value="">Não definida</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{type === "REVENUE" ? <><label className={viewStyles.field}>Plano/pacote<select name="planId" defaultValue={selectedEntry.planId ?? ""}><option value="">Não vincular</option><PlanSelectOptions plans={plans} /></select></label><label className={viewStyles.field}>Produto<select name="productId" defaultValue={selectedEntry.productId ?? ""}><option value="">Não vincular</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></> : null}<label className={viewStyles.field_form_full}>Observações<textarea className={viewStyles.financial_notes_field} name="notes" rows={4} defaultValue={selectedEntry.notes} /></label>{selectedEntry.settlements.length ? <div className={viewStyles.form_full_account_settlement_history}><strong>Histórico de baixas</strong>{selectedEntry.settlements.map((settlement, index) => <span key={`${settlement.paidAt}-${index}`}>{date(settlement.paidAt)} · {settlement.paymentMethod} · {money(settlement.amountCents)}{settlement.interestCents ? ` + ${money(settlement.interestCents)} de juros` : ""}{settlement.discountCents ? ` · ${money(settlement.discountCents)} de desconto` : ""}</span>)}</div> : null}<footer className={viewStyles.modal_actions_form_full}><button type="button" className={viewStyles.button} onClick={() => setSelectedEntry(null)}>Cancelar</button><button className={viewStyles.button_button_primary} disabled={pending}>Salvar alterações</button></footer></form></section></div> : null}

      {paymentEntry ? <Modal open title={`${actionLabel}: ${paymentEntry.counterpartyName}`} onClose={closePayment} width="tw:max-w-[1040px]">
        <form ref={paymentFormRef} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", paymentEntry.id); run(() => settleFinancialEntryAction(form), () => setPaymentEntry(null)); }} className="tw:flex tw:h-full tw:min-h-0 tw:flex-col tw:gap-3">
          <div className="tw:grid tw:min-h-0 tw:flex-1 tw:content-start tw:gap-4 tw:overflow-y-auto tw:overscroll-contain tw:pr-1">
            <div aria-label="Resumo da conta" className="tw:grid tw:grid-cols-2 tw:gap-2 tw:md:grid-cols-4">{[["Valor original", paymentEntry.amountCents], ["Juros já lançados", paymentEntry.balance.interestCents], ["Já baixado", paymentEntry.balance.paidCents], ["Saldo atual", paymentEntry.balance.outstandingCents]].map(([label, value]) => <div key={String(label)} className="tw:grid tw:gap-2 tw:rounded-md tw:bg-[#174983] tw:p-3 tw:text-white"><span className="tw:text-xs tw:text-white">{label}</span><strong className="tw:text-base tw:tabular-nums tw:text-white">{money(Number(value))}</strong></div>)}</div>
            {message ? <p role="alert" className="tw:m-0 tw:text-sm tw:text-red-700">{message}</p> : null}
            {type === "REVENUE" && canSettleEntries ? <div className="tw:flex tw:flex-wrap tw:gap-2 tw:py-1">{paymentEntry.onlinePaymentUrl ? <button type="button" className={ui.primary} onClick={() => { setPaymentEntry(null); setOnlineCharge({ method: paymentEntry.onlinePaymentQrCode ? "BOLETO" : "PIX", url: paymentEntry.onlinePaymentUrl, code: paymentEntry.onlinePaymentQrCode }); }}>Ver cobrança</button> : ["PENDING", "OVERDUE", "PARTIAL"].includes(paymentEntry.status) ? <><button type="button" className={ui.primary} disabled={pending} onClick={() => generateOnlineCharge(paymentEntry,"PIX")}>Gerar PIX</button><button type="button" className={ui.primary} disabled={pending} onClick={() => generateOnlineCharge(paymentEntry,"BOLETO")}>Gerar boleto</button></> : null}</div> : null}
            <div className="tw:grid tw:min-w-0 tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-3"><ReceivingBankAccountSelect accounts={bankAccounts} defaultValue={paymentEntry.bankAccountId ?? ""} className={ui.field}/><label className={ui.field}>Valor desta baixa<CurrencyInput key={`${paymentEntry.id}-${paymentDiscount}-${paymentDiscountMode}-${paymentInterest}`} name="amount" defaultValue={amountInput(getDiscountedAmountCents(paymentEntry.balance.outstandingCents, paymentDiscountMode === "PERCENTAGE" ? paymentDiscount / 100 : paymentDiscount, paymentDiscountMode) + paymentInterest)} required /></label><label className={ui.field}>Desconto (R$ ou %)<div className="tw:grid tw:grid-cols-[minmax(0,1fr)_96px] tw:gap-2"><MoneyInput name="discount" valueCents={paymentDiscount} onValueCentsChange={setPaymentDiscount}/><select name="discountMode" value={paymentDiscountMode} onChange={event => setPaymentDiscountMode(event.target.value as "AMOUNT" | "PERCENTAGE")} aria-label="Tipo de desconto da baixa"><option value="AMOUNT">R$</option><option value="PERCENTAGE">%</option></select></div></label><label className={ui.field}>Juros desta baixa<CurrencyInput name="interest" defaultValue="0,00" onValueCentsChange={setPaymentInterest} /></label><label className={ui.field}>Forma de pagamento<select name="paymentMethod" defaultValue={paymentMethods[0] ?? "PIX"}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></label><label className={ui.field}>Data<input name="paidAt" type="date" /></label><label className={`${ui.field} tw:col-span-full tw:w-full tw:max-w-[320px]`}>Observação<textarea name="notes" rows={4} className="tw:min-h-28! tw:resize-y" /></label></div>
          </div>
          <footer className="tw:flex tw:shrink-0 tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} disabled={pending} onClick={closePayment}>Cancelar</button><button className={viewStyles.button_button_success} disabled={pending}>{pending ? "Salvando…" : `${actionLabel} conta`}</button></footer>
        </form>
      </Modal> : null}
      {voidEntry ? <Modal open title={voidEntry.status === "PAID" ? "Estornar pagamento" : "Estornar conta"} width="tw:max-w-[580px]" onClose={() => { if (!pending) setVoidEntry(null); }}>
        <form className="tw:flex tw:min-h-full tw:min-w-0 tw:flex-col tw:gap-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); form.set("entryId", voidEntry.id); run(() => voidFinancialEntryAction(form), () => setVoidEntry(null)); }}>
          <div className="tw:grid tw:min-w-0 tw:gap-2 tw:border-b tw:border-[var(--line)] tw:pb-4"><strong className="tw:break-words tw:text-sm">{voidEntry.description}</strong><span className="tw:text-xs tw:text-[var(--muted)]">{voidEntry.counterpartyName}</span><strong className="tw:text-2xl tw:tabular-nums">{money(voidEntry.amountCents)}</strong></div>
          <label className={viewStyles.field}>Motivo do estorno<textarea name="reason" required minLength={3} maxLength={2000} rows={3} placeholder="Informe o motivo" className="tw:w-full tw:min-w-0 tw:resize-y tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:text-sm" /></label>
          <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">O lançamento e o motivo permanecem no histórico. Este estorno não devolve valores pelo banco ou pela operadora.</p>
          {message ? <p role="alert" className="tw:m-0 tw:text-sm tw:text-red-700">{message}</p> : null}
          <footer className="tw:mt-auto tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-4"><button type="button" className={viewStyles.button_button_small} disabled={pending} onClick={() => setVoidEntry(null)}>Cancelar</button><button className={viewStyles.button_button_danger_button_small} disabled={pending}>{pending ? "Estornando…" : "Confirmar estorno"}</button></footer>
        </form>
      </Modal> : null}
      {confirmationDialog}
    </div>
  );
}

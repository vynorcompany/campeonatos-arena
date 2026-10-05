"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { MoneyInput } from "@/components/forms/money-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { upsertPayrollEntryAction } from "@/lib/actions/finance";
import { calculateEmployeePayroll, type PayrollAmounts } from "@/lib/finance/employee-payroll";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { payrollStyles as styles } from "./employee-payroll-workspace.utilities";

type Employee = { id: string; name: string };
export type EmployeePayrollRow = PayrollAmounts & { id: string; userId: string | null; employeeName: string; referenceMonth: string; notes: string; financialEntry: { amountCents: number; status: string; dueDate: string; paidAt: string; settlements: { amountCents: number; interestCents: number }[] } | null };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
const emptyAmounts: PayrollAmounts = { fixedSalaryCents: 0, monthlyMinutes: 13200, overtimeMinutes: 0, overtimePercentage: 50, bonusCents: 0, benefitsCents: 0, discountCents: 0, advanceCents: 0 };
const hourMinutes = (value: string) => Math.max(0, Math.round((Number(value.replace(",", ".")) || 0) * 60));

function PayrollForm({ employees, entries, referenceMonth, initial, close }: { employees: Employee[]; entries: EmployeePayrollRow[]; referenceMonth: string; initial: EmployeePayrollRow | null; close: () => void }) {
  const [userId, setUserId] = useState(initial?.userId ?? "");
  const [month, setMonth] = useState(initial?.referenceMonth ?? referenceMonth);
  const [amounts, setAmounts] = useState<PayrollAmounts>(initial ?? emptyAmounts);
  const [monthlyHours, setMonthlyHours] = useState(String((initial?.monthlyMinutes ?? 13200) / 60));
  const [overtimeHours, setOvertimeHours] = useState(String((initial?.overtimeMinutes ?? 0) / 60));
  const [status, setStatus] = useState(initial?.financialEntry?.status === "PAID" ? "PAID" : "PENDING");
  const [dueDate, setDueDate] = useState(initial?.financialEntry?.dueDate || today());
  const [paidAt, setPaidAt] = useState(initial?.financialEntry?.paidAt || today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const dismiss = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const matching = entries.find(entry => entry.userId === userId && entry.referenceMonth === month);
  const paid = matching?.financialEntry?.status === "PAID";
  const hasPayments = paid || Boolean(matching?.financialEntry?.settlements.length);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dismiss.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const focusable = Array.from(container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), a[href]') ?? []);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); previous?.focus(); };
  }, [close]);
  const totals = calculateEmployeePayroll(amounts);
  const changeEmployee = (id: string, nextMonth: string) => {
    setUserId(id); setMonth(nextMonth);
    const found = entries.find(entry => entry.userId === id && entry.referenceMonth === nextMonth);
    setAmounts(found ?? emptyAmounts); setMonthlyHours(String((found?.monthlyMinutes ?? 13200) / 60)); setOvertimeHours(String((found?.overtimeMinutes ?? 0) / 60));
    setStatus(found?.financialEntry?.status === "PAID" ? "PAID" : "PENDING"); setDueDate(found?.financialEntry?.dueDate || today()); setPaidAt(found?.financialEntry?.paidAt || today()); setNotes(found?.notes ?? "");
  };
  const moneyFields = [["fixedSalaryCents", "fixedSalary", "Salário base"], ["bonusCents", "bonus", "Adicionais e bônus"], ["benefitsCents", "benefits", "Benefícios"], ["discountCents", "discount", "Descontos"], ["advanceCents", "advance", "Adiantamentos"]] as const;
  return <div className={styles.overlay} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div ref={container} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="employee-payroll-title">
    <header className={styles.toolbar}><div><h2 id="employee-payroll-title" className="tw:m-0 tw:text-lg">{matching ? "Editar folha" : "Nova folha"}</h2><p>Salário e verbas do funcionário.</p></div><button ref={dismiss} type="button" className={styles.secondary} onClick={close} aria-label="Fechar folha">×</button></header>
    <SafeActionForm action={upsertPayrollEntryAction} className={styles.form} successMessage="Folha salva em Contas a Pagar." onSuccess={close}>
      <label>Funcionário<select name="userId" required value={userId} onChange={event => changeEmployee(event.target.value, month)}><option value="">Selecione o funcionário</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
      <label>Mês de referência<input name="referenceMonth" type="month" required value={month} onChange={event => changeEmployee(userId, event.target.value)} /></label>
      {moneyFields.slice(0, 1).map(([key, name, label]) => <label key={key}>{label}<MoneyInput name={name} readOnly={hasPayments} valueCents={amounts[key]} onValueCentsChange={value => setAmounts(current => ({ ...current, [key]: value }))} /></label>)}
      <label>Jornada mensal (horas)<input name="monthlyHours" inputMode="decimal" required readOnly={hasPayments} value={monthlyHours} onChange={event => { setMonthlyHours(event.target.value); setAmounts(current => ({ ...current, monthlyMinutes: hourMinutes(event.target.value) })); }} /></label>
      <label>Horas extras<input name="overtimeHours" inputMode="decimal" readOnly={hasPayments} value={overtimeHours} onChange={event => { setOvertimeHours(event.target.value); setAmounts(current => ({ ...current, overtimeMinutes: hourMinutes(event.target.value) })); }} /></label>
      <label>Adicional da hora extra (%)<input name="overtimePercentage" type="number" min="0" max="300" step="1" required readOnly={hasPayments} value={amounts.overtimePercentage} onChange={event => setAmounts(current => ({ ...current, overtimePercentage: Number(event.target.value) }))} /></label>
      {moneyFields.slice(1).map(([key, name, label]) => <label key={key}>{label}<MoneyInput name={name} readOnly={hasPayments} valueCents={amounts[key]} onValueCentsChange={value => setAmounts(current => ({ ...current, [key]: value }))} /></label>)}
      <p className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[var(--muted)]">Hora extra = salário ÷ jornada mensal × horas extras × (1 + adicional). Informe a jornada e o adicional aplicáveis ao funcionário.</p>
      {hasPayments ? <p className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[var(--muted)]">Os valores já têm pagamentos registrados. Revise baixas e datas em Contas a Pagar.</p> : null}
      <div className={styles.full}><span className="tw:text-xs tw:font-semibold">Status</span><input type="hidden" name="status" value={status} /><div><button type="button" className={styles.status} role="switch" aria-label="Pagamento da folha" aria-checked={status === "PAID"} disabled={paid} onClick={() => setStatus(current => current === "PAID" ? "PENDING" : "PAID")}><i aria-hidden="true" /><span>{status === "PAID" ? "Pago" : "A pagar"}</span></button></div></div>
      <label>Data de vencimento<input name="dueDate" type="date" required value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>
      {status === "PAID" ? <label>Data do pagamento<input name="paidAt" type="date" required readOnly={paid} value={paidAt} onChange={event => setPaidAt(event.target.value)} /></label> : <input type="hidden" name="paidAt" value="" />}
      <label className={styles.full}>Observações<input name="notes" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <div className={styles.preview} aria-live="polite"><span>Horas extras</span><strong>{money(totals.overtimeCents)}</strong><span>Descontos e adiantamentos</span><strong>{money(totals.deductionsCents)}</strong><span>Total líquido</span><strong data-testid="payroll-total">{money(totals.totalCents)}</strong></div>
      <div className="tw:col-span-full tw:flex tw:flex-wrap tw:justify-end tw:gap-2"><button type="button" className={styles.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar folha" pendingLabel="Salvando..." className={styles.button} /></div>
    </SafeActionForm>
  </div></div>;
}

export function EmployeePayrollWorkspace({ employees, entries, referenceMonth }: { employees: Employee[]; entries: EmployeePayrollRow[]; referenceMonth: string }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<{ entry: EmployeePayrollRow | null } | null>(null);
  const close = useRef(() => setForm(null)).current;
  const visible = entries.filter(entry => entry.employeeName.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const summary = entries.reduce((totals, row) => {
    const entry = row.financialEntry;
    if (!entry || entry.status === "VOIDED") return totals;
    const balance = getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status);
    return { total: totals.total + entry.amountCents, paid: totals.paid + balance.paidCents, pending: totals.pending + balance.outstandingCents };
  }, { total: 0, paid: 0, pending: 0 });
  return <section className={styles.page}>
    <header className={styles.toolbar}><div><h1>Folha de pagamento</h1><p>Funcionários da arena e seus pagamentos mensais.</p></div><button type="button" className={styles.button} disabled={!employees.length} onClick={() => setForm({ entry: null })}>Nova folha</button></header>
    <div className={styles.filters}><form method="get" action="/financeiro/folha" className="tw:flex tw:flex-wrap tw:items-center tw:gap-2"><label htmlFor="payroll-month" className="tw:text-sm">Mês</label><input id="payroll-month" name="mes" type="month" defaultValue={referenceMonth} required /><button className={styles.secondary}>Filtrar</button></form><input type="search" aria-label="Buscar funcionário" placeholder="Buscar funcionário..." value={query} onChange={event => setQuery(event.target.value)} /><Link href="/financeiro/contas-a-pagar" className={styles.secondary}>Contas a Pagar</Link></div>
    <div className={styles.summary}><div><span>Total da folha</span><strong>{money(summary.total)}</strong></div><div><span>Pago</span><strong>{money(summary.paid)}</strong></div><div><span>A pagar</span><strong>{money(summary.pending)}</strong></div></div>
    <div className={styles.list}>{visible.map(row => {
      const entry = row.financialEntry;
      const status = entry?.status === "PAID" ? "Pago" : entry?.status === "VOIDED" ? "Cancelado" : entry ? "A pagar" : "Lançamento excluído";
      return <article className={styles.row} key={row.id}><div><strong>{row.employeeName}</strong><small>{row.referenceMonth.split("-").reverse().join("/")} · {row.overtimeMinutes / 60} h extras</small></div><div><strong>{money(entry?.amountCents ?? calculateEmployeePayroll(row).totalCents)}</strong><small>{entry?.status === "PAID" ? "Pago em " + entry.paidAt.split("-").reverse().join("/") : entry?.dueDate ? "Vence em " + entry.dueDate.split("-").reverse().join("/") : ""}</small></div><span className={entry?.status === "PAID" ? "tw:text-xs tw:font-semibold tw:text-emerald-700" : "tw:text-xs tw:font-semibold tw:text-[var(--muted)]"}>{status}</span><button type="button" className={styles.secondary} disabled={!employees.some(employee => employee.id === row.userId) || entry?.status === "VOIDED"} onClick={() => setForm({ entry: row })} aria-label={`Editar folha de ${row.employeeName}`}>Editar</button></article>;
    })}{!visible.length ? <p className="tw:m-0 tw:p-4 tw:text-sm tw:text-[var(--muted)]">{entries.length ? "Nenhuma folha corresponde à busca." : "Nenhuma folha de funcionários neste mês."}</p> : null}</div>
    {!employees.length ? <p className="tw:m-0 tw:text-sm tw:text-[var(--muted)]">Cadastre um usuário na arena para criar uma folha.</p> : null}
    {form ? <PayrollForm employees={employees} entries={entries} referenceMonth={referenceMonth} initial={form.entry} close={close} /> : null}
  </section>;
}

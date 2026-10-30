"use client";
import { MonthPicker } from "@/components/forms/month-picker";
import { Modal } from "@/components/ui/modal";
import { ToggleSwitch } from "@/components/forms/toggle-switch";

import { WorkspaceHeading } from "@/components/ui/workspace-heading";

import Link from "next/link";
import { useRef, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { HoursInput } from "@/components/forms/hours-input";
import { CentavosInput } from "@/components/forms/centavos-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { upsertPayrollEntryAction } from "@/lib/actions/finance";
import { calculateEmployeePayroll, type PayrollAmounts } from "@/lib/finance/employee-payroll";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { payrollStyles as styles } from "./employee-payroll-workspace.utilities";

type Employee = { id: string; name: string };
export type EmployeePayrollRow = PayrollAmounts & { id: string; userId: string | null; employeeName: string; referenceMonth: string; notes: string; financialEntry: { amountCents: number; status: string; dueDate: string; paidAt: string; settlements: { amountCents: number; interestCents: number }[] } | null };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const payrollMoneyFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function PayrollMoneyInput({ name, readOnly, valueCents, onValueCentsChange }: { name: string; readOnly: boolean; valueCents: number; onValueCentsChange: (value: number) => void }) {
  return <span className="tw:relative tw:block tw:min-w-0"><span aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:left-3 tw:top-1/2 tw:-translate-y-1/2 tw:text-xs tw:font-normal">R$</span><CentavosInput name={name} readOnly={readOnly} value={payrollMoneyFormat.format(valueCents / 100)} className="tw:pl-10! tw:tabular-nums" onValueChange={value => onValueCentsChange(Number(value.replace(/\D/g, "")) || 0)} /></span>;
}
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
const emptyAmounts: PayrollAmounts = { fixedSalaryCents: 0, monthlyMinutes: 13200, overtimeMinutes: 0, overtimePercentage: 50, bonusCents: 0, benefitsCents: 0, discountCents: 0, advanceCents: 0 };
const hourMinutes = (value: string) => Math.max(0, Math.round((Number(value.replace(",", ".")) || 0) * 60));

function PayrollForm({ employees, entries, referenceMonth, initial, canCreate, canEdit, canSettle, close }: { employees: Employee[]; entries: EmployeePayrollRow[]; referenceMonth: string; initial: EmployeePayrollRow | null; canCreate: boolean; canEdit: boolean; canSettle: boolean; close: () => void }) {
  const [userId, setUserId] = useState(initial?.userId ?? "");
  const [month, setMonth] = useState(initial?.referenceMonth ?? referenceMonth);
  const [amounts, setAmounts] = useState<PayrollAmounts>(initial ?? emptyAmounts);
  const [monthlyHours, setMonthlyHours] = useState(String((initial?.monthlyMinutes ?? 13200) / 60));
  const [overtimeHours, setOvertimeHours] = useState(String((initial?.overtimeMinutes ?? 0) / 60));
  const [status, setStatus] = useState(initial?.financialEntry?.status === "PAID" ? "PAID" : "PENDING");
  const [dueDate, setDueDate] = useState(initial?.financialEntry?.dueDate || today());
  const [paidAt, setPaidAt] = useState(initial?.financialEntry?.paidAt || today());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const matching = entries.find(entry => entry.userId === userId && entry.referenceMonth === month);
  const canSave = matching ? canEdit : canCreate;
  const paid = matching?.financialEntry?.status === "PAID";
  const hasPayments = paid || Boolean(matching?.financialEntry?.settlements.length);
  const totals = calculateEmployeePayroll(amounts);
  const changeEmployee = (id: string, nextMonth: string) => {
    setUserId(id); setMonth(nextMonth);
    const found = entries.find(entry => entry.userId === id && entry.referenceMonth === nextMonth);
    setAmounts(found ?? emptyAmounts); setMonthlyHours(String((found?.monthlyMinutes ?? 13200) / 60)); setOvertimeHours(String((found?.overtimeMinutes ?? 0) / 60));
    setStatus(found?.financialEntry?.status === "PAID" ? "PAID" : "PENDING"); setDueDate(found?.financialEntry?.dueDate || today()); setPaidAt(found?.financialEntry?.paidAt || today()); setNotes(found?.notes ?? "");
  };
  const moneyFields = [["fixedSalaryCents", "fixedSalary", "Salário base"], ["bonusCents", "bonus", "Adicionais e bônus"], ["benefitsCents", "benefits", "Benefícios"], ["discountCents", "discount", "Descontos"], ["advanceCents", "advance", "Adiantamentos"]] as const;
  return <Modal open title={matching ? "Editar folha" : "Nova folha"} onClose={close} width="tw:max-w-[820px]">
    <SafeActionForm action={upsertPayrollEntryAction} className={styles.form} successMessage="Folha salva em Contas a Pagar." onSuccess={close}>
      <label>Funcionário{!canCreate ? <input type="hidden" name="userId" value={userId} /> : null}<select name={canCreate ? "userId" : undefined} required disabled={!canCreate} value={userId} onChange={event => changeEmployee(event.target.value, month)}><option value="">Selecione o funcionário</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
      <MonthPicker name="referenceMonth" label="Mês de referência" disabled={!canCreate} value={month} onChange={value => changeEmployee(userId, value)} />
      {moneyFields.slice(0, 1).map(([key, name, label]) => <label key={key}>{label}<PayrollMoneyInput name={name} readOnly={hasPayments} valueCents={amounts[key]} onValueCentsChange={value => setAmounts(current => ({ ...current, [key]: value }))} /></label>)}
      <label>Jornada mensal (horas)<HoursInput name="monthlyHours" required readOnly={hasPayments} value={monthlyHours} onValueChange={value => { setMonthlyHours(value); setAmounts(current => ({ ...current, monthlyMinutes: hourMinutes(value) })); }} /></label>
      <label>Horas extras<HoursInput name="overtimeHours" readOnly={hasPayments} value={overtimeHours} onValueChange={value => { setOvertimeHours(value); setAmounts(current => ({ ...current, overtimeMinutes: hourMinutes(value) })); }} /></label>
      <label>Adicional da hora extra (%)<input name="overtimePercentage" type="number" min="0" max="300" step="1" required readOnly={hasPayments} value={amounts.overtimePercentage} onChange={event => setAmounts(current => ({ ...current, overtimePercentage: Number(event.target.value) }))} /></label>
      {moneyFields.slice(1).map(([key, name, label]) => <label key={key}>{label}<PayrollMoneyInput name={name} readOnly={hasPayments} valueCents={amounts[key]} onValueCentsChange={value => setAmounts(current => ({ ...current, [key]: value }))} /></label>)}
      {hasPayments ? <p className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[var(--muted)]">Os valores já têm pagamentos registrados. Revise baixas e datas em Contas a Pagar.</p> : null}
      <div className={styles.full}><input type="hidden" name="status" value={status} /><ToggleSwitch compact label="Pagamento realizado" checked={status === "PAID"} disabled={paid || !canSettle} onCheckedChange={checked => setStatus(checked ? "PAID" : "PENDING")} /></div>
      <label>Data de vencimento<input name="dueDate" type="date" required value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>
      {status === "PAID" ? <label>Data do pagamento<input name="paidAt" type="date" required readOnly={paid} value={paidAt} onChange={event => setPaidAt(event.target.value)} /></label> : <input type="hidden" name="paidAt" value="" />}
      <label className={styles.full}>Observações<input name="notes" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <div className={styles.preview} aria-live="polite"><span>Horas extras</span><strong>{money(totals.overtimeCents)}</strong><span>Descontos e adiantamentos</span><strong>{money(totals.deductionsCents)}</strong><span className="tw:font-semibold">Total líquido</span><strong className="tw:text-lg! tw:font-bold" data-testid="payroll-total">{money(totals.totalCents)}</strong></div>
      {!canSave ? <p className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[var(--muted)]">Você não tem permissão para {matching ? "editar esta folha" : "criar uma nova folha"}.</p> : null}
      <div className="tw:col-span-full tw:flex tw:flex-wrap tw:justify-end tw:gap-2"><button type="button" className={styles.secondary} onClick={close}>Cancelar</button>{canSave ? <SubmitButton label="Salvar folha" pendingLabel="Salvando..." className={styles.button} /> : null}</div>
    </SafeActionForm>
  </Modal>;
}

export function EmployeePayrollWorkspace({ employees, entries, referenceMonth, canCreate, canEdit, canSettle }: { employees: Employee[]; entries: EmployeePayrollRow[]; referenceMonth: string; canCreate: boolean; canEdit: boolean; canSettle: boolean }) {
  const [query, setQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState(referenceMonth);
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
    <WorkspaceHeading title="Folha de pagamento">{canCreate ? <button type="button" className={styles.button} disabled={!employees.length} onClick={() => setForm({ entry: null })}>Nova folha</button> : null}</WorkspaceHeading>
    <div className={styles.filters}><form method="get" action="/financeiro/folha" className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2"><MonthPicker name="mes" value={filterMonth} onChange={setFilterMonth} /><button className={`${styles.secondary} tw:h-9`}>Filtrar</button></form><label className="tw:grid tw:min-w-0 tw:gap-1 tw:text-xs tw:font-semibold">Funcionário<input type="search" aria-label="Buscar funcionário" placeholder="Buscar funcionário..." value={query} onChange={event => setQuery(event.target.value)} /></label><Link href="/financeiro/contas-a-pagar" className={`${styles.secondary} tw:h-9 tw:justify-self-start`}>Contas a Pagar</Link></div>
    <div className={styles.summary}><div><span>Total da folha</span><strong>{money(summary.total)}</strong></div><div><span>Pago</span><strong className="tw:text-emerald-700">{money(summary.paid)}</strong></div><div><span>A pagar</span><strong className="tw:text-red-700">{money(summary.pending)}</strong></div></div>
    <div className={styles.list}>{visible.map(row => {
      const entry = row.financialEntry;
      const status = entry?.status === "PAID" ? "Pago" : entry?.status === "VOIDED" ? "Cancelado" : entry ? "A pagar" : "Lançamento excluído";
      return <article className={styles.row} key={row.id}><div><strong>{row.employeeName}</strong><small>{row.referenceMonth.split("-").reverse().join("/")} · {row.overtimeMinutes / 60} h extras</small></div><div><strong>{money(entry?.amountCents ?? calculateEmployeePayroll(row).totalCents)}</strong><small>{entry?.status === "PAID" ? "Pago em " + entry.paidAt.split("-").reverse().join("/") : entry?.dueDate ? "Vence em " + entry.dueDate.split("-").reverse().join("/") : ""}</small></div><span className={entry?.status === "PAID" ? "tw:text-xs tw:font-semibold tw:text-emerald-700" : "tw:text-xs tw:font-semibold tw:text-[var(--muted)]"}>{status}</span>{canEdit ? <button type="button" className={styles.secondary} disabled={!employees.some(employee => employee.id === row.userId) || entry?.status === "VOIDED"} onClick={() => setForm({ entry: row })} aria-label={`Editar folha de ${row.employeeName}`}>Editar</button> : null}</article>;
    })}{!visible.length ? <p className="tw:m-0 tw:p-4 tw:text-sm tw:text-[var(--muted)]">{entries.length ? "Nenhuma folha corresponde à busca." : "Nenhuma folha de funcionários neste mês."}</p> : null}</div>
    {!employees.length ? <p className="tw:m-0 tw:text-sm tw:text-[var(--muted)]">Cadastre um usuário na arena para criar uma folha.</p> : null}
    {form ? <PayrollForm employees={employees} entries={entries} referenceMonth={referenceMonth} initial={form.entry} canCreate={canCreate} canEdit={canEdit} canSettle={canSettle} close={close} /> : null}
  </section>;
}

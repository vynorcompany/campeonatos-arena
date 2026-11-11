"use client";
import { PaginatedList } from "@/components/ui/list-pagination";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./teacher-monthly-report.utilities";

import { useMemo, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { createTeacherMonthlyPayableAction } from "@/lib/actions/finance";

type ReportRow = { id: string; studentName: string; planName: string; amountCents: number; paidAt: string | null; status: string };

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export function TeacherMonthlyReport({ rows, initialPercent, teacherId, referenceStart, referenceEnd, defaultDueDate, canGeneratePayable }: { rows: ReportRow[]; initialPercent: number; teacherId: string; referenceStart: string; referenceEnd: string; defaultDueDate: string; canGeneratePayable: boolean }) {
  const [includedIds, setIncludedIds] = useState(() => new Set(rows.filter((row) => row.status === "PAID").map((row) => row.id)));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [percent, setPercent] = useState(initialPercent);
  const includedTotal = useMemo(() => rows.filter((row) => includedIds.has(row.id)).reduce((total, row) => total + row.amountCents, 0), [includedIds, rows]);
  const payout = Math.round(includedTotal * (percent / 100));
  return <section className={viewStyles.teacher_report_workspace}>
    <div className={viewStyles.teacher_report_summary}><label>Percentual do professor<input type="number" min="0" max="100" step="0.5" value={percent} onChange={(event) => setPercent(Number(event.target.value) || 0)} /><span>%</span></label><article><span>Total recebido</span><strong>{money(includedTotal)}</strong></article><article><span>Total a pagar</span><strong>{money(payout)}</strong></article></div>
    {canGeneratePayable ? <SafeActionForm action={createTeacherMonthlyPayableAction} successHref="/financeiro/contas-a-pagar" successMessage="Conta a pagar gerada." validate={() => includedIds.size ? null : "Selecione ao menos um recebimento quitado para gerar o a pagar."} className={viewStyles.teacher_report_payable_form}><input type="hidden" name="teacherId" value={teacherId} /><input type="hidden" name="referenceStart" value={referenceStart} /><input type="hidden" name="referenceEnd" value={referenceEnd} /><input type="hidden" name="percentage" value={percent} />{[...includedIds].map((id) => <input key={id} type="hidden" name="entryIds" value={id} />)}<label>Vencimento<input name="dueDate" type="date" required defaultValue={defaultDueDate} /></label><button type="submit" className={viewStyles.button_button_primary}>Gerar a pagar</button><small>O lançamento será enviado para Contas a Pagar, onde você poderá marcar como pago e escolher a forma de pagamento.</small></SafeActionForm> : null}
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:py-2"><label className="tw:flex tw:items-center tw:gap-2 tw:text-xs"><input type="checkbox" checked={rows.length > 0 && selectedIds.size === rows.length} onChange={event => setSelectedIds(event.target.checked ? new Set(rows.map(row => row.id)) : new Set())} />Selecionar todos</label><button type="button" disabled={!selectedIds.size} className={viewStyles.button_button_primary} onClick={() => setIncludedIds(ids => new Set([...ids, ...selectedIds]))}>Incluir selecionados no cálculo</button><button type="button" disabled={!selectedIds.size} className={viewStyles.button_button_small} onClick={() => setIncludedIds(ids => new Set([...ids].filter(id => !selectedIds.has(id))))}>Retirar selecionados</button></div>
    <div className={viewStyles.teacher_report_list}><PaginatedList>{rows.map((row) => { const included = includedIds.has(row.id); return <article key={row.id} className={cx(included ? "is-included" : "is-excluded")}><div><label className="tw:flex tw:items-center tw:gap-2"><input type="checkbox" aria-label={`Selecionar ${row.studentName}`} checked={selectedIds.has(row.id)} onChange={event => setSelectedIds(ids => { const next = new Set(ids); if(event.target.checked) next.add(row.id); else next.delete(row.id); return next; })} /><strong>{row.studentName}</strong></label><span>{row.planName}</span></div><span>{row.paidAt ? new Intl.DateTimeFormat("pt-BR").format(new Date(row.paidAt)) : "Sem pagamento"}</span><strong>{money(row.amountCents)}</strong><button type="button" className={included ? viewStyles.button_button_small : viewStyles.button_button_primary} onClick={() => setIncludedIds((ids) => { const next = new Set(ids); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}>{included ? "Desmarcar do cálculo" : "Incluir no cálculo"}</button></article>; })}{!rows.length ? <p className={viewStyles.muted}>Nenhum pagamento encontrado no período e status selecionados.</p> : null}</PaginatedList></div>
  </section>;
}

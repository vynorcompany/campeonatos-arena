"use client";

import { useMemo, useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { createTeacherMonthlyPayableAction } from "@/lib/actions/finance";

type ReportRow = { id: string; studentName: string; planName: string; amountCents: number; paidAt: string | null; status: string };

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export function TeacherMonthlyReport({ rows, initialPercent, teacherId, referenceStart, referenceEnd, defaultDueDate, canGeneratePayable }: { rows: ReportRow[]; initialPercent: number; teacherId: string; referenceStart: string; referenceEnd: string; defaultDueDate: string; canGeneratePayable: boolean }) {
  const [includedIds, setIncludedIds] = useState(() => new Set(rows.filter((row) => row.status === "PAID").map((row) => row.id)));
  const [percent, setPercent] = useState(initialPercent);
  const includedTotal = useMemo(() => rows.filter((row) => includedIds.has(row.id)).reduce((total, row) => total + row.amountCents, 0), [includedIds, rows]);
  const payout = Math.round(includedTotal * (percent / 100));
  return <section className="teacher-report-workspace">
    <div className="teacher-report-summary"><label>Percentual do professor<input type="number" min="0" max="100" step="0.5" value={percent} onChange={(event) => setPercent(Number(event.target.value) || 0)} /><span>%</span></label><article><span>Total recebido</span><strong>{money(includedTotal)}</strong></article><article><span>Total a pagar</span><strong>{money(payout)}</strong></article></div>
    {canGeneratePayable ? <SafeActionForm action={createTeacherMonthlyPayableAction} successHref="/financeiro/contas-a-pagar" successMessage="Conta a pagar gerada." validate={() => includedIds.size ? null : "Selecione ao menos um recebimento quitado para gerar o a pagar."} className="teacher-report-payable-form"><input type="hidden" name="teacherId" value={teacherId} /><input type="hidden" name="referenceStart" value={referenceStart} /><input type="hidden" name="referenceEnd" value={referenceEnd} /><input type="hidden" name="percentage" value={percent} />{[...includedIds].map((id) => <input key={id} type="hidden" name="entryIds" value={id} />)}<label>Vencimento<input name="dueDate" type="date" required defaultValue={defaultDueDate} /></label><button type="submit" className="button button-primary">Gerar a pagar</button><small>O lançamento será enviado para Contas a Pagar, onde você poderá marcar como pago e escolher a forma de pagamento.</small></SafeActionForm> : null}
    <div className="teacher-report-list">{rows.map((row) => { const included = includedIds.has(row.id); return <article key={row.id} className={included ? "is-included" : "is-excluded"}><div><strong>{row.studentName}</strong><span>{row.planName}</span></div><span>{row.paidAt ? new Intl.DateTimeFormat("pt-BR").format(new Date(row.paidAt)) : "Sem pagamento"}</span><strong>{money(row.amountCents)}</strong><button type="button" className="button button-small" onClick={() => setIncludedIds((ids) => { const next = new Set(ids); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}>{included ? "Desmarcar do cálculo" : "Incluir no cálculo"}</button></article>; })}{!rows.length ? <p className="muted">Nenhum pagamento encontrado no período e status selecionados.</p> : null}</div>
  </section>;
}

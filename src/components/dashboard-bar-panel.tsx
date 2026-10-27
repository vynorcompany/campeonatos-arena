"use client";
import { useState } from "react";
import { DashboardDetailModal } from "@/components/dashboard-detail-modal";
import { DashboardReferenceControl, useDashboardReference } from "@/components/dashboard-reference-control";
import type { DashboardBreakdown } from "@/lib/reports/dashboard-analytics";
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
export function DashboardBarPanel({ id, arenaId, title, description, items, monetary = true, chronological = false, referenceAllowed = true }: { id: string; arenaId: string; title: string; description: string; items: DashboardBreakdown[]; monetary?: boolean; chronological?: boolean; referenceAllowed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reference, changeReference] = useDashboardReference(`arena-dashboard-reference-v1:${arenaId}:${id}`);
  const showReference = referenceAllowed && reference.enabled;
  const format = monetary ? money : (value: number) => value.toLocaleString("pt-BR");
  const max = Math.max(1, ...items.map(item => item.value), showReference ? reference.value : 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return <section className="card dashboard-bar-panel tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:gap-3" aria-labelledby={`chart-${id}`}>
    <header className="tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-start tw:gap-2 tw:pr-5 tw:has-[details[open]]:grid-cols-1 tw:viewport-420:grid-cols-1"><button type="button" className="tw:min-w-0 tw:flex-1 tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-[var(--ink)]" onClick={() => setOpen(true)} aria-label={`Ver detalhes de ${title}`} aria-haspopup="dialog"><h2 id={`chart-${id}`} className="tw:m-0 tw:break-words tw:text-sm tw:font-semibold">{title} <span className="tw:ml-1 tw:text-xs tw:font-normal tw:text-slate-400" aria-hidden="true">↗</span></h2></button>{referenceAllowed ? <DashboardReferenceControl reference={reference} onChange={changeReference} monetary={monetary} periodLabel={chronological ? "Valor por mês; salvo neste navegador." : "Valor por barra; salvo neste navegador."} /> : null}</header>
    {showReference ? <p className="tw:m-0 tw:text-xs tw:text-amber-800">┆ {reference.label}: {format(reference.value)}</p> : null}
    <div className="tw:grid tw:min-w-0 tw:content-start tw:gap-3">
      {items.length ? items.map(item => <button type="button" key={item.id} onClick={() => setOpen(true)} className="tw:grid tw:min-w-0 tw:cursor-pointer tw:gap-1.5 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left" title={`${item.name}: ${format(item.value)}`}><span className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-baseline tw:justify-between tw:gap-x-3 tw:gap-y-1 tw:text-xs"><span className="tw:min-w-0 tw:break-words tw:text-[var(--muted)]">{item.name}</span><strong className={`tw:shrink-0 tw:font-semibold tw:tabular-nums tw:[font-family:Arial,Helvetica,sans-serif] ${monetary ? item.value < 0 || id === "debtors" ? "tw:text-red-700" : "tw:text-emerald-700" : "tw:text-slate-900"}`}>{format(item.value)}</strong></span><span className="tw:relative tw:block tw:h-2 tw:rounded-sm tw:bg-slate-100"><span className="tw:block tw:h-full tw:rounded-sm tw:bg-[var(--brand)]" style={{ width: `${Math.max(0, item.value) / max * 100}%` }} />{showReference ? <span className="tw:absolute tw:-top-1 tw:h-4 tw:border-l-2 tw:border-dashed tw:border-amber-700" style={{ left: `${reference.value / max * 100}%` }} aria-hidden="true" /> : null}</span></button>) : <p className="tw:py-6 tw:text-center tw:text-sm tw:text-[var(--muted)]">Nenhum registro no período.</p>}
    </div>
    {open ? <DashboardDetailModal title={title} description={description} summary={format(total)} items={items.map(item => ({ id: item.id, title: item.name, value: format(item.value) }))} onClose={() => setOpen(false)} /> : null}
  </section>;
}

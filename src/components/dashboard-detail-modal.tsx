"use client";
import { Modal } from "@/components/ui/modal";
import { useCallback } from "react";
export type DashboardDetailItem = { id: string; title: string; subtitle?: string; value?: string; date?: string };
export function DashboardDetailModal({ title, description, summary, items, emptyMessage = "Nenhum registro no período.", onClose }: { title: string; description: string; summary?: string; items: DashboardDetailItem[]; emptyMessage?: string; onClose: () => void }) {
  const close = useCallback(() => onClose(), [onClose]);
  return <Modal title={title} open onClose={close} width="tw:max-w-[880px]" fixedSize>
    <div className="dashboard-detail-body tw:flex tw:min-h-0 tw:min-w-0 tw:flex-col tw:gap-3">
      <div className="tw:grid tw:shrink-0 tw:gap-2 tw:rounded-md tw:bg-slate-50 tw:p-3">{summary ? <strong className="tw:break-words tw:text-xl tw:font-semibold">{summary}</strong> : null}<p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">{description}</p></div>
      <div className="dashboard-metric-list tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:overscroll-contain" tabIndex={0} aria-label={`Registros de ${title}`}>
        {items.length ? items.map(item => <article key={item.id} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:gap-2 tw:border-b tw:border-[var(--line)] tw:py-3 tw:last:border-0 tw:viewport-580:grid-cols-1">
          <div className="tw:grid tw:min-w-0 tw:gap-1"><strong className="tw:break-words tw:text-sm tw:font-semibold">{item.title}</strong>{item.subtitle ? <small className="tw:break-words tw:text-xs tw:text-[var(--muted)]">{item.subtitle}</small> : null}{item.date ? <time dateTime={item.date} className="tw:text-xs tw:text-[var(--muted)]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(item.date) ? `${item.date}T12:00:00` : item.date))}</time> : null}</div>{item.value ? <b className="tw:break-words tw:text-sm tw:font-semibold tw:tabular-nums tw:sm:max-w-72">{item.value}</b> : null}
        </article>) : <p className="tw:py-8 tw:text-center tw:text-sm tw:text-[var(--muted)]">{emptyMessage}</p>}
      </div>
      <span className="tw:shrink-0 tw:text-xs tw:text-[var(--muted)]">{items.length} registros</span>
    </div>
  </Modal>;
}

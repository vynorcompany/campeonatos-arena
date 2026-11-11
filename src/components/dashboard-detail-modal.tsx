"use client";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { ListPagination } from "@/components/ui/list-pagination";
import { paginationRange } from "@/lib/pagination";
import { useCallback, useState } from "react";
export type DashboardDetailItem = { id: string; title: string; subtitle?: string; value?: string; date?: string; href?: string; tone?: "positive" | "negative" | "neutral" };
const colors = { positive: "tw:text-[#087443]", negative: "tw:text-[#b42318]", neutral: "tw:text-[#174983]" };
export function DashboardDetailModal({ title, description, summary, items, emptyMessage = "Nenhum registro no período.", tone, onClose }: { title: string; description: string; summary?: string; tone?: "positive" | "negative" | "neutral"; items: DashboardDetailItem[]; emptyMessage?: string; onClose: () => void }) {
  const close = useCallback(() => onClose(), [onClose]);
  const [page, setPage] = useState(1), [pageSize, setSize] = useState(20);
  const range = paginationRange(items.length, page, pageSize);
  return <Modal title={title} open onClose={close} width="tw:max-w-[920px]" fixedSize heightClassName="tw:bg-[#f5f8fc]! tw:[&>header]:rounded-md tw:[&>header]:border-0 tw:[&>header]:bg-[#174983] tw:[&>header]:p-3 tw:[&>header]:text-white" footer={<ListPagination total={items.length} page={range.page} pageSize={pageSize} label="registros" onChange={(p, s) => { setPage(p); setSize(s); }} />}>
    <div className="dashboard-detail-body tw:flex tw:h-full tw:min-h-0 tw:min-w-0 tw:flex-col tw:gap-3">
      <div className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-x-5 tw:gap-y-2 tw:rounded-md tw:bg-[#e7eef8] tw:px-4 tw:py-3">{summary ? <strong className={`tw:break-words tw:text-2xl tw:font-semibold! tw:tabular-nums ${colors[tone ?? "neutral"]}`}>{summary}</strong> : null}<p className="tw:m-0 tw:max-w-[56ch] tw:text-xs tw:leading-relaxed tw:text-[#354f70]">{description}</p></div>
      <div className="dashboard-metric-list tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:overscroll-contain tw:rounded-md tw:border tw:border-[#d5e1ef] tw:bg-white" tabIndex={0} aria-label={`Registros de ${title}`}>
        {items.length ? items.slice((range.page - 1) * pageSize, range.page * pageSize).map(item => <article key={item.id} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-3 tw:border-b tw:border-[#e3eaf3] tw:px-3 tw:py-2 tw:last:border-0 tw:even:bg-[#f8fafd] tw:viewport-480:grid-cols-1 tw:viewport-480:gap-1">
          <div className="tw:grid tw:min-w-0 tw:gap-1"><strong className="tw:break-words tw:text-sm tw:font-medium">{item.href ? <Link className="tw:text-[#174983] tw:underline-offset-2 tw:hover:underline" href={item.href}>{item.title}</Link> : item.title}</strong><div className="tw:flex tw:min-w-0 tw:flex-wrap tw:gap-x-3 tw:gap-y-1 tw:text-xs tw:text-[#354f70]">{item.subtitle ? <span className="tw:break-words">{item.subtitle}</span> : null}{item.date ? <time dateTime={item.date}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(item.date) ? `${item.date}T12:00:00` : item.date))}</time> : null}</div></div>{item.value ? <b className={`tw:break-words tw:text-sm tw:font-medium tw:tabular-nums tw:sm:max-w-72 ${colors[item.tone ?? "neutral"]}`}>{item.value}</b> : null}
        </article>) : <p className="tw:px-4 tw:py-10 tw:text-center tw:text-sm tw:text-[#354f70]">{emptyMessage}</p>}
      </div>
    </div>
  </Modal>;
}

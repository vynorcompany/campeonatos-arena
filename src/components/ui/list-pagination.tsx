"use client";
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PAGE_SIZES, paginationRange } from "@/lib/pagination";
const button = "tw:bg-[var(--portal-surface,#fff)]! tw:text-[var(--portal-ink,#174983)]! tw:inline-grid tw:size-7 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded tw:border tw:border-[#c7d7ea] tw:bg-white tw:text-[#174983] tw:hover:bg-[#eaf1f9] tw:disabled:cursor-default tw:disabled:opacity-40 tw:focus-visible:outline-2 tw:focus-visible:outline-[#174983]";
export function ListPagination({ total, page, pageSize, onChange, label = "itens" }: { total: number; page: number; pageSize: number; onChange: (page: number, size: number) => void; label?: string }) {
  const range = paginationRange(total, page, pageSize);
  return <nav aria-label={`Paginação de ${label}`} className="tw:col-span-full tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-t tw:border-[#d5e1ef] tw:bg-[var(--portal-surface,#f5f8fc)] tw:px-3 tw:py-2 tw:text-xs tw:font-normal tw:text-[var(--portal-ink,#354f70)] tw:print:hidden tw:dark:border-[#365879] tw:dark:bg-[#102f4b] tw:dark:text-[#e4eaf2]" onClick={e => e.stopPropagation()}>
    <span aria-live="polite">{range.from}–{range.to} de {total} {total === 1 && label.endsWith("s") ? label.slice(0, -1) : label}</span>
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2"><label className="tw:flex tw:items-center tw:gap-2 tw:font-normal!">Por página<select aria-label="Itens por página" className="tw:h-7! tw:min-h-7! tw:w-16! tw:rounded! tw:border tw:border-[#c7d7ea] tw:bg-[var(--portal-surface,#fff)] tw:text-[var(--portal-ink,#354f70)] tw:px-1! tw:py-0! tw:text-xs!" value={pageSize} onChange={e => onChange(1, Number(e.target.value))}>{PAGE_SIZES.map(size => <option key={size}>{size}</option>)}</select></label>
      <button type="button" className={button} disabled={range.page === 1} aria-label="Página anterior" onClick={() => onChange(range.page - 1, pageSize)}><svg aria-hidden="true" className="tw:size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m14 6-6 6 6 6"/></svg></button><span>{range.page} / {range.pages}</span><button type="button" className={button} disabled={range.page === range.pages} aria-label="Próxima página" onClick={() => onChange(range.page + 1, pageSize)}><svg aria-hidden="true" className="tw:size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m10 6 6 6-6 6"/></svg></button>
    </div>
  </nav>;
}
export function ServerListPagination(props: { total: number; page: number; pageSize: number; label?: string }) {
  const router = useRouter(), pathname = usePathname(), search = useSearchParams();
  return <ListPagination {...props} onChange={(page, size) => { const params = new URLSearchParams(search?.toString() ?? ""); params.set("page", String(page)); params.set("pageSize", String(size)); router.replace(`${pathname}?${params}`, { scroll: false }); }} />;
}
/** Paginate an already loaded, locally filtered list without changing totals or exports. */
export function PaginatedList({ children, label, listSemantics = false, onPageIdsChange }: { children: ReactNode; label?: string; listSemantics?: boolean; onPageIdsChange?: (ids: string[]) => void }) {
  const content = Children.toArray(children), empty = content.filter(node => isValidElement(node) && node.type === "p"), items = content.filter(node => !isValidElement(node) || node.type !== "p");
  const [page, setPage] = useState(1), [size, setSize] = useState(20);
  const signature = items.map((item, i) => typeof item === "object" && item && "key" in item ? item.key : i).join("|");
  const search = useSearchParams()?.toString() ?? "";
  const previous = useRef({ signature, search });
  useEffect(() => {
    const url = new URL(window.location.href), ids = new Set([...(url.searchParams.get("ids") ?? "").split(","), ...["player","entry","entryId"].map(key=>url.searchParams.get(key) ?? "")].filter(Boolean));
    let hash = ""; try { hash = decodeURIComponent(url.hash.slice(1)); } catch { /* Ignore malformed external anchors. */ }
    const matches = (node: ReactNode): boolean => {
      if (!isValidElement<{ id?: string; "data-notification-item"?: string; children?: ReactNode }>(node)) return false;
      return Boolean((hash && node.props.id === hash) || ids.has(node.props["data-notification-item"] ?? "") || Children.toArray(node.props.children).some(matches));
    };
    const index = items.findIndex(matches);
    const appended = previous.current.signature.length > 0 && signature.startsWith(`${previous.current.signature}|`) && previous.current.search === search;
    previous.current = { signature, search };
    if (index >= 0) setPage(Math.floor(index / size) + 1);
    else if (!appended) setPage(1);
    // Identity changes reset the list; editing a quantity does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, search]);
  const range = paginationRange(items.length, page, size);
  const visibleIds = items.slice((range.page - 1) * size, range.page * size).map(node => isValidElement<{"data-notification-item"?: string}>(node) ? node.props["data-notification-item"] ?? "" : "").filter(Boolean).join("|");
  useEffect(() => { onPageIdsChange?.(visibleIds ? visibleIds.split("|") : []); }, [visibleIds, onPageIdsChange]);
  const footer = <ListPagination total={items.length} page={range.page} pageSize={size} label={label} onChange={(p, s) => { setPage(p); setSize(s); }} />;
  return <>{items.length ? items.slice((range.page - 1) * size, range.page * size) : empty}{listSemantics ? <li className="tw:col-span-full tw:list-none">{footer}</li> : footer}</>;
}

export function PaginatedTableRows({ children }: { children: ReactNode }) {
  const items = Children.toArray(children), [page, setPage] = useState(1), [size, setSize] = useState(20);
  const range = paginationRange(items.length, page, size);
  const first = items[0];
  const columnCount = isValidElement<{ children?: ReactNode }>(first) ? Children.toArray(first.props.children).reduce<number>((sum, cell) => sum + (isValidElement<{ colSpan?: number }>(cell) ? cell.props.colSpan ?? 1 : 0), 0) : 0;
  return <>{items.slice((range.page - 1) * size, range.page * size)}<tr><td colSpan={columnCount || 100} className="tw:p-0!"><ListPagination total={items.length} page={range.page} pageSize={size} onChange={(p,s)=>{setPage(p);setSize(s);}} /></td></tr></>;
}

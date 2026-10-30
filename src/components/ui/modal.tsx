"use client";
import { operationalTypography } from "./operational-typography.utilities";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

let modalLocks = 0;
let previousBodyOverflow = "";

export function Modal({ title, open, onClose, children, width = "tw:max-w-[620px]", fixedSize = true }: { title: string; open: boolean; onClose: () => void; children: ReactNode; width?: string; fixedSize?: boolean }) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open || !mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    if (modalLocks++ === 0) { previousBodyOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(node => node.getClientRects().length);
    (panel.current?.querySelector<HTMLElement>("[data-modal-autofocus]") ?? focusable()[0] ?? panel.current)?.focus();
    const key = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (event.key === "Escape" && panel.current?.querySelector('[data-modal-popover-open="true"]')) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const items = focusable(); const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key, true);
    return () => { if (--modalLocks === 0) document.body.style.overflow = previousBodyOverflow; document.removeEventListener("keydown", key, true); if (previous?.isConnected) previous.focus(); };
  }, [open, onClose, mounted]);
  if (!mounted || !open) return null;
  return createPortal(<div className={`${operationalTypography} tw:fixed tw:inset-0 tw:z-[1100] tw:grid tw:place-items-center tw:bg-slate-950/40 tw:p-3`} onClick={event => event.stopPropagation()} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`tw:grid tw:w-full tw:min-w-0 tw:gap-4 tw:rounded-xl tw:[&_:where(input:not([type=checkbox]):not([type=radio]),select,textarea)]:rounded-[7px]! tw:border tw:border-[var(--line)] tw:bg-white tw:p-4 tw:text-[var(--ink)] tw:shadow-xl tw:max-h-[calc(100dvh_-_24px)] tw:overflow-y-auto ${width} ${fixedSize ? "tw:h-[min(600px,calc(var(--workspace-viewport-height,100dvh)_-_32px))] tw:grid-rows-[auto_minmax(0,1fr)] tw:overflow-hidden!" : ""}`}><header className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[var(--line)] tw:pb-3"><h2 id={titleId} className="tw:m-0 tw:text-base tw:font-semibold">{title}</h2><button type="button" aria-label={`Fechar ${title}`} onClick={onClose} className="tw:grid tw:size-8 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:text-[var(--muted)] tw:hover:bg-[#1e5ea8] tw:hover:text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="tw:size-4" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>{fixedSize ? <div className="tw:min-h-0 tw:min-w-0 tw:overflow-y-auto tw:overscroll-contain">{children}</div> : children}</section></div>, document.body);
}

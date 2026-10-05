"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function SidebarPopover({ label, trigger, children }: { label: string; trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={container} className="sidebar-popover tw:relative tw:min-w-0" onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button ref={button} type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="tw:flex tw:w-full tw:items-center tw:gap-3 tw:rounded-lg tw:border-0 tw:bg-transparent tw:p-2 tw:text-left tw:text-white tw:cursor-pointer tw:hover:bg-white/10 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-white/70">
      {trigger}<svg className="tw:ml-auto tw:size-4 tw:shrink-0 tw:text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={open ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} /></svg>
    </button>
    {open ? <div id={id} className="sidebar-popover-panel tw:absolute tw:inset-x-0 tw:top-full tw:z-50 tw:mt-1 tw:grid tw:gap-1 tw:rounded-xl tw:border tw:border-solid tw:border-white/20 tw:bg-[#0b2e5b] tw:p-2 tw:text-white tw:shadow-xl">{children}</div> : null}
  </div>;
}

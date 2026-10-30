"use client";
import { useEffect, useId, useRef, useState } from "react";

const months = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, month, 1))));
export function MonthPicker({ name, value, onChange, label = "Mês", disabled = false }: { name: string; value: string; onChange: (value: string) => void; label?: string; disabled?: boolean }) {
  const id = useId(); const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false); const [year, setYear] = useState(Number(value.slice(0, 4)));
  const selectedMonth = Number(value.slice(5, 7)) - 1;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [open]);
  const change = (next: string) => { if (disabled) return; onChange(next); setOpen(false); trigger.current?.focus(); };
  const shift = (delta: number) => { const date = new Date(Date.UTC(Number(value.slice(0, 4)), selectedMonth + delta, 1)); change(date.toISOString().slice(0, 7)); };
  return <div ref={root} data-modal-popover-open={open && !disabled ? true : undefined} className="tw:relative tw:grid tw:min-w-0 tw:gap-1">
    <span id={`${id}-label`} className="tw:text-xs tw:font-semibold">{label}</span><input type="hidden" name={name} value={value} />
    <div className="tw:flex tw:h-9 tw:min-w-0 tw:items-stretch tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white">
      <button type="button" disabled={disabled} aria-label="Mês anterior" className="tw:w-8 tw:shrink-0 tw:rounded-l-md tw:border-0 tw:bg-transparent tw:text-[#174983]" onClick={() => shift(-1)}>‹</button>
      <button ref={trigger} type="button" disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-months`} className="tw:min-w-0 tw:flex-1 tw:whitespace-nowrap tw:border-0 tw:bg-transparent tw:px-1 tw:text-[13px] tw:font-semibold tw:text-[#174983]" onClick={() => { setYear(Number(value.slice(0, 4))); setOpen(current => !current); }}><span id={`${id}-value`}>{months[selectedMonth]?.replace(/^./, letter => letter.toLocaleUpperCase("pt-BR"))} de {value.slice(0, 4)}</span></button>
      <button type="button" disabled={disabled} aria-label="Próximo mês" className="tw:w-8 tw:shrink-0 tw:rounded-r-md tw:border-0 tw:bg-transparent tw:text-[#174983]" onClick={() => shift(1)}>›</button>
    </div>
    {open && !disabled ? <div id={`${id}-months`} role="group" aria-label="Selecionar mês" className="tw:absolute tw:top-full tw:left-0 tw:z-40 tw:mt-2 tw:w-[280px] tw:max-w-[calc(100vw-32px)] tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:shadow-lg">
      <div className="tw:mb-3 tw:flex tw:items-center tw:justify-between tw:text-sm"><button type="button" aria-label="Ano anterior" onClick={() => setYear(current => Math.max(1900, current - 1))} className="tw:size-8 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white">‹</button><strong>{year}</strong><button type="button" aria-label="Próximo ano" onClick={() => setYear(current => Math.min(2100, current + 1))} className="tw:size-8 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white">›</button></div>
      <div className="tw:grid tw:grid-cols-3 tw:gap-1">{months.map((month, index) => <button key={month} type="button" aria-pressed={year === Number(value.slice(0, 4)) && selectedMonth === index} className="tw:min-h-9 tw:rounded-md tw:border-0 tw:bg-white tw:px-1 tw:text-xs tw:capitalize tw:text-[#174983] tw:aria-pressed:bg-[#174983] tw:aria-pressed:text-white tw:hover:outline-1 tw:hover:outline-[#174983]" onClick={() => change(`${year}-${String(index + 1).padStart(2, "0")}`)}>{month}</button>)}</div>
    </div> : null}
  </div>;
}

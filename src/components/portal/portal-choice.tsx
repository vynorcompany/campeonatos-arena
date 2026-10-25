"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { value: string; label: string };
export function PortalChoice({ label, name, defaultValue, options, navigate = false }: { label: string; name?: string; defaultValue: string; options: Option[]; navigate?: boolean }) {
  const router = useRouter();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(Math.max(0, options.findIndex(option => option.value === defaultValue)));
  useEffect(() => { setSelected(defaultValue); setOpen(false); }, [defaultValue]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const choose = (index: number) => {
    const option = options[index]; if (!option) return;
    setSelected(option.value); setActive(index); setOpen(false);
    if (navigate) router.push(option.value);
    else if (input.current) { input.current.value = option.value; input.current.form?.requestSubmit(); }
  };
  return <div ref={root} className="tw:relative tw:min-w-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span id={`${id}-label`} className="tw:mb-2 tw:block tw:text-[10px] tw:font-bold tw:tracking-[.12em] tw:text-[#607467] tw:uppercase tw:dark:text-[#aac2b5]">{label}</span>
    {name ? <input ref={input} type="hidden" name={name} defaultValue={defaultValue} /> : null}
    <button type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-labelledby={`${id}-label ${id}-value`} aria-activedescendant={open ? `${id}-option-${active}` : undefined} className="tw:flex tw:min-h-12 tw:w-full tw:min-w-0 tw:cursor-pointer tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-[#c7dfd0] tw:bg-[#f5faf6] tw:px-4 tw:py-3 tw:text-left tw:text-sm tw:font-semibold tw:text-[#163d2d] tw:shadow-sm tw:transition-colors tw:hover:border-[#078f7c] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#078f7c] tw:dark:border-[#386154] tw:dark:bg-[#173d32] tw:dark:text-[#edfaef]" onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(value => open ? (value + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length : Math.max(0, options.findIndex(option => option.value === selected))); }
      else if (event.key === "Home" || event.key === "End") { event.preventDefault(); setOpen(true); setActive(event.key === "Home" ? 0 : options.length - 1); }
      else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (open) choose(active); else setOpen(true); }
      else if (event.key.length === 1) { const index = options.findIndex(option => option.label.toLocaleLowerCase("pt-BR").startsWith(event.key.toLocaleLowerCase("pt-BR"))); if (index >= 0) { setOpen(true); setActive(index); } }
    }}><span id={`${id}-value`} className="tw:min-w-0 tw:break-words">{options.find(option => option.value === selected)?.label || "Selecione"}</span><svg className={`tw:size-4 tw:shrink-0 tw:transition-transform tw:motion-reduce:transition-none ${open ? "tw:rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button>
    {open ? <ul role="listbox" aria-labelledby={`${id}-label`} id={`${id}-list`} className="tw:absolute tw:inset-x-0 tw:top-full tw:z-30 tw:mt-2 tw:max-h-64 tw:overflow-y-auto tw:rounded-2xl tw:border tw:border-[#c7dfd0] tw:bg-white tw:p-1.5 tw:shadow-xl tw:dark:border-[#386154] tw:dark:bg-[#103126]">
      {options.map((option, index) => <li id={`${id}-option-${index}`} key={option.value} role="option" aria-selected={option.value === selected} onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)} className={`tw:flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:justify-between tw:gap-2 tw:rounded-xl tw:px-3 tw:py-2.5 tw:text-sm ${active === index ? "tw:bg-[#e1f2e6] tw:text-[#143c2a] tw:dark:bg-[#b6f36c] tw:dark:text-[#163429]" : "tw:text-[#203c2e] tw:dark:text-[#eaf3e9]"}`}><span className="tw:break-words">{option.label}</span>{option.value === selected ? <span aria-hidden="true">✓</span> : null}</li>)}
    </ul> : null}
  </div>;
}

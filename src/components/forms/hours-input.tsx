"use client";

import type { InputHTMLAttributes } from "react";

/** Decimal hours use a comma on screen and remain compatible with payroll's minute conversion. */
export function HoursInput({ value, onValueChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & { value: string; onValueChange: (value: string) => void }) {
  return <span className="tw:relative tw:block tw:min-w-0"><input {...props} type="text" inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" title="Informe horas, por exemplo 1,50 para uma hora e meia." value={value} onFocus={event => event.currentTarget.select()} onChange={event => { const next = event.target.value.replace(".", ","); if (/^\d*(?:,\d{0,2})?$/.test(next)) onValueChange(next); }} onBlur={() => { if (value && Number.isFinite(Number(value.replace(",", ".")))) onValueChange(Number(value.replace(",", ".")).toLocaleString("pt-BR", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 })); }} className="tw:pr-8!" /><span aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:inset-y-0 tw:right-3 tw:flex tw:items-center tw:text-xs tw:text-[var(--muted)]">h</span></span>;
}

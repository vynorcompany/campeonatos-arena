"use client";

import type { InputHTMLAttributes } from "react";

/** Digits enter as cents: 1234 → 12,34. The callback stays in Brazilian money notation. */
export function CentavosInput({ value, onValueChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & { value: string; onValueChange: (value: string) => void }) {
  return <input {...props} type="text" inputMode="numeric" value={value} onFocus={event => { event.currentTarget.select(); props.onFocus?.(event); }} onChange={event => {
    const digits = event.currentTarget.value.replace(/\D/g, "");
    if (!digits) { onValueChange(""); return; }
    const cents = Math.min(Number(digits), 2_147_483_647);
    onValueChange(new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100));
  }} />;
}

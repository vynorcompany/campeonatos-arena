"use client";

import { useEffect, useState } from "react";

import { formatMoneyInput } from "@/lib/format-money-input";
export { formatMoneyInput } from "@/lib/format-money-input";
function parseMoneyInput(value: string) { const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."); return Math.max(0, Math.round((Number(normalized) || 0) * 100)); }
export function MoneyInput({ valueCents, onValueCentsChange, name, required, placeholder = "0,00", defaultValue, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & { valueCents?: number; defaultValue?: string; onValueCentsChange?: (cents: number) => void }) {
  const controlled = valueCents !== undefined; const [value, setValue] = useState(controlled ? formatMoneyInput(valueCents) : defaultValue ?? ""); const [focused, setFocused] = useState(false);
  useEffect(() => { if (controlled && !focused) setValue(formatMoneyInput(valueCents)); }, [controlled, focused, valueCents]);
  return <input {...props} name={name} required={required} inputMode="decimal" value={value} onFocus={(event) => { setFocused(true); event.currentTarget.select(); }} onChange={(event) => { setValue(event.target.value); onValueCentsChange?.(parseMoneyInput(event.target.value)); }} onBlur={() => { setFocused(false); if (value.trim()) setValue(formatMoneyInput(parseMoneyInput(value))); }} placeholder={placeholder} />;
}

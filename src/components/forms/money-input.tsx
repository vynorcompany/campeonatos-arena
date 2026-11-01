"use client";

import { useEffect, useState } from "react";

import { formatMaskedMoney, moneyDigitsToCents, pastedMoneyToCents } from "@/lib/money-input-mask";
import { formatMoneyInput } from "@/lib/format-money-input";
export { formatMoneyInput } from "@/lib/format-money-input";
function parseMoneyInput(value: string) { const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."); return Math.max(0, Math.round((Number(normalized) || 0) * 100)); }
export function MoneyInput({ valueCents, onValueCentsChange, name, required, placeholder = "0,00", defaultValue, smart = false, onBlur, onFocus, onPaste, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & { smart?: boolean; valueCents?: number; defaultValue?: string; onValueCentsChange?: (cents: number) => void }) {
  const format = smart ? formatMaskedMoney : formatMoneyInput;
  const controlled = valueCents !== undefined; const [value, setValue] = useState(controlled ? format(valueCents) : defaultValue ?? ""); const [focused, setFocused] = useState(false);
  useEffect(() => { if (controlled && !focused) setValue(format(valueCents)); }, [controlled, focused, valueCents, format]);
  return <input {...props} name={name} required={required} inputMode="decimal" value={value} onFocus={(event) => { setFocused(true); event.currentTarget.select(); onFocus?.(event); }} onChange={(event) => { const cents = smart ? moneyDigitsToCents(event.target.value) : parseMoneyInput(event.target.value); setValue(smart ? format(cents) : event.target.value); onValueCentsChange?.(cents); }} onPaste={event => { onPaste?.(event); if (!smart || event.defaultPrevented) return; event.preventDefault(); const cents = pastedMoneyToCents(event.clipboardData.getData("text")); setValue(format(cents)); onValueCentsChange?.(cents); }} onBlur={event => { setFocused(false); if (value.trim()) setValue(format(parseMoneyInput(value))); onBlur?.(event); }} placeholder={placeholder} />;
}

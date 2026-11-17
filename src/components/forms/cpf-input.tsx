"use client";
import { useState, type InputHTMLAttributes } from "react";
/** Presentation only: the canonical action remains responsible for document validation. */
export function CpfInput({ defaultValue = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & { defaultValue?: string }) {
  const format = (input: string) => input.replace(/\D/g, "").slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  const [value, setValue] = useState(() => format(defaultValue));
  return <input {...props} inputMode="numeric" maxLength={14} value={value} onChange={event => setValue(format(event.target.value))}/>;
}

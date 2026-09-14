"use client";

import { useRef, useState } from "react";

function formatCents(digits: string) {
  const cents = Number(digits || "0");
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function CurrencyInput({ defaultValue = "0,00", ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "onChange"> & { defaultValue?: string }) {
  const initial = defaultValue.replace(/\D/g, "") || "0";
  const [digits, setDigits] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  return <input {...props} ref={ref} inputMode="numeric" value={formatCents(digits)} onChange={(event) => {
    const raw = event.currentTarget.value;
    const caret = event.currentTarget.selectionStart ?? raw.length;
    const digitOffset = raw.slice(0, caret).replace(/\D/g, "").length;
    const next = raw.replace(/\D/g, "") || "0";
    setDigits(next);
    requestAnimationFrame(() => {
      const input = ref.current;
      if (!input) return;
      const target = formatCents(next);
      let seen = 0;
      let position = target.length;
      for (let index = 0; index < target.length; index += 1) {
        if (/\d/.test(target[index])) seen += 1;
        if (seen >= digitOffset) { position = index + 1; break; }
      }
      input.setSelectionRange(position, position);
    });
  }} />;
}

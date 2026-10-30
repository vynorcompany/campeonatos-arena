"use client";

import { useEffect, useRef, useState } from "react";

function formatCents(digits: string, negative = false) {
  const cents = Number(digits || "0");
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((negative ? -cents : cents) / 100);
}

export function CurrencyInput({
  defaultValue = "0,00",
  allowNegative = false,
  valueCents,
  onValueCentsChange,
  ...props
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange"
> & {
  defaultValue?: string;
  valueCents?: number;
  allowNegative?: boolean;
  onValueCentsChange?: (cents: number) => void;
}) {
  const initial =
    valueCents === undefined
      ? defaultValue.replace(/\D/g, "") || "0"
      : String(Math.abs(valueCents));
  const [digits, setDigits] = useState(initial);
  const [negative, setNegative] = useState(
    allowNegative && defaultValue.includes("-"),
  );
  useEffect(() => {
    if (valueCents !== undefined) {
      setDigits(String(Math.abs(valueCents)));
      setNegative(allowNegative && valueCents < 0);
    }
  }, [valueCents, allowNegative]);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      {...props}
      ref={ref}
      inputMode={allowNegative ? "decimal" : "numeric"}
      value={formatCents(digits, negative)}
      onFocus={(event) => {
        event.currentTarget.select();
        props.onFocus?.(event);
      }}
      onPaste={(event) => {
        props.onPaste?.(event);
        if (event.defaultPrevented) return;
        const pasted = event.clipboardData
          .getData("text")
          .trim()
          .replace(/\s/g, "");
        const match = pasted.match(
          /^(-?)(?:R\$)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/,
        );
        if (!match || (match[1] && !allowNegative)) return;
        event.preventDefault();
        const cents = Math.min(
          Number(match[2].replace(/\./g, "")) * 100 +
            Number((match[3] ?? "").padEnd(2, "0")),
          2_147_483_647,
        );
        const nextNegative = allowNegative && Boolean(match[1]);
        setDigits(String(cents));
        setNegative(nextNegative);
        onValueCentsChange?.(cents * (nextNegative ? -1 : 1));
        requestAnimationFrame(() => {
          const input = ref.current;
          if (input)
            input.setSelectionRange(input.value.length, input.value.length);
        });
      }}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        const caret = event.currentTarget.selectionStart ?? raw.length;
        const digitsToRight = raw.slice(caret).replace(/\D/g, "").length;
        const next = String(
          Math.min(Number(raw.replace(/\D/g, "") || "0"), 2_147_483_647),
        );
        const nextNegative = allowNegative && raw.includes("-");
        setNegative(nextNegative);
        setDigits(next);
        onValueCentsChange?.(Number(next) * (nextNegative ? -1 : 1));
        requestAnimationFrame(() => {
          const input = ref.current;
          if (!input) return;
          const target = formatCents(next, nextNegative);
          let seen = 0;
          let position = target.length;
          for (
            let index = target.length - 1;
            digitsToRight > 0 && index >= 0;
            index -= 1
          ) {
            if (/\d/.test(target[index])) seen += 1;
            if (seen === digitsToRight) {
              position = index;
              break;
            }
          }
          input.setSelectionRange(position, position);
        });
      }}
    />
  );
}

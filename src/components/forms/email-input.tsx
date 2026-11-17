"use client";
import { useState, type InputHTMLAttributes } from "react";

export function EmailInput({ defaultValue = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [invalid, setInvalid] = useState(false);
  return <><input {...props} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={value} aria-invalid={invalid || undefined} aria-describedby={invalid && props.id ? `${props.id}-error` : props["aria-describedby"]} onChange={event => { setValue(event.target.value.replace(/\s/g, "")); setInvalid(false); }} onBlur={event => { setInvalid(!event.target.validity.valid); props.onBlur?.(event); }} />{invalid ? <span id={props.id ? `${props.id}-error` : undefined} role="status" className="tw:text-xs tw:text-[#a02119]">Informe um e-mail válido.</span> : null}</>;
}

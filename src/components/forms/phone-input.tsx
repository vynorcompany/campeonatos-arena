"use client";
import { useState, type InputHTMLAttributes } from "react";
import { formatBrazilianPhone } from "@/lib/phone";
export function PhoneInput({ defaultValue = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>,"value"|"defaultValue"|"onChange"> & {defaultValue?:string}) {
  const [value,setValue]=useState(()=>formatBrazilianPhone(defaultValue));
  return <input {...props} type="tel" inputMode="tel" autoComplete="tel" value={value} onChange={event=>setValue(formatBrazilianPhone(event.target.value))}/>;
}

"use client";
import { useState } from "react";

/** Separate native controls keep every date and time segment readable on narrow forms. */
export function LocalDateTimeField({ name, label, defaultValue = "", className }: { name: string; label: string; defaultValue?: string; className?: string }) {
  const [date, setDate] = useState(defaultValue.split("T")[0] ?? "");
  const [time, setTime] = useState(defaultValue.split("T")[1]?.slice(0, 5) ?? "");
  const input = "tw:w-full tw:min-w-0 tw:max-w-full tw:box-border";
  return <div className={className}>
    <span id={`${name}-caption`} className="tw:text-sm tw:font-semibold">{label}</span>
    <div role="group" aria-labelledby={`${name}-caption`} className="tw:grid tw:min-w-0 tw:grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] tw:gap-3">
      <label className="tw:grid tw:min-w-0 tw:gap-1"><span className="tw:text-xs tw:font-medium tw:text-[var(--text)]">Data</span><input id={`${name}-date`} type="date" max="9999-12-31" aria-label={`${label}: data`} className={input} value={date} required={Boolean(time)} onChange={event => { const next = event.target.value; setDate(next); setTime(current => next ? current || "00:00" : ""); }}/></label>
      <label className="tw:grid tw:min-w-0 tw:gap-1"><span className="tw:text-xs tw:font-medium tw:text-[var(--text)]">Horário</span><input id={`${name}-time`} type="time" aria-label={`${label}: horário`} className={input} value={time} required={Boolean(date)} onChange={event => setTime(event.target.value)}/></label>
    </div>
    <input name={name} type="hidden" value={date && time ? `${date}T${time}` : ""}/>
  </div>;
}

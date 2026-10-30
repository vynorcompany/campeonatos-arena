"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./agenda-month-picker.utilities";

import Link from "next/link";
import { EventIcon } from "@/components/tournaments/event-icon";
import { useEffect, useMemo, useRef, useState } from "react";

type AgendaMonthPickerProps = { selectedDate: string };

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function AgendaMonthPicker({ selectedDate }: AgendaMonthPickerProps) {
  const picker = useRef<HTMLDetailsElement>(null);
  const [month, setMonth] = useState(() => new Date(`${selectedDate}T12:00:00`));
  useEffect(() => {
    setMonth(new Date(`${selectedDate}T12:00:00`));
    if (picker.current) picker.current.open = false;
  }, [selectedDate]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (picker.current?.open && !picker.current.contains(event.target as Node)) picker.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && picker.current?.open) {
        picker.current.open = false;
        picker.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, []);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month);

  return <details ref={picker} className={viewStyles.agenda_month_picker}>
    <summary aria-label="Abrir calendário mensal" title="Calendário mensal"><EventIcon name="calendar" size={16} /></summary>
    <div className={viewStyles.agenda_month_picker_panel} role="dialog" aria-label="Calendário mensal">
      <header><button type="button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button><strong>{title}</strong><button type="button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} aria-label="Próximo mês">›</button></header>
      <div className={viewStyles.agenda_month_picker_weekdays}>{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className={viewStyles.agenda_month_picker_days}>{days.map((day) => {
        const value = dateValue(day);
        const outsideMonth = day.getMonth() !== month.getMonth();
        return <Link key={value} onClick={() => { if (picker.current) { picker.current.open = false; picker.current.querySelector("summary")?.focus(); } }} aria-current={value === selectedDate ? "date" : undefined} aria-label={new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(day)} href={`/agenda?data=${value}`} className={cx(`${outsideMonth ? "is-outside" : ""} ${value === selectedDate ? "is-selected" : ""}`)}>{day.getDate()}</Link>;
      })}</div>
    </div>
  </details>;
}

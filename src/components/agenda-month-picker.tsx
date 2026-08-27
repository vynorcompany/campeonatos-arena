"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type AgendaMonthPickerProps = { selectedDate: string };

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function AgendaMonthPicker({ selectedDate }: AgendaMonthPickerProps) {
  const [month, setMonth] = useState(() => new Date(`${selectedDate}T12:00:00`));
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

  return <details className="agenda-month-picker">
    <summary aria-label="Abrir calendário mensal" title="Calendário mensal">▦</summary>
    <div className="agenda-month-picker-panel" role="dialog" aria-label="Calendário mensal">
      <header><button type="button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button><strong>{title}</strong><button type="button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} aria-label="Próximo mês">›</button></header>
      <div className="agenda-month-picker-weekdays">{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="agenda-month-picker-days">{days.map((day) => {
        const value = dateValue(day);
        const outsideMonth = day.getMonth() !== month.getMonth();
        return <Link key={value} href={`/agenda?data=${value}`} className={`${outsideMonth ? "is-outside" : ""} ${value === selectedDate ? "is-selected" : ""}`}>{day.getDate()}</Link>;
      })}</div>
    </div>
  </details>;
}

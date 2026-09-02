"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function CalendarIcon() {
  return <svg className="commands-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /></svg>;
}

type CommandsDatePickerProps = { selectedDate: string; search: string; openDays: string[]; today: string };

function parseDate(value: string) { return new Date(`${value}T00:00:00`); }

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CommandsDatePicker({ selectedDate, search, openDays, today }: CommandsDatePickerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const selected = parseDate(selectedDate);
  const calendarStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
  const openDaySet = new Set(openDays);

  function selectDay(day: Date) {
    const params = new URLSearchParams({ date: toDateInput(day) });
    if (search) params.set("search", search);
    setIsOpen(false);
    router.push(`/comandas?${params}`);
  }

  return <>
    <button className="commands-date-trigger" type="button" onClick={() => setIsOpen(true)} aria-haspopup="dialog" aria-expanded={isOpen}>
      <span className="commands-date-icon" aria-hidden="true"><CalendarIcon /></span>
      <span className="commands-date-copy"><span>Comandas do dia</span><strong>{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(selected)}</strong></span>
      <span className="commands-date-chevron" aria-hidden="true">⌄</span>
    </button>
    {isOpen ? <div className="commands-calendar-modal-overlay" role="presentation" onMouseDown={() => setIsOpen(false)}>
      <section className="commands-calendar-modal" role="dialog" aria-modal="true" aria-label="Selecionar dia das comandas" onMouseDown={(event) => event.stopPropagation()}>
        <div className="commands-calendar-modal-head"><div><span>Comandas</span><strong>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(selected)}</strong></div><button className="button button-small" type="button" onClick={() => setIsOpen(false)}>Fechar</button></div>
        <p>O ponto vermelho indica comandas abertas em dias anteriores.</p>
        <div className="commands-calendar-grid">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}{calendarDays.map((day) => {
          const key = toDateInput(day);
          const isSelected = key === selectedDate;
          const hasOpen = key < today && openDaySet.has(key);
          return <button key={key} type="button" onClick={() => selectDay(day)} className={`commands-calendar-day${isSelected ? " commands-calendar-day-active" : ""}${day.getMonth() !== selected.getMonth() ? " commands-calendar-day-muted" : ""}`}>{day.getDate()}{hasOpen ? <i className="calendar-open-indicator" aria-label="Há comandas abertas" /> : null}</button>;
        })}</div>
      </section>
    </div> : null}
  </>;
}

"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./commands-date-picker.utilities";

import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { useCallback, useState } from "react";

function CalendarIcon() {
  return <svg className={viewStyles.commands_icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></svg>;
}

function ChevronDownIcon() {
  return <svg className={viewStyles.commands_icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>;
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
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const close = useCallback(() => setIsOpen(false), []);
  const calendarStart = new Date(month.getFullYear(), month.getMonth(), 1);
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
    <button className={viewStyles.commands_date_trigger} type="button" onClick={() => { setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); setIsOpen(true); }} aria-haspopup="dialog" aria-expanded={isOpen}>
      <span className={viewStyles.commands_date_icon} aria-hidden="true"><CalendarIcon /></span>
      <span className={viewStyles.commands_date_copy}><span>Comandas do dia</span><strong>{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(selected)}</strong></span>
      <span className={viewStyles.commands_date_chevron} aria-hidden="true"><ChevronDownIcon /></span>
    </button>
    <Modal title="Selecionar dia das comandas" open={isOpen} onClose={close} width="tw:max-w-[380px] tw:rounded!">
        <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
          <button type="button" aria-label="Mês anterior" className={viewStyles.month_button} onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}>‹</button>
          <strong aria-live="polite" className="tw:text-sm tw:font-semibold tw:capitalize">{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month)}</strong>
          <button type="button" aria-label="Próximo mês" className={viewStyles.month_button} onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}>›</button>
        </div>
        <div className={viewStyles.commands_calendar_grid}>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}{calendarDays.map((day) => {
          const key = toDateInput(day);
          const isSelected = key === selectedDate;
          const hasOpen = key < today && openDaySet.has(key);
          return <button key={key} type="button" aria-label={`${new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(day)}${hasOpen ? ", comanda em aberto" : ""}`} aria-pressed={isSelected} aria-current={key === today ? "date" : undefined} onClick={() => selectDay(day)} className={cx(`${viewStyles.commands_calendar_day}${isSelected ? " " + viewStyles.commands_calendar_day_active : ""}${day.getMonth() !== month.getMonth() ? " " + viewStyles.commands_calendar_day_muted : ""}`)}>{day.getDate()}{hasOpen ? <i className={viewStyles.calendar_open_indicator} aria-label="Há comandas abertas" /> : null}</button>;
        })}</div>
        <footer className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-[var(--line)] tw:pt-3"><small className="tw:text-[11px] tw:text-[var(--muted)]">• Há comandas abertas neste dia</small><button type="button" className={viewStyles.month_button} onClick={() => selectDay(parseDate(today))}>Hoje</button></footer>
    </Modal>
  </>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { createCalendarEventAction } from "@/lib/actions/calendar";

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function buildDateFromTimeline(dayKey: string, minuteOffset: number) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1, 6, 0, 0, 0);
  date.setMinutes(minuteOffset);
  return date;
}

export function CalendarQuickCreate() {
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(new Date()));

  const defaultDuration = 60;

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const trigger = target.closest("[data-calendar-create]");

      if (trigger) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      const timelineCell = target.closest(".calendar-time-day") as HTMLElement | null;
      if (!timelineCell) return;
      if (target.closest(".calendar-time-event")) return;

      const dayKey = timelineCell.dataset.day;
      if (!dayKey) return;

      const rect = timelineCell.getBoundingClientRect();
      const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      const minuteOffset = Math.floor((offsetY / 72) * 60);
      const pickedDate = buildDateFromTimeline(dayKey, minuteOffset);
      setScheduledAt(toDateTimeLocalValue(pickedDate));
      setOpen(true);
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const close = () => setOpen(false);

  const dateHint = useMemo(() => {
    const date = new Date(scheduledAt);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR");
  }, [scheduledAt]);

  if (!open) return null;

  return (
    <div className="calendar-create-overlay" role="dialog" aria-modal="true" aria-label="Criar agendamento">
      <div className="calendar-create-card">
        <button type="button" className="calendar-create-close" onClick={close} aria-label="Fechar">×</button>
        <h3>Adicionar título</h3>
        <form action={createCalendarEventAction} className="calendar-create-form" onSubmit={close}>
          <div className="field">
            <label htmlFor="event-title">Título</label>
            <input id="event-title" name="title" type="text" required autoFocus />
          </div>

          <div className="calendar-create-tabs">
            <span className="calendar-create-tab-active">Evento</span>
            <span>Tarefa</span>
            <span>Agendamento</span>
          </div>

          <div className="field">
            <label htmlFor="event-type">Tipo</label>
            <select id="event-type" name="eventType" defaultValue="EVENTO">
              <option value="EVENTO">Evento</option>
              <option value="AULA">Aula</option>
              <option value="TORNEIO">Torneio</option>
              <option value="JOGO">Jogo</option>
              <option value="REUNIAO">Reunião</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="event-date">Data e hora</label>
            <input id="event-date" name="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.currentTarget.value)} required />
            <small className="muted">{dateHint}</small>
          </div>

          <div className="field">
            <label htmlFor="event-duration">Duração (min)</label>
            <input id="event-duration" name="durationMinutes" type="number" min="15" step="15" defaultValue={defaultDuration} />
          </div>

          <div className="field">
            <label htmlFor="event-notes">Descrição</label>
            <input id="event-notes" name="notes" type="text" placeholder="Adicionar descrição" />
          </div>

          <div className="calendar-create-actions">
            <button type="button" className="button" onClick={close}>Cancelar</button>
            <SubmitButton label="Salvar" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </form>
      </div>
    </div>
  );
}

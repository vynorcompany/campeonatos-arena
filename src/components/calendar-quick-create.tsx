"use client";

import { useEffect, useMemo, useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { createCalendarEventAction, updateCalendarEventAction } from "@/lib/actions/calendar";

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

type FormState = {
  sourceType: "lesson" | "calendar";
  lessonId: string;
  calendarEventId: string;
  title: string;
  eventType: string;
  scheduledAt: string;
  durationMinutes: number;
  notes: string;
};

const initialState: FormState = {
  sourceType: "calendar",
  lessonId: "",
  calendarEventId: "",
  title: "",
  eventType: "EVENTO",
  scheduledAt: toDateTimeLocalValue(new Date()),
  durationMinutes: 60,
  notes: ""
};

export function CalendarQuickCreate() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(initialState);
  const isEditing = Boolean(state.lessonId || state.calendarEventId);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const trigger = target.closest("[data-calendar-create]");

      if (trigger) {
        event.preventDefault();
        setState({
          ...initialState,
          scheduledAt: toDateTimeLocalValue(new Date())
        });
        setOpen(true);
        return;
      }

      const eventButton = target.closest("[data-calendar-event='1']") as HTMLElement | null;
      if (eventButton) {
        event.preventDefault();
        const lessonId = eventButton.dataset.lessonId ?? "";
        const calendarEventId = eventButton.dataset.calendarEventId ?? "";
        const sourceType = (eventButton.dataset.sourceType as "lesson" | "calendar" | undefined) ?? "calendar";
        const title = eventButton.dataset.title ?? "";
        const eventType = eventButton.dataset.eventType ?? "EVENTO";
        const scheduledAtRaw = eventButton.dataset.scheduledAt ?? "";
        const durationMinutes = Number(eventButton.dataset.durationMinutes ?? "60");
        const notes = eventButton.dataset.notes ?? "";
        const date = scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();

        setState({
          sourceType,
          lessonId,
          calendarEventId,
          title,
          eventType,
          scheduledAt: toDateTimeLocalValue(Number.isNaN(date.getTime()) ? new Date() : date),
          durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 60,
          notes
        });
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

      setState({
        ...initialState,
        scheduledAt: toDateTimeLocalValue(pickedDate)
      });
      setOpen(true);
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const close = () => setOpen(false);

  const dateHint = useMemo(() => {
    const date = new Date(state.scheduledAt);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR");
  }, [state.scheduledAt]);

  if (!open) return null;

  return (
    <div className="calendar-create-overlay" role="dialog" aria-modal="true" aria-label="Editar agendamento">
      <div className="calendar-create-card">
        <button type="button" className="calendar-create-close" onClick={close} aria-label="Fechar">×</button>
        <h3>{isEditing ? "Editar evento" : "Adicionar titulo"}</h3>
        <form
          action={isEditing ? updateCalendarEventAction : createCalendarEventAction}
          className="calendar-create-form"
          onSubmit={close}
        >
          <input type="hidden" name="sourceType" value={state.sourceType} />
          <input type="hidden" name="lessonId" value={state.lessonId} />
          <input type="hidden" name="calendarEventId" value={state.calendarEventId} />

          <div className="field">
            <label htmlFor="event-title">Titulo</label>
            <input
              id="event-title"
              name="title"
              type="text"
              value={state.title}
              onChange={(e) => setState((current) => ({ ...current, title: e.currentTarget.value }))}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="event-type">Tipo</label>
            <select
              id="event-type"
              name="eventType"
              value={state.eventType}
              onChange={(e) => setState((current) => ({ ...current, eventType: e.currentTarget.value }))}
              disabled={state.sourceType === "lesson"}
            >
              <option value="EVENTO">Evento</option>
              <option value="AULA">Aula</option>
              <option value="TORNEIO">Torneio</option>
              <option value="JOGO">Jogo</option>
              <option value="REUNIAO">Reuniao</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="event-date">Data e hora</label>
            <input
              id="event-date"
              name="scheduledAt"
              type="datetime-local"
              value={state.scheduledAt}
              onChange={(e) => setState((current) => ({ ...current, scheduledAt: e.currentTarget.value }))}
              required
            />
            <small className="muted">{dateHint}</small>
          </div>

          <div className="field">
            <label htmlFor="event-duration">Duracao (min)</label>
            <input
              id="event-duration"
              name="durationMinutes"
              type="number"
              min="15"
              step="15"
              value={state.durationMinutes}
              onChange={(e) => setState((current) => ({ ...current, durationMinutes: Number(e.currentTarget.value || 60) }))}
            />
          </div>

          <div className="field">
            <label htmlFor="event-notes">Descricao</label>
            <input
              id="event-notes"
              name="notes"
              type="text"
              value={state.notes}
              onChange={(e) => setState((current) => ({ ...current, notes: e.currentTarget.value }))}
              placeholder="Adicionar descricao"
            />
          </div>

          <div className="calendar-create-actions">
            <button type="button" className="button" onClick={close}>Cancelar</button>
            <SubmitButton
              label={isEditing ? "Salvar alteracoes" : "Salvar"}
              pendingLabel="Salvando..."
              className="button button-primary"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

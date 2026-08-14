import Link from "next/link";
import { CalendarDragScroll } from "@/components/calendar-drag-scroll";
import { CalendarQuickCreate } from "@/components/calendar-quick-create";
import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createCourtAction } from "@/lib/actions/calendar";
import { requireArenaAccess } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type CalendarPageProps = {
  searchParams?: {
    periodo?: string;
    tipo?: string;
    data?: string;
    inicio?: string;
    fim?: string;
  };
};

type CalendarEvent = {
  id: string;
  sourceType: "lesson" | "calendar";
  lessonId: string;
  calendarEventId: string;
  eventType: string;
  type: string;
  date: Date;
  title: string;
  meta: string;
  notes: string;
  durationMinutes: number;
};

const typeLabels: Record<string, string> = {
  all: "Todos",
  lessons: "Eventos"
};

const periodLabels: Record<string, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mes",
  d14: "14 dias",
  d21: "21 dias",
  d30: "30 dias",
  d60: "60 dias",
  custom: "Personalizado",
  all: "Historico"
};

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const timelineHours = Array.from({ length: 17 }, (_, index) => index + 6);

function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function addDays(value: Date, days: number) { const next = new Date(value); next.setDate(next.getDate() + days); return next; }
function addMonths(value: Date, months: number) { return new Date(value.getFullYear(), value.getMonth() + months, value.getDate()); }

function parseDateParam(value: string | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonday(value: Date) {
  const date = startOfDay(value);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

function getDateInputValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getRange(period: string, anchor: Date, customStart: Date | null, customEnd: Date | null) {
  const today = startOfDay(anchor);
  if (period === "all") return { label: "Historico", start: new Date(2000, 0, 1), end: new Date(2100, 0, 1), gridStart: getMonday(today), gridEnd: addDays(getMonday(today), 7) };
  if (period === "custom") {
    const start = customStart ? startOfDay(customStart) : today;
    const end = customEnd ? addDays(startOfDay(customEnd), 1) : addDays(start, 7);
    return { label: "Personalizado", start, end, gridStart: getMonday(start), gridEnd: addDays(getMonday(start), 7) };
  }
  if (period === "day") return { label: "Dia", start: today, end: addDays(today, 1), gridStart: today, gridEnd: addDays(today, 1) };
  if (period === "week") { const s = getMonday(today); return { label: "Semana", start: s, end: addDays(s, 7), gridStart: s, gridEnd: addDays(s, 7) }; }
  if (period === "d14") return { label: "14 dias", start: today, end: addDays(today, 14), gridStart: getMonday(today), gridEnd: addDays(getMonday(today), 14) };
  if (period === "d21") return { label: "21 dias", start: today, end: addDays(today, 21), gridStart: getMonday(today), gridEnd: addDays(getMonday(today), 21) };
  if (period === "d30") return { label: "30 dias", start: today, end: addDays(today, 30), gridStart: getMonday(today), gridEnd: addDays(getMonday(today), 30) };
  if (period === "d60") return { label: "60 dias", start: today, end: addDays(today, 60), gridStart: getMonday(today), gridEnd: addDays(getMonday(today), 60) };
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const gridStart = getMonday(start);
  const lastMonthWeek = getMonday(addDays(end, -1));
  return { label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start), start, end, gridStart, gridEnd: addDays(lastMonthWeek, 7) };
}

function getCalendarDays(start: Date, end: Date) { const days: Date[] = []; let c = start; while (c < end) { days.push(c); c = addDays(c, 1); } return days; }
function dateKey(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function formatDateLong(value: Date) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(value); }
function formatTime(value: Date) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(value); }

function navHref(period: string, type: string, anchor: Date) {
  return `/calendario?periodo=${period}&tipo=${type}&data=${getDateInputValue(anchor)}`;
}

function groupEventsByDay(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((grouped, event) => {
    const key = dateKey(event.date);
    grouped[key] = [...(grouped[key] ?? []), event];
    return grouped;
  }, {});
}

function eventStyle(event: CalendarEvent) {
  const startHour = event.date.getHours() + event.date.getMinutes() / 60;
  const top = Math.max(0, (startHour - 6) * 72);
  const height = Math.max(46, (event.durationMinutes / 60) * 72);
  return { top: `${top}px`, height: `${height}px` };
}

function getEventLayout(dayEvents: CalendarEvent[]) {
  type ActiveEvent = { index: number; endMinute: number; lane: number };
  const layout = new Map<number, { column: number; columns: number }>();
  const sorted = dayEvents
    .map((event, index) => ({
      index,
      startMinute: event.date.getHours() * 60 + event.date.getMinutes(),
      endMinute: event.date.getHours() * 60 + event.date.getMinutes() + event.durationMinutes
    }))
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  let active: ActiveEvent[] = [];
  let freeLanes: number[] = [];
  let currentGroupIndexes: number[] = [];
  let currentGroupMaxLanes = 0;

  function flushGroup() {
    if (!currentGroupIndexes.length) return;
    for (const eventIndex of currentGroupIndexes) {
      const current = layout.get(eventIndex);
      if (!current) continue;
      layout.set(eventIndex, { column: current.column, columns: Math.max(1, currentGroupMaxLanes) });
    }
    currentGroupIndexes = [];
    currentGroupMaxLanes = 0;
  }

  for (const item of sorted) {
    const stillActive: ActiveEvent[] = [];
    for (const current of active) {
      if (current.endMinute <= item.startMinute) freeLanes.push(current.lane);
      else stillActive.push(current);
    }
    active = stillActive;
    freeLanes.sort((a, b) => a - b);
    if (!active.length && currentGroupIndexes.length) flushGroup();
    const lane = freeLanes.length ? freeLanes.shift()! : active.length;
    active.push({ index: item.index, endMinute: item.endMinute, lane });
    currentGroupIndexes.push(item.index);
    currentGroupMaxLanes = Math.max(currentGroupMaxLanes, active.length);
    layout.set(item.index, { column: lane, columns: 1 });
  }

  flushGroup();
  return layout;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const auth = await requireArenaAccess();
  const allowedPeriods = new Set(Object.keys(periodLabels));
  const period = allowedPeriods.has(searchParams?.periodo ?? "") ? searchParams?.periodo ?? "week" : "week";
  const type = searchParams?.tipo ?? "all";
  const anchor = parseDateParam(searchParams?.data) ?? new Date();
  const customStart = parseDateParam(searchParams?.inicio);
  const customEnd = parseDateParam(searchParams?.fim);
  const { label, start, end, gridStart, gridEnd } = getRange(period, anchor, customStart, customEnd);

  const [lessons, calendarEvents, courts] = await Promise.all([
    prisma.lesson.findMany({
      where: { arenaId: auth.arenaId, scheduledAt: { gte: start, lt: end } },
      include: { teacher: true, attendances: { include: { student: true } } },
      orderBy: { scheduledAt: "asc" }
    }),
    prisma.calendarEvent.findMany({
      where: { arenaId: auth.arenaId, scheduledAt: { gte: start, lt: end } },
      orderBy: { scheduledAt: "asc" }
    }),
    prisma.court.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    })
  ]);

  const events: CalendarEvent[] = [
    ...lessons
      .filter((lesson) => lesson.scheduledAt)
      .map((lesson) => ({
        id: lesson.id,
        sourceType: "lesson" as const,
        lessonId: lesson.id,
        calendarEventId: "",
        eventType: "AULA",
        type: "lessons",
        date: lesson.scheduledAt as Date,
        title: lesson.title,
        meta: `${lesson.teacher?.name ?? "Sem professor"} · ${lesson.attendances.length} aluno(s)`,
        notes: lesson.notes ?? "",
        durationMinutes: lesson.durationMinutes
      })),
    ...calendarEvents
      .filter((event) => event.scheduledAt)
      .map((event) => ({
        id: event.id,
        sourceType: "calendar" as const,
        lessonId: "",
        calendarEventId: event.id,
        eventType: event.eventType,
        type: "lessons",
        date: event.scheduledAt,
        title: event.title,
        meta: event.eventType === "EVENTO" ? "Evento da agenda" : event.eventType,
        notes: event.notes ?? "",
        durationMinutes: event.durationMinutes
      }))
  ];

  const filteredEvents = events
    .filter((event) => type === "all" || event.type === type)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const days = getCalendarDays(period === "day" ? start : gridStart, period === "day" ? end : gridEnd);
  const miniCalendarDays = getCalendarDays(getMonday(new Date(anchor.getFullYear(), anchor.getMonth(), 1)), addDays(getMonday(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)), 7));
  const eventsByDay = groupEventsByDay(filteredEvents);
  const todayKey = dateKey(new Date());
  const timeGridDays = period === "month" ? days : getCalendarDays(gridStart, gridEnd);

  return (
    <div className="stack-md">
      <header className="page-header"><div className="stack-xs"><p className="eyebrow">Calendario</p><h1>Agenda da arena</h1><p className="muted">Layout estilo agenda, sem sobreposicao visual de eventos.</p></div></header>

      <div className="calendar-workspace">
        <aside className="calendar-side-panel">
          <section className="calendar-mini-card">
            <div className="calendar-mini-head"><strong>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(anchor)}</strong><div><Link href={navHref(period, type, addMonths(anchor, -1))} aria-label="Mes anterior">‹</Link><Link href={navHref(period, type, addMonths(anchor, 1))} aria-label="Proximo mes">›</Link></div></div>
            <div className="calendar-mini-weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-mini-grid">{miniCalendarDays.map((day) => { const key = dateKey(day); return <Link key={key} href={navHref("day", type, day)} className={`calendar-mini-day${day.getMonth() !== anchor.getMonth() ? " calendar-mini-muted" : ""}${key === todayKey ? " calendar-mini-active" : ""}${eventsByDay[key]?.length ? " calendar-mini-has-events" : ""}`}>{day.getDate()}</Link>; })}</div>
          </section>

          <section className="calendar-mini-card"><h2>Filtros</h2><form className="calendar-filter-stack"><div className="field"><label htmlFor="calendar-period">Periodo</label><select id="calendar-period" name="periodo" defaultValue={period}>{Object.entries(periodLabels).map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}</select></div><div className="field"><label htmlFor="calendar-type">Tipo</label><select id="calendar-type" name="tipo" defaultValue={type}>{Object.entries(typeLabels).map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}</select></div><div className="field"><label htmlFor="calendar-date">Data base</label><input id="calendar-date" name="data" type="date" defaultValue={getDateInputValue(anchor)} /></div><div className="field"><label htmlFor="calendar-start">Inicio</label><input id="calendar-start" name="inicio" type="date" defaultValue={customStart ? getDateInputValue(customStart) : ""} /></div><div className="field"><label htmlFor="calendar-end">Fim</label><input id="calendar-end" name="fim" type="date" defaultValue={customEnd ? getDateInputValue(customEnd) : ""} /></div><button className="button button-primary button-block" type="submit">Aplicar filtros</button><button className="button button-block" type="button" data-calendar-create>Criar</button></form></section>
          <section className="calendar-mini-card"><h2>Quadras</h2><p className="muted">{courts.length ? courts.map((court) => court.name).join(" · ") : "Cadastre a primeira quadra para preparar a agenda por quadra."}</p><SafeActionForm action={createCourtAction} className="calendar-filter-stack" resetOnSuccess successMessage="Quadra cadastrada."><div className="field"><label htmlFor="court-name">Nova quadra</label><input id="court-name" name="name" type="text" placeholder="Ex.: Quadra 1" required /></div><SubmitButton label="Adicionar quadra" pendingLabel="Salvando..." className="button button-primary button-block" /></SafeActionForm></section>
        </aside>

        <SectionCard title={label} description={`${formatDateLong(start)} ate ${formatDateLong(addDays(end, -1))}.`}>
          <CalendarDragScroll className="calendar-agenda-board calendar-drag-scroll">
            <div className="calendar-agenda-days" style={{ gridTemplateColumns: `96px repeat(${timeGridDays.length}, minmax(132px, 1fr))` }}><span />{timeGridDays.map((day) => <div key={dateKey(day)} className={dateKey(day) === todayKey ? "calendar-agenda-day calendar-agenda-day-today" : "calendar-agenda-day"}><span>{weekDays[(day.getDay() + 6) % 7]}</span><strong>{day.getDate()}</strong></div>)}</div>
            <div className="calendar-agenda-grid" style={{ gridTemplateColumns: `96px repeat(${timeGridDays.length}, minmax(132px, 1fr))` }}>
              <div className="calendar-time-column">{timelineHours.map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}</div>
              {timeGridDays.map((day) => {
                const key = dateKey(day);
                const dayEvents = (eventsByDay[key] ?? []).filter((event) => event.date.getHours() >= 6 && event.date.getHours() <= 23);
                const placements = getEventLayout(dayEvents);
                return (
                  <div key={key} className="calendar-time-day" data-day={key}>
                    {timelineHours.map((hour) => <span key={hour} className="calendar-hour-line" />)}
                    {dayEvents.map((event, index) => (
                      <button
                        type="button"
                        key={`${event.type}-${event.id}-${index}`}
                        className={`calendar-time-event calendar-time-event-${event.type}`}
                        data-calendar-event="1"
                        data-source-type={event.sourceType}
                        data-lesson-id={event.lessonId}
                        data-calendar-event-id={event.calendarEventId}
                        data-event-type={event.eventType}
                        data-title={event.title}
                        data-scheduled-at={event.date.toISOString()}
                        data-duration-minutes={event.durationMinutes}
                        data-notes={event.notes}
                        style={{
                          ...eventStyle(event),
                          left: `calc(${((placements.get(index)?.column ?? 0) * 100) / (placements.get(index)?.columns ?? 1)}% + 2px)`,
                          width: `calc(${100 / (placements.get(index)?.columns ?? 1)}% - 6px)`,
                          right: "auto",
                          zIndex: 5 + (placements.get(index)?.column ?? 0)
                        }}
                      >
                        <strong>{event.title}</strong><span>{formatTime(event.date)} · {event.meta}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </CalendarDragScroll>
        </SectionCard>
      </div>
      <CalendarQuickCreate />
    </div>
  );
}

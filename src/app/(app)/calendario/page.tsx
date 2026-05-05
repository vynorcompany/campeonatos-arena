import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
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
  type: string;
  date: Date;
  title: string;
  meta: string;
  href: string;
  durationMinutes: number;
};

const typeLabels: Record<string, string> = {
  all: "Todos",
  lessons: "Aulas",
  tournaments: "Torneios",
  matches: "Jogos",
  tv: "Tela da TV"
};

const periodLabels: Record<string, string> = {
  today: "Hoje",
  tomorrow: "Amanhã",
  day: "Dia",
  week: "Semana",
  month: "Mês",
  quarter: "Trimestre",
  year: "Ano",
  custom: "Personalizado",
  all: "Todo o histórico"
};

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const timelineHours = Array.from({ length: 17 }, (_, index) => index + 6);

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(value: Date, months: number) {
  return new Date(value.getFullYear(), value.getMonth() + months, value.getDate());
}

function parseDateParam(value: string | undefined) {
  if (!value) {
    return null;
  }

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

function getQuarterStart(value: Date) {
  const month = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), month, 1);
}

function getDateInputValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getRange(period: string, anchor: Date, customStart: Date | null, customEnd: Date | null) {
  const today = startOfDay(anchor);

  if (period === "all") {
    return {
      label: "Todo o histórico",
      start: new Date(2000, 0, 1),
      end: new Date(2100, 0, 1),
      gridStart: getMonday(new Date()),
      gridEnd: addDays(getMonday(new Date()), 7)
    };
  }

  if (period === "custom") {
    const start = customStart ? startOfDay(customStart) : today;
    const end = customEnd ? addDays(startOfDay(customEnd), 1) : addDays(start, 7);

    return {
      label: "Período personalizado",
      start,
      end,
      gridStart: getMonday(start),
      gridEnd: addDays(getMonday(start), 7)
    };
  }

  if (period === "tomorrow") {
    const start = addDays(today, 1);
    return { label: "Amanhã", start, end: addDays(start, 1), gridStart: start, gridEnd: addDays(start, 1) };
  }

  if (period === "day" || period === "today") {
    return { label: periodLabels[period], start: today, end: addDays(today, 1), gridStart: today, gridEnd: addDays(today, 1) };
  }

  if (period === "week") {
    const start = getMonday(today);
    return { label: "Semana", start, end: addDays(start, 7), gridStart: start, gridEnd: addDays(start, 7) };
  }

  if (period === "quarter") {
    const start = getQuarterStart(today);
    return { label: "Trimestre", start, end: addMonths(start, 3), gridStart: getMonday(today), gridEnd: addDays(getMonday(today), 7) };
  }

  if (period === "year") {
    const start = new Date(today.getFullYear(), 0, 1);
    return { label: String(today.getFullYear()), start, end: new Date(today.getFullYear() + 1, 0, 1), gridStart: getMonday(today), gridEnd: addDays(getMonday(today), 7) };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const gridStart = getMonday(start);
  const lastMonthWeek = getMonday(addDays(end, -1));

  return {
    label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start),
    start,
    end,
    gridStart,
    gridEnd: addDays(lastMonthWeek, 7)
  };
}

function getCalendarDays(start: Date, end: Date) {
  const days: Date[] = [];
  let current = start;

  while (current < end) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatDateShort(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(value);
}

function formatDateLong(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(value);
}

function parseScheduledTime(value: string | null | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(fallback);

  if (Number.isFinite(hour) && Number.isFinite(minute)) {
    date.setHours(hour, minute, 0, 0);
  }

  return date;
}

function getPreviousAnchor(period: string, anchor: Date) {
  if (period === "week") return addDays(anchor, -7);
  if (period === "month") return addMonths(anchor, -1);
  if (period === "quarter") return addMonths(anchor, -3);
  if (period === "year") return new Date(anchor.getFullYear() - 1, anchor.getMonth(), anchor.getDate());
  return addDays(anchor, -1);
}

function getNextAnchor(period: string, anchor: Date) {
  if (period === "week") return addDays(anchor, 7);
  if (period === "month") return addMonths(anchor, 1);
  if (period === "quarter") return addMonths(anchor, 3);
  if (period === "year") return new Date(anchor.getFullYear() + 1, anchor.getMonth(), anchor.getDate());
  return addDays(anchor, 1);
}

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

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const auth = await requireModuleView("calendar");
  const allowedPeriods = new Set(Object.keys(periodLabels));
  const period = allowedPeriods.has(searchParams?.periodo ?? "") ? searchParams?.periodo ?? "week" : "week";
  const type = searchParams?.tipo ?? "all";
  const anchor = parseDateParam(searchParams?.data) ?? new Date();
  const customStart = parseDateParam(searchParams?.inicio);
  const customEnd = parseDateParam(searchParams?.fim);
  const { label, start, end, gridStart, gridEnd } = getRange(period, anchor, customStart, customEnd);

  const [lessons, tournaments, matches, tvMatches] = await Promise.all([
    prisma.lesson.findMany({
      where: { arenaId: auth.arenaId, scheduledAt: { gte: start, lt: end } },
      include: { teacher: true, attendances: { include: { student: true } } },
      orderBy: { scheduledAt: "asc" }
    }),
    prisma.tournament.findMany({
      where: { arenaId: auth.arenaId, OR: [{ createdAt: { gte: start, lt: end } }, { updatedAt: { gte: start, lt: end } }] },
      include: { _count: { select: { matches: true, entries: true } } },
      orderBy: { updatedAt: "asc" }
    }),
    prisma.match.findMany({
      where: { tournament: { arenaId: auth.arenaId }, updatedAt: { gte: start, lt: end } },
      include: { tournament: true, homePair: true, awayPair: true },
      orderBy: { updatedAt: "asc" }
    }),
    prisma.manualUpcomingMatch.findMany({
      where: { arenaId: auth.arenaId, updatedAt: { gte: start, lt: end } },
      orderBy: [{ displayOrder: "asc" }, { updatedAt: "asc" }]
    })
  ]);

  const events: CalendarEvent[] = [
    ...lessons.map((lesson) => ({
      type: "lessons",
      date: lesson.scheduledAt ?? lesson.createdAt,
      title: lesson.title,
      meta: `${lesson.teacher?.name ?? "Professor não definido"} · ${lesson.attendances.length} aluno(s)`,
      href: "/aulas",
      durationMinutes: lesson.durationMinutes
    })),
    ...tournaments.map((tournament) => ({
      type: "tournaments",
      date: tournament.updatedAt,
      title: tournament.name,
      meta: `${tournament.status} · ${tournament._count.entries} jogador(es) · ${tournament._count.matches} jogo(s)`,
      href: "/torneios",
      durationMinutes: 90
    })),
    ...matches.map((match) => ({
      type: "matches",
      date: parseScheduledTime(match.scheduledTime, match.updatedAt),
      title: match.label,
      meta: `${match.tournament.name} · ${match.homePair?.name ?? "Aguardando"} x ${match.awayPair?.name ?? "Aguardando"}`,
      href: "/jogos",
      durationMinutes: 60
    })),
    ...tvMatches.map((match) => ({
      type: "tv",
      date: parseScheduledTime(match.scheduledTime, match.updatedAt),
      title: `${match.homePairName || "Aguardando"} x ${match.awayPairName || "Aguardando"}`,
      meta: match.courtName || "Quadra não definida",
      href: "/proximos-jogos",
      durationMinutes: 60
    }))
  ]
    .filter((event) => type === "all" || event.type === type)
    .sort((first, second) => first.date.getTime() - second.date.getTime());

  const days = getCalendarDays(period === "day" || period === "today" || period === "tomorrow" ? start : gridStart, period === "day" || period === "today" || period === "tomorrow" ? end : gridEnd);
  const miniCalendarDays = getCalendarDays(getMonday(new Date(anchor.getFullYear(), anchor.getMonth(), 1)), addDays(getMonday(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)), 7));
  const eventsByDay = groupEventsByDay(events);
  const todayKey = dateKey(new Date());
  const activeKey = dateKey(anchor);
  const timeGridDays = period === "month" || period === "quarter" || period === "year" || period === "all" || period === "custom"
    ? getCalendarDays(gridStart, gridEnd)
    : days;

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Calendário</p>
          <h1>Agenda da arena</h1>
          <p className="muted">Acompanhe aulas, torneios, jogos e Tela da TV por qualquer período.</p>
        </div>
      </header>

      <div className="calendar-workspace">
        <aside className="calendar-side-panel">
          <section className="calendar-mini-card">
            <div className="calendar-mini-head">
              <strong>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(anchor)}</strong>
              <div>
                <Link href={navHref(period, type, addMonths(anchor, -1))} aria-label="Mês anterior">‹</Link>
                <Link href={navHref(period, type, addMonths(anchor, 1))} aria-label="Próximo mês">›</Link>
              </div>
            </div>
            <div className="calendar-mini-weekdays">
              {weekDays.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="calendar-mini-grid">
              {miniCalendarDays.map((day) => {
                const key = dateKey(day);
                return (
                  <Link
                    key={key}
                    href={navHref("day", type, day)}
                    className={`calendar-mini-day${day.getMonth() !== anchor.getMonth() ? " calendar-mini-muted" : ""}${key === activeKey ? " calendar-mini-active" : ""}${eventsByDay[key]?.length ? " calendar-mini-has-events" : ""}`}
                  >
                    {day.getDate()}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="calendar-mini-card">
            <h2>Filtros</h2>
            <form className="calendar-filter-stack">
              <div className="field">
                <label htmlFor="calendar-period">Período</label>
                <select id="calendar-period" name="periodo" defaultValue={period}>
                  {Object.entries(periodLabels).map(([value, optionLabel]) => (
                    <option key={value} value={value}>{optionLabel}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="calendar-type">Tipo</label>
                <select id="calendar-type" name="tipo" defaultValue={type}>
                  {Object.entries(typeLabels).map(([value, optionLabel]) => (
                    <option key={value} value={value}>{optionLabel}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="calendar-date">Data base</label>
                <input id="calendar-date" name="data" type="date" defaultValue={getDateInputValue(anchor)} />
              </div>
              <div className="field">
                <label htmlFor="calendar-start">Início</label>
                <input id="calendar-start" name="inicio" type="date" defaultValue={customStart ? getDateInputValue(customStart) : ""} />
              </div>
              <div className="field">
                <label htmlFor="calendar-end">Fim</label>
                <input id="calendar-end" name="fim" type="date" defaultValue={customEnd ? getDateInputValue(customEnd) : ""} />
              </div>
              <button className="button button-primary button-block" type="submit">Aplicar filtros</button>
            </form>
          </section>

          <section className="calendar-mini-card">
            <h2>Categorias</h2>
            <div className="calendar-category-list">
              {Object.entries(typeLabels).filter(([value]) => value !== "all").map(([value, optionLabel]) => (
                <Link key={value} href={`/calendario?periodo=${period}&tipo=${value}&data=${getDateInputValue(anchor)}`}>
                  <span className={`calendar-category-dot calendar-category-dot-${value}`} />
                  {optionLabel}
                </Link>
              ))}
            </div>
          </section>
        </aside>

        <SectionCard title={label} description={`${formatDateLong(start)} até ${formatDateLong(addDays(end, -1))}.`}>
          <div className="calendar-main-toolbar">
            <div className="calendar-nav-buttons">
              <Link href={navHref(period, type, getPreviousAnchor(period, anchor))} aria-label="Período anterior">‹</Link>
              <Link href={navHref(period, type, getNextAnchor(period, anchor))} aria-label="Próximo período">›</Link>
            </div>
            <div className="calendar-range-title">
              <strong>{label}</strong>
              <span>{events.length} evento(s)</span>
            </div>
            <Link href="/aulas/registrar" className="button button-primary">Criar</Link>
          </div>

          {period === "month" ? (
            <div className="calendar-month-board">
              <div className="calendar-week-header">
                {weekDays.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid">
                {days.map((day) => {
                  const key = dateKey(day);
                  const dayEvents = eventsByDay[key] ?? [];
                  return (
                    <article key={key} className={`calendar-day${day < start || day >= end ? " calendar-day-muted" : ""}${key === todayKey ? " calendar-day-today" : ""}`}>
                      <div className="calendar-day-head">
                        <strong>{day.getDate()}</strong>
                        <span>{dayEvents.length ? `${dayEvents.length} evento(s)` : "Livre"}</span>
                      </div>
                      <div className="calendar-day-events">
                        {dayEvents.slice(0, 4).map((event, index) => (
                          <Link key={`${event.type}-${event.title}-${index}`} href={event.href} className={`calendar-pill calendar-pill-${event.type}`}>
                            <span>{formatTime(event.date)}</span>
                            <strong>{event.title}</strong>
                          </Link>
                        ))}
                        {dayEvents.length > 4 ? <span className="calendar-more">+{dayEvents.length - 4} evento(s)</span> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="calendar-agenda-board">
              <div className="calendar-agenda-days" style={{ gridTemplateColumns: `96px repeat(${timeGridDays.length}, minmax(132px, 1fr))` }}>
                <span />
                {timeGridDays.map((day) => (
                  <div key={dateKey(day)} className={dateKey(day) === todayKey ? "calendar-agenda-day calendar-agenda-day-today" : "calendar-agenda-day"}>
                    <span>{weekDays[(day.getDay() + 6) % 7]}</span>
                    <strong>{day.getDate()}</strong>
                  </div>
                ))}
              </div>
              <div className="calendar-agenda-grid" style={{ gridTemplateColumns: `96px repeat(${timeGridDays.length}, minmax(132px, 1fr))` }}>
                <div className="calendar-time-column">
                  {timelineHours.map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}
                </div>
                {timeGridDays.map((day) => {
                  const key = dateKey(day);
                  const dayEvents = (eventsByDay[key] ?? []).filter((event) => event.date.getHours() >= 6 && event.date.getHours() <= 23);
                  return (
                    <div key={key} className="calendar-time-day">
                      {timelineHours.map((hour) => <span key={hour} className="calendar-hour-line" />)}
                      {dayEvents.map((event, index) => (
                        <Link
                          key={`${event.type}-${event.title}-${index}`}
                          href={event.href}
                          className={`calendar-time-event calendar-time-event-${event.type}`}
                          style={eventStyle(event)}
                        >
                          <strong>{event.title}</strong>
                          <span>{formatTime(event.date)} · {event.meta}</span>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

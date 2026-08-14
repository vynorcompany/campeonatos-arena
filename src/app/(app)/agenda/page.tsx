import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type AgendaPageProps = { searchParams?: { data?: string } };

function parseDate(value?: string) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, (month ?? 1) - 1, day ?? 1);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function addDays(value: Date, amount: number) { const next = new Date(value); next.setDate(next.getDate() + amount); return next; }
function dateInputValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function minuteOfDay(value: Date) { return value.getHours() * 60 + value.getMinutes(); }

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const auth = await requireModuleView("calendar");
  const selectedDate = startOfDay(parseDate(searchParams?.data));
  const nextDay = addDays(selectedDate, 1);
  const [arena, courts, scheduleOccurrences] = await Promise.all([
    prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { scheduleStartMinute: true, scheduleEndMinute: true, scheduleSlotMinutes: true } }),
    prisma.court.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" } }),
    prisma.scheduleOccurrence.findMany({
      where: { arenaId: auth.arenaId, status: { not: "CANCELED" }, startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } },
      include: { occurrenceCourts: true },
      orderBy: { startsAt: "asc" }
    })
  ]);
  const slots = Array.from(
    { length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / arena.scheduleSlotMinutes)) },
    (_, index) => arena.scheduleStartMinute + index * arena.scheduleSlotMinutes
  );
  const today = startOfDay(new Date());
  const title = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(selectedDate);
  const dayHref = (date: Date) => `/agenda?data=${dateInputValue(date)}`;

  return (
    <div className="stack-md">
      <header className="page-header agenda-header">
        <div className="stack-xs"><p className="eyebrow">Operação</p><h1>Agenda de quadras</h1><p className="muted">Agenda diária por quadra, com horários definidos pela sua arena.</p></div>
        <Link className="button" href="/agenda/configuracao">Configurar grade</Link>
      </header>
      <SectionCard title={title} description="Cada coluna representa uma quadra. Eventos, aulas e reservas ocuparão o mesmo horário da quadra.">
        <div className="agenda-day-controls">
          <Link className="button" href={dayHref(addDays(selectedDate, -1))}>← Dia anterior</Link><Link className="button" href={dayHref(today)}>Hoje</Link><Link className="button" href={dayHref(addDays(selectedDate, 1))}>Próximo dia →</Link>
          <form><label className="sr-only" htmlFor="agenda-date">Data da agenda</label><input id="agenda-date" name="data" type="date" defaultValue={dateInputValue(selectedDate)} /><button className="button" type="submit">Ir</button></form>
        </div>
        {courts.length ? <div className="daily-court-grid-scroll"><table className="daily-court-grid"><thead><tr><th scope="col">Horário</th>{courts.map((court) => <th scope="col" key={court.id}>{court.name}</th>)}</tr></thead><tbody>{slots.map((slot) => <tr key={slot}><th scope="row">{minuteLabel(slot)}</th>{courts.map((court) => {
          const occurrence = scheduleOccurrences.find((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && minuteOfDay(item.startsAt) === slot);
          const isOccupied = scheduleOccurrences.some((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && minuteOfDay(item.startsAt) < slot && minuteOfDay(item.endsAt) > slot);
          if (isOccupied) return null;
          if (!occurrence) return <td key={court.id}><span className="daily-court-empty">Livre</span></td>;
          const rows = Math.max(1, Math.ceil((minuteOfDay(occurrence.endsAt) - minuteOfDay(occurrence.startsAt)) / arena.scheduleSlotMinutes));
          return <td className="daily-court-event" key={court.id} rowSpan={rows}><strong>{occurrence.title}</strong><span>{occurrence.sourceType}</span></td>;
        })}</tr>)}</tbody></table></div> : <div className="agenda-empty"><h3>Cadastre suas quadras para abrir a agenda</h3><p className="muted">A grade diária começa pelas quadras e pelos intervalos de operação.</p><Link className="button button-primary" href="/agenda/configuracao">Configurar agenda</Link></div>}
      </SectionCard>
    </div>
  );
}
